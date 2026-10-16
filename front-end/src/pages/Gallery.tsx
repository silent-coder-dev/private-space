import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Eye, Image as ImageIcon, Loader2, Phone, PhoneOff, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCall } from "@/call/call";
import { useSpace } from "@/context/space";
import { compressPhoto } from "@/lib/media";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { uid } from "@/lib/storage";
import { relativeTime } from "@/lib/time";
import type { GalleryView, Photo } from "@/lib/types";
import { useEngine, useSyncedDoc, useSyncedList } from "@/sync/hooks";

const NO_VIEW: GalleryView | null = null;

/** Shared photos. Add many at once, look at them together, and talk while you do. */
const Gallery = () => {
  const { profile } = useSpace();
  const engine = useEngine();
  const call = useCall();
  const [photos, album] = useSyncedList<Photo>("photos");
  const [view, setView] = useSyncedDoc<GalleryView | null>("gview", "doc", NO_VIEW);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [params, setParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const seenView = useRef(view?.at ?? 0);

  const sorted = [...photos].sort((a, b) => b.at - a.at);
  const index = sorted.findIndex((p) => p.id === openId);
  const open = index >= 0 ? sorted[index] : null;
  const onCall = call.phase !== "idle";

  // When your partner shows you a photo, open it here too.
  useEffect(() => {
    if (!view || view.by !== "partner" || view.at <= seenView.current) return;
    seenView.current = view.at;
    if (photos.some((p) => p.id === view.id)) {
      setOpenId(view.id);
      toast(`👀 ${profile.partner} is showing you this photo`);
    }
  }, [view, photos, profile.partner]);

  useEffect(() => {
    if (params.get("look") !== "1") return;
    if (view && photos.some((p) => p.id === view.id)) setOpenId(view.id);
    setParams({}, { replace: true });
  }, [params, setParams, view, photos]);

  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(list.length);
    for (const file of list) {
      try {
        album.upsert({ id: uid(), src: await compressPhoto(file, 1600, 0.8), at: engine.now(), from: "me" });
      } catch {
        toast.error(`Couldn't add ${file.name}`);
      }
      setUploading((n) => n - 1);
    }
    toast.success(`${list.length} photo${list.length > 1 ? "s" : ""} added 🖼️`);
  };

  const show = (photo: Photo) => {
    setView({ id: photo.id, by: "me", at: engine.now() });
    toast.success(`Showing it to ${profile.partner} 👀`);
  };

  const remove = (photo: Photo) => {
    album.remove(photo.id);
    setOpenId(null);
    toast("Photo deleted for both of you", { action: { label: "Undo", onClick: () => album.upsert(photo) } });
  };

  const step = (dir: number) => sorted.length && setOpenId(sorted[(index + dir + sorted.length) % sorted.length].id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={ImageIcon}
        title="Our Gallery"
        subtitle={`${photos.length} shared photo${photos.length === 1 ? "" : "s"} · only you two can see them`}
        actions={
          <>
            <Button variant={onCall ? "glass" : "ghost"} onClick={() => (onCall ? call.hangup() : call.start("audio", { minimized: true }))} className={onCall ? "text-destructive" : ""}>
              {onCall ? <PhoneOff /> : <Phone />} <span className="hidden sm:inline">{onCall ? "End voice chat" : "Voice chat"}</span>
            </Button>
            <Button variant="gradient" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />} {uploading ? `Adding ${uploading}…` : "Add photos"}
            </Button>
          </>
        }
      />
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files).finally(() => (e.target.value = ""))} />

      {sorted.length === 0 ? (
        <EmptyState
          emoji="🖼️"
          title="Your shared album is empty"
          text="Add as many photos as you like. Your partner sees them instantly — start a voice chat and look at them together."
          action={
            <Button variant="gradient" onClick={() => fileRef.current?.click()}>
              <Upload /> Add the first photos
            </Button>
          }
        />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          <AnimatePresence initial={false}>
            {sorted.map((photo) => (
              <motion.div key={photo.id} layout variants={staggerItem} exit={{ opacity: 0, scale: 0.8 }} className="break-inside-avoid">
                <SpotlightCard tilt className="group cursor-pointer overflow-hidden p-0" onClick={() => setOpenId(photo.id)}>
                  {/* One wrapper, so the hover caption sits ON the photo (SpotlightCard makes direct children relative). */}
                  <div>
                    <img src={photo.src} alt="Shared photo" loading="lazy" className="block w-full transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-[11px] text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                      <span>{photo.from === "me" ? "You" : profile.partner}</span>
                      <span>{relativeTime(photo.at)}</span>
                    </span>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-4xl border-white/10 bg-black/95 p-2 sm:p-3" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open && (
            <div className="space-y-3">
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={open.id}
                    src={open.src}
                    alt="Shared photo"
                    initial={{ opacity: 0, rotateY: 25, scale: 0.95 }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                    exit={{ opacity: 0, rotateY: -25, scale: 0.95 }}
                    transition={{ duration: 0.35 }}
                    style={{ transformPerspective: 1200 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && step(info.offset.x < 0 ? 1 : -1)}
                    className="max-h-[72vh] w-full rounded-xl object-contain"
                  />
                </AnimatePresence>
                {sorted.length > 1 && (
                  <>
                    <Button variant="glass" size="icon" onClick={() => step(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full" aria-label="Previous photo">
                      <ChevronLeft />
                    </Button>
                    <Button variant="glass" size="icon" onClick={() => step(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full" aria-label="Next photo">
                      <ChevronRight />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-white/80">
                <span>
                  {index + 1} / {sorted.length} · by {open.from === "me" ? "you" : profile.partner} · {relativeTime(open.at)}
                </span>
                <div className="flex gap-1">
                  <Button variant="gradient" size="sm" onClick={() => show(open)}>
                    <Eye /> Show {profile.partner}
                  </Button>
                  <Button variant="glass" size="sm" asChild>
                    <a href={open.src} download={`usspace-${open.id}.jpg`}>
                      <Download /> Save
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(open)} className="text-white/70 hover:text-destructive">
                    <Trash2 /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
