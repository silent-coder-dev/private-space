import { motion } from "framer-motion";
import { ArrowDown, Brush, Download, Eraser, Hand, Highlighter, ImageUp, Loader2, Palette, Smile, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSpace } from "@/context/space";
import { compressPhoto, loadImage } from "@/lib/media";
import { SPRING } from "@/lib/motion";
import { uid } from "@/lib/storage";
import type { Sticker, Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEngine, useSyncedList } from "@/sync/hooks";

/**
 * The board is measured in "units": it is always 1000 units wide, and its height grows as you fill it.
 * There is always some empty space below the drawing, so you never run out of room.
 */
const WIDTH = 1000;
const MIN_HEIGHT = 750;
const ROOM_BELOW = 350;
const GROW_STEP = 250;
const MAX_HEIGHT = 5000;
/** Canvas pixels per unit (fewer for a very tall board, to stay light on phones). */
const pixelsPerUnit = (height: number) => Math.min(1.2, Math.sqrt(6000 / height));

const COLORS = ["#FF4D6D", "#FF85C2", "#9650DC", "#4D9FFF", "#30D98A", "#FFCB52", "#FF8A3D", "#FFFFFF", "#111222"];
const SIZES = [0.004, 0.008, 0.016, 0.03];
const STICKERS = ["❤️", "💖", "😘", "🥰", "😂", "🌹", "⭐", "🌙", "☀️", "🐱", "🐶", "🧸", "🎈", "🍕", "👑", "💍"];
type Tool = Stroke["tool"] | "sticker" | "hand";

const imageCache = new Map<string, HTMLImageElement>();

/** Drawings made before the board could grow used a fixed 4:3 board: convert them to units. */
const toUnitsStroke = (s: Stroke): Stroke => (s.v === 2 ? s : { ...s, v: 2, pts: s.pts.map((n, i) => (i % 2 ? n * 0.75 : n)) });
const toUnitsSticker = (s: Sticker): Sticker =>
  s.v === 2 ? s : { ...s, v: 2, x: s.x * WIDTH, y: s.y * MIN_HEIGHT, w: s.w * WIDTH, h: s.h * MIN_HEIGHT };

function drawStroke(ctx: CanvasRenderingContext2D, s: Pick<Stroke, "tool" | "color" | "size" | "pts">, px: number) {
  if (s.pts.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.lineWidth = Math.max(1, s.size * WIDTH * px);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "neon") {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = ctx.lineWidth * 2.5;
  }
  ctx.beginPath();
  ctx.moveTo(s.pts[0] * px, s.pts[1] * px);
  for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] * px, s.pts[i + 1] * px);
  if (s.pts.length === 2) ctx.lineTo(s.pts[0] * px + 0.1, s.pts[1] * px);
  ctx.stroke();
  if (s.tool === "neon") {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = Math.max(1, ctx.lineWidth / 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** A shared drawing board that grows as you draw: both of you draw, add stickers and photos together. */
const Canvas = () => {
  const { profile } = useSpace();
  const engine = useEngine();
  const [rawStrokes, ink] = useSyncedList<Stroke>("strokes");
  const [rawStickers, stickerList] = useSyncedList<Sticker>("stickers");
  const strokes = useMemo(() => rawStrokes.map(toUnitsStroke), [rawStrokes]);
  const stickers = useMemo(() => rawStickers.map(toUnitsSticker), [rawStickers]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [sticker, setSticker] = useState(STICKERS[0]);
  const [busy, setBusy] = useState(false);
  const [imagesReady, setImagesReady] = useState(0);
  const [extra, setExtra] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<number[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // How tall the board is: everything drawn so far + empty room below (same on both phones).
  const bottom = useMemo(() => {
    let max = 0;
    for (const s of strokes) for (let i = 1; i < s.pts.length; i += 2) max = Math.max(max, s.pts[i]);
    for (const s of stickers) max = Math.max(max, s.y + s.h / 2);
    return max;
  }, [strokes, stickers]);
  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil((bottom + ROOM_BELOW) / GROW_STEP) * GROW_STEP + extra));
  const px = pixelsPerUnit(height);
  const pw = Math.round(WIDTH * px);
  const ph = Math.round(height * px);

  // Background layer: paper + photos + stickers.
  useEffect(() => {
    const ctx = bgRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFF8F0";
    ctx.fillRect(0, 0, pw, ph);
    // A faint line every screen-height, so it's easy to see where you are on a long board.
    ctx.fillStyle = "rgba(150, 80, 220, 0.06)";
    for (let y = MIN_HEIGHT; y < height; y += MIN_HEIGHT) ctx.fillRect(0, y * px, pw, Math.max(1, 2 * px));
    for (const s of stickers) {
      const cx = s.x * px;
      const cy = s.y * px;
      if (s.kind === "emoji") {
        ctx.font = `${s.h * px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.value, cx, cy);
      } else {
        const img = imageCache.get(s.value);
        if (img) ctx.drawImage(img, cx - (s.w * px) / 2, cy - (s.h * px) / 2, s.w * px, s.h * px);
        else
          void loadImage(s.value).then((loaded) => {
            imageCache.set(s.value, loaded);
            setImagesReady((n) => n + 1);
          });
      }
    }
  }, [stickers, imagesReady, pw, ph, px, height]);

  // Ink layer: every stroke, in order (the eraser only rubs out ink, not photos).
  useEffect(() => {
    const ctx = inkRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, pw, ph);
    for (const s of strokes) drawStroke(ctx, s, px);
  }, [strokes, pw, ph, px]);

  /** Pointer position in units. */
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    return [Math.round(Math.min(WIDTH, Math.max(0, x))), Math.round(Math.min(MAX_HEIGHT, Math.max(0, y)))];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "hand" || !e.isPrimary) return;
    const [x, y] = point(e);
    if (tool === "sticker") {
      stickerList.upsert({ id: uid(), by: "me", at: engine.now(), kind: "emoji", value: sticker, x, y, w: 90, h: 90, v: 2 });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = [x, y];
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = current.current;
    if (!pts || !e.isPrimary) return;
    const [x, y] = point(e);
    const lx = pts[pts.length - 2];
    const ly = pts[pts.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) < 3) return;
    pts.push(x, y);
    const ctx = liveRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, pw, ph);
    drawStroke(ctx, { tool: tool === "eraser" ? "pen" : (tool as Stroke["tool"]), color: tool === "eraser" ? "rgba(0,0,0,0.25)" : color, size, pts }, px);
  };

  const onUp = () => {
    const pts = current.current;
    current.current = null;
    liveRef.current?.getContext("2d")?.clearRect(0, 0, pw, ph);
    if (!pts || tool === "sticker" || tool === "hand") return;
    ink.upsert({ id: uid(), by: "me", at: engine.now(), tool: tool as Stroke["tool"], color, size: tool === "eraser" ? size * 2.5 : size, pts, v: 2 });
    if (pts.some((n, i) => i % 2 === 1 && n >= MAX_HEIGHT - 5)) toast("The canvas is full", { description: "Save it as a picture, then clear it to start a new page." });
  };

  /** The middle of what you can see right now, in units (where new photos appear). */
  const visibleMiddle = () => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return height / 2;
    const middle = Math.min(window.innerHeight, rect.bottom) / 2 + Math.max(0, rect.top) / 2;
    return ((middle - rect.top) / rect.height) * height;
  };

  const undo = () => {
    const mine = [...strokes.filter((s) => s.by === "me"), ...stickers.filter((s) => s.by === "me")].sort((a, b) => b.at - a.at)[0];
    if (!mine) return toast("Nothing of yours to undo");
    if ("pts" in mine) ink.remove(mine.id);
    else stickerList.remove(mine.id);
  };

  const clearAll = () => {
    ink.removeAll();
    stickerList.removeAll();
    setExtra(0);
    toast("Canvas cleared for both of you");
  };

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const src = await compressPhoto(file, 900, 0.82);
      const img = await loadImage(src);
      imageCache.set(src, img);
      const aspect = img.naturalWidth / img.naturalHeight;
      let w = 600;
      let h = w / aspect;
      if (h > 600) {
        h = 600;
        w = h * aspect;
      }
      const y = Math.min(MAX_HEIGHT - h / 2, Math.max(h / 2 + 10, visibleMiddle()));
      stickerList.upsert({ id: uid(), by: "me", at: engine.now(), kind: "image", value: src, x: WIDTH / 2, y, w, h, v: 2 });
      toast.success("Photo added — draw on it together 🎨");
    } catch {
      toast.error("Couldn't add that photo");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const out = document.createElement("canvas");
    out.width = pw;
    out.height = ph;
    const ctx = out.getContext("2d");
    if (!ctx || !bgRef.current || !inkRef.current) return;
    ctx.drawImage(bgRef.current, 0, 0);
    ctx.drawImage(inkRef.current, 0, 0);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = "usspace-drawing.png";
    a.click();
  };

  const tools = useMemo(
    () => [
      { id: "pen" as Tool, icon: Brush, label: "Pen" },
      { id: "neon" as Tool, icon: Highlighter, label: "Neon" },
      { id: "eraser" as Tool, icon: Eraser, label: "Eraser" },
      { id: "sticker" as Tool, icon: Smile, label: "Stickers" },
      { id: "hand" as Tool, icon: Hand, label: "Scroll (move the page)" },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Palette}
        title="Our Canvas"
        subtitle={`Draw, doodle and add photos with ${profile.partner} — live. It grows as you draw.`}
        actions={
          <>
            <Button variant="glass" size="icon" onClick={undo} aria-label="Undo my last stroke">
              <Undo2 />
            </Button>
            <Button variant="glass" size="icon" onClick={download} aria-label="Save as picture">
              <Download />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Clear canvas" className="text-muted-foreground hover:text-destructive">
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the canvas for both of you?</AlertDialogTitle>
                  <AlertDialogDescription>Every drawing, sticker and photo on it is deleted on both phones.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll} className="bg-destructive hover:bg-destructive/90">
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      {/* The toolbar stays at the top while you scroll down a long board. */}
      <div className="glass-card sticky top-2 z-20 flex flex-wrap items-center gap-3 bg-card/85 p-3">
        <div className="glass flex gap-1 rounded-2xl p-1">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              aria-pressed={tool === t.id}
              aria-label={t.label}
              title={t.label}
              className={cn("relative grid h-10 w-10 place-items-center rounded-xl", tool === t.id ? "text-white" : "text-muted-foreground hover:text-foreground")}
            >
              {tool === t.id && <motion.span layoutId="canvas-tool" transition={SPRING} className="absolute inset-0 rounded-xl gradient-primary" />}
              <t.icon className="relative h-5 w-5" />
            </button>
          ))}
        </div>

        {tool === "sticker" ? (
          <div className="flex flex-wrap gap-1">
            {STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSticker(s)}
                aria-label={`Sticker ${s}`}
                className={cn("grid h-9 w-9 place-items-center rounded-lg text-xl transition-transform hover:scale-125", sticker === s && "bg-primary/25 ring-1 ring-primary")}
              >
                {s}
              </button>
            ))}
          </div>
        ) : tool === "hand" ? (
          <p className="text-xs text-muted-foreground">Swipe the board to move around. Pick a pen to draw again.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110", color === c ? "ring-white" : "ring-transparent")}
                  style={{ background: c }}
                />
              ))}
              <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/30" title="Any colour" style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick any colour" />
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-label={`Brush size ${s}`}
                  className={cn("grid h-9 w-9 place-items-center rounded-lg", size === s ? "bg-white/15" : "hover:bg-white/5")}
                >
                  <span className="rounded-full bg-foreground" style={{ width: 4 + s * 500, height: 4 + s * 500 }} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="ml-auto">
          <Button variant="gradient" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ImageUp />} Photo
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void addPhoto(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, rotateX: 12, y: 20 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformPerspective: 1400 }}
        className="relative mx-auto w-full overflow-hidden rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
      >
        <div ref={boardRef} className="relative w-full transition-[aspect-ratio] duration-500" style={{ aspectRatio: `${WIDTH} / ${height}` }} data-height={height}>
          <canvas ref={bgRef} width={pw} height={ph} className="absolute inset-0 h-full w-full" />
          <canvas ref={inkRef} width={pw} height={ph} className="absolute inset-0 h-full w-full" />
          <canvas
            ref={liveRef}
            width={pw}
            height={ph}
            aria-label="Drawing area"
            className={cn(
              "absolute inset-0 h-full w-full",
              tool === "hand" ? "cursor-grab touch-pan-y" : "touch-none",
              tool === "sticker" ? "cursor-copy" : tool !== "hand" && "cursor-crosshair",
            )}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
      </motion.div>
      <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        {height < MAX_HEIGHT && (
          <Button variant="ghost" size="sm" onClick={() => setExtra((e) => e + GROW_STEP * 2)} className="text-muted-foreground">
            <ArrowDown /> More space
          </Button>
        )}
        <p>
          The board grows by itself when you draw near the bottom. Every stroke appears on {profile.partner}'s screen the moment you lift your finger. Undo only removes your
          own strokes.
        </p>
      </div>
    </div>
  );
};

export default Canvas;
