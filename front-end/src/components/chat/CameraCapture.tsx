import { Camera, CircleStop, Loader2, RefreshCw, Send, SwitchCamera, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { blobToDataUrl, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, recorderType, toJpeg } from "@/lib/media";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";


type Shot = { image: string } | { video: string };

/** Take a live photo or record a short video with the phone / laptop camera. */
export function CameraCapture({ open, onOpenChange, onSend }: { open: boolean; onOpenChange: (open: boolean) => void; onSend: (shot: Shot) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  };

  const startStream = useCallback(async (mode: "user" | "environment") => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 } }, audio: true }).catch(() =>
        navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } }),
      );
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setReady(true);
    } catch {
      toast.error("Please allow camera access to take photos and videos.");
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open && !shot) void startStream(facing);
    if (!open) {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopStream();
      setShot(null);
      setRecording(0);
    }
    return () => stopStream();
  }, [open, facing, shot, startStream]);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    setShot({ image: toJpeg(v, v.videoWidth, v.videoHeight, 1280, 0.82) });
    stopStream();
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return toast.error("Video recording isn't supported in this browser.");
    const chunks: Blob[] = [];
    let bytes = 0;
    // ~450 kbit/s: a full 2-minute video stays small enough to send quickly (about 7 MB).
    const recorder = new MediaRecorder(stream, { mimeType: recorderType(), videoBitsPerSecond: 400_000, audioBitsPerSecond: 48_000 });
    recorder.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.push(e.data);
      bytes += e.data.size;
      // Stop a little before the size limit, so a clip is never too big to send.
      if (bytes > MAX_VIDEO_BYTES * 0.95 && recorder.state === "recording") recorder.stop();
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      stopStream();
      setRecording(0);
      if (blob.size > MAX_VIDEO_BYTES) return toast.error("That clip is too big. Try a shorter one.");
      setShot({ video: await blobToDataUrl(blob) });
    };
    recorder.start(250);
    recorderRef.current = recorder;
    const started = Date.now();
    setRecording(1);
    const tick = setInterval(() => {
      const secs = Math.floor((Date.now() - started) / 1000);
      if (recorder.state !== "recording") return clearInterval(tick);
      setRecording(Math.max(1, secs));
      if (secs >= MAX_VIDEO_SECONDS) {
        clearInterval(tick);
        recorder.stop();
      }
    }, 250);
  };

  const send = () => {
    if (!shot) return;
    onSend(shot);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-white/10 bg-black p-0 [&>button]:hidden" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Camera</DialogTitle>
        <div className="relative aspect-[3/4] w-full bg-black sm:aspect-video">
          {shot ? (
            "image" in shot ? (
              <img src={shot.image} alt="Your photo" className="h-full w-full object-contain" />
            ) : (
              <video src={shot.video} controls autoPlay playsInline className="h-full w-full object-contain" />
            )
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className={cn("h-full w-full object-cover", facing === "user" && "-scale-x-100")} />
          )}
          {!ready && !shot && (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          {recording > 0 && (
            <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {formatDuration(recording)} / {formatDuration(MAX_VIDEO_SECONDS)}
            </span>
          )}
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close camera" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 bg-black p-4">
          {shot ? (
            <>
              <Button variant="glass" onClick={() => setShot(null)}>
                <RefreshCw /> Retake
              </Button>
              <Button variant="gradient" onClick={send}>
                <Send /> Send
              </Button>
            </>
          ) : recording ? (
            <Button onClick={() => recorderRef.current?.stop()} className="bg-destructive hover:bg-destructive/90">
              <CircleStop /> Stop
            </Button>
          ) : (
            <>
              <Button variant="glass" size="icon" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Switch camera" disabled={!ready}>
                <SwitchCamera />
              </Button>
              <Button variant="gradient" onClick={takePhoto} disabled={!ready}>
                <Camera /> Photo
              </Button>
              <Button variant="glass" onClick={startRecording} disabled={!ready}>
                <Video /> Video
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
