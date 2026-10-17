/** Photo / video helpers: shrinking photos, reading videos, choosing a recording format. */

/** Videos can be up to 2 minutes long. */
export const MAX_VIDEO_SECONDS = 120;
/** Biggest video file (it is encrypted and sent as one message, so it must stay under the server's 16 MB). */
export const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(blob);
  });

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = src;
  });

/** Draw a picture (or a video frame) to a JPEG no bigger than `max` pixels. */
export function toJpeg(source: CanvasImageSource, width: number, height: number, max = 1280, quality = 0.8): string {
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressPhoto(file: File | Blob, max = 1280, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return toJpeg(img, img.naturalWidth, img.naturalHeight, max, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readVideo(file: File | Blob): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES)
    throw new Error("That video is too big (max 8 MB). Record up to 2 minutes with the camera button, or pick a shorter clip.");
  return blobToDataUrl(file);
}

/** The best video format this browser can record. */
export function recorderType(): string | undefined {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}
