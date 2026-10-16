/** Photo / video helpers: shrinking, reading files, and the cartoon filter. */

export const MAX_VIDEO_BYTES = 2.5 * 1024 * 1024;

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
  if (file.size > MAX_VIDEO_BYTES) throw new Error("That video is too big (max 2.5 MB). Record a shorter clip.");
  return blobToDataUrl(file);
}

/**
 * Cartoon filter: smooth the colours into flat bands, then draw dark outlines on the edges.
 */
export async function cartoonify(src: string, max = 900): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.filter = "saturate(1.5) contrast(1.1)";
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
  const levels = 6;
  const step = 255 / (levels - 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let edge = 0;
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] + gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        const gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] + gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        edge = Math.sqrt(gx * gx + gy * gy);
      }
      const o = i * 4;
      if (edge > 110) {
        px[o] = px[o + 1] = px[o + 2] = 25;
      } else {
        for (let c = 0; c < 3; c++) px[o + c] = Math.round(px[o + c] / step) * step;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** The best video format this browser can record. */
export function recorderType(): string | undefined {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}
