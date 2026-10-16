import { motion } from "framer-motion";
import { Brush, Download, Eraser, Highlighter, ImageUp, Loader2, Palette, Smile, Trash2, Undo2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSpace } from "@/context/space";
import { cartoonify, compressPhoto, loadImage } from "@/lib/media";
import { SPRING } from "@/lib/motion";
import { uid } from "@/lib/storage";
import type { Sticker, Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEngine, useSyncedList } from "@/sync/hooks";

const W = 1200;
const H = 900;
const COLORS = ["#FF4D6D", "#FF85C2", "#9650DC", "#4D9FFF", "#30D98A", "#FFCB52", "#FF8A3D", "#FFFFFF", "#111222"];
const SIZES = [0.004, 0.008, 0.016, 0.03];
const STICKERS = ["❤️", "💖", "😘", "🥰", "😂", "🌹", "⭐", "🌙", "☀️", "🐱", "🐶", "🧸", "🎈", "🍕", "👑", "💍"];
type Tool = Stroke["tool"] | "sticker";

const imageCache = new Map<string, HTMLImageElement>();

function drawStroke(ctx: CanvasRenderingContext2D, s: Pick<Stroke, "tool" | "color" | "size" | "pts">) {
  if (s.pts.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.lineWidth = Math.max(1, s.size * W);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "neon") {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = ctx.lineWidth * 2.5;
  }
  ctx.beginPath();
  ctx.moveTo((s.pts[0] / 1000) * W, (s.pts[1] / 1000) * H);
  for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo((s.pts[i] / 1000) * W, (s.pts[i + 1] / 1000) * H);
  if (s.pts.length === 2) ctx.lineTo((s.pts[0] / 1000) * W + 0.1, (s.pts[1] / 1000) * H);
  ctx.stroke();
  if (s.tool === "neon") {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = Math.max(1, ctx.lineWidth / 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** A shared drawing board: both of you draw, add stickers and cartoon photos together. */
const Canvas = () => {
  const { profile } = useSpace();
  const engine = useEngine();
  const [strokes, ink] = useSyncedList<Stroke>("strokes");
  const [stickers, stickerList] = useSyncedList<Sticker>("stickers");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [sticker, setSticker] = useState(STICKERS[0]);
  const [cartoon, setCartoon] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imagesReady, setImagesReady] = useState(0);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<number[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Background layer: paper + photos + stickers.
  useEffect(() => {
    const ctx = bgRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFF8F0";
    ctx.fillRect(0, 0, W, H);
    let missing = 0;
    for (const s of stickers) {
      const cx = s.x * W;
      const cy = s.y * H;
      if (s.kind === "emoji") {
        ctx.font = `${s.h * H}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.value, cx, cy);
      } else {
        const img = imageCache.get(s.value);
        if (img) ctx.drawImage(img, cx - (s.w * W) / 2, cy - (s.h * H) / 2, s.w * W, s.h * H);
        else {
          missing++;
          void loadImage(s.value).then((loaded) => {
            imageCache.set(s.value, loaded);
            setImagesReady((n) => n + 1);
          });
        }
      }
    }
    if (missing === 0) return;
  }, [stickers, imagesReady]);

  // Ink layer: every stroke, in order (the eraser only rubs out ink, not photos).
  useEffect(() => {
    const ctx = inkRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (const s of strokes) drawStroke(ctx, s);
  }, [strokes]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - rect.left) / rect.width) * 1000), Math.round(((e.clientY - rect.top) / rect.height) * 1000)];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = point(e);
    if (tool === "sticker") {
      stickerList.upsert({ id: uid(), by: "me", at: engine.now(), kind: "emoji", value: sticker, x: x / 1000, y: y / 1000, w: 0.09, h: 0.12 });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = [x, y];
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = current.current;
    if (!pts) return;
    const [x, y] = point(e);
    const lx = pts[pts.length - 2];
    const ly = pts[pts.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) < 3) return;
    pts.push(x, y);
    const ctx = liveRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawStroke(ctx, { tool: tool === "eraser" ? "pen" : (tool as Stroke["tool"]), color: tool === "eraser" ? "rgba(0,0,0,0.25)" : color, size, pts });
  };

  const onUp = () => {
    const pts = current.current;
    current.current = null;
    liveRef.current?.getContext("2d")?.clearRect(0, 0, W, H);
    if (!pts || tool === "sticker") return;
    ink.upsert({ id: uid(), by: "me", at: engine.now(), tool: tool as Stroke["tool"], color, size: tool === "eraser" ? size * 2.5 : size, pts });
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
    toast("Canvas cleared for both of you");
  };

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      let src = await compressPhoto(file, 900, 0.82);
      if (cartoon) src = await cartoonify(src);
      const img = await loadImage(src);
      imageCache.set(src, img);
      const aspect = img.naturalWidth / img.naturalHeight;
      const h = 0.55;
      const w = Math.min(0.8, (h * H * aspect) / W);
      stickerList.upsert({ id: uid(), by: "me", at: engine.now(), kind: "image", value: src, x: 0.5, y: 0.5, w, h: (w * W) / aspect / H });
      toast.success(cartoon ? "Cartoon added 🎨" : "Photo added");
    } catch {
      toast.error("Couldn't add that photo");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
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
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Palette}
        title="Our Canvas"
        subtitle={`Draw, doodle and make cartoons with ${profile.partner} — live`}
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

      <div className="glass-card flex flex-wrap items-center gap-3 p-3">
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

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={cartoon} onCheckedChange={setCartoon} aria-label="Cartoon filter for photos" /> Cartoon
          </label>
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
        <div className="relative aspect-[4/3] w-full">
          <canvas ref={bgRef} width={W} height={H} className="absolute inset-0 h-full w-full" />
          <canvas ref={inkRef} width={W} height={H} className="absolute inset-0 h-full w-full" />
          <canvas
            ref={liveRef}
            width={W}
            height={H}
            aria-label="Drawing area"
            className={cn("absolute inset-0 h-full w-full touch-none", tool === "sticker" ? "cursor-copy" : "cursor-crosshair")}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
      </motion.div>
      <p className="text-center text-xs text-muted-foreground">
        Every stroke appears on {profile.partner}'s screen the moment you lift your finger. Undo only removes your own strokes.
      </p>
    </div>
  );
};

export default Canvas;
