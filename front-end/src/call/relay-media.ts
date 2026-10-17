/**
 * The backup path for calls.
 *
 * Usually a call goes straight from phone to phone (WebRTC). On some mobile networks that is impossible,
 * and without a TURN server the call would never connect. Then the call goes through the UsSpace server
 * instead — still end-to-end encrypted with your room key (the server only passes bytes along).
 *
 *   Voice: 16 kHz, μ-law (G.711) — clear speech at ~130 kbit/s.
 *   Video: small JPEG pictures (up to 360 px), about 8 per second, skipped when the network is slow.
 */

const AUDIO = 1;
const VIDEO = 2;
const WORKLET_URL = "/call-audio-worklet.js";
const FRAME_MS = 125;
const MAX_SIDE = 360;
const MAX_FRAME_BYTES = 90_000;

// ---------- μ-law (G.711): 16-bit samples ⇄ 8-bit ----------

const BIAS = 0x84;
const CLIP = 32635;
const EXP = new Uint8Array(256).map((_, i) => (i < 2 ? 0 : Math.floor(Math.log2(i))));

export function encodeMuLaw(samples: Int16Array): Uint8Array {
  const out = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i];
    const sign = s < 0 ? 0x80 : 0;
    if (sign) s = -s;
    if (s > CLIP) s = CLIP;
    s += BIAS;
    const exponent = EXP[(s >> 7) & 0xff];
    const mantissa = (s >> (exponent + 3)) & 0x0f;
    out[i] = ~(sign | (exponent << 4) | mantissa) & 0xff;
  }
  return out;
}

export function decodeMuLaw(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const u = ~bytes[i] & 0xff;
    const exponent = (u >> 4) & 0x07;
    let s = (((u & 0x0f) << 3) + BIAS) << exponent;
    s -= BIAS;
    out[i] = (u & 0x80 ? -s : s) / 32768;
  }
  return out;
}

export interface RelayMediaOptions {
  ctx: AudioContext;
  local: MediaStream;
  video: boolean;
  /** Sends one (already framed) packet; false = dropped. */
  send: (bytes: Uint8Array) => boolean;
  /** Bytes still waiting on the connection. */
  backlog: () => number;
  /** Where your partner's video is drawn. */
  canvas: HTMLCanvasElement;
  /** Pictures from your partner started / stopped arriving (camera off, or a bad network). */
  onRemoteVideo?: (on: boolean) => void;
}

export class RelayMedia {
  private capture: AudioWorkletNode | null = null;
  private player: AudioWorkletNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private camera: HTMLVideoElement | null = null;
  private grab = document.createElement("canvas");
  private grabbing = false;
  private drawing = false;
  private nextFrame: Uint8Array | null = null;
  private lastFrameAt = 0;
  private remoteVideo = false;
  private stopped = false;
  private muted = false;
  private cameraOff = false;
  /** Packets sent / received (shown nowhere, handy for tests). */
  readonly stats = { audioOut: 0, audioIn: 0, videoOut: 0, videoIn: 0 };

  constructor(private o: RelayMediaOptions) {}

  async start() {
    const { ctx, local } = this.o;
    await ctx.audioWorklet.addModule(WORKLET_URL);
    if (this.stopped) return;

    this.player = new AudioWorkletNode(ctx, "usspace-player", { numberOfInputs: 0, outputChannelCount: [1] });
    this.player.connect(ctx.destination);

    if (local.getAudioTracks().length > 0) {
      const source = ctx.createMediaStreamSource(local);
      this.capture = new AudioWorkletNode(ctx, "usspace-capture", { outputChannelCount: [1] });
      // The capture node must be part of a playing graph to run; a silent gain keeps it out of the speaker.
      const silent = ctx.createGain();
      silent.gain.value = 0;
      source.connect(this.capture).connect(silent).connect(ctx.destination);
      this.capture.port.onmessage = (e) => this.sendAudio(e.data as Int16Array);
      this.nodes.push(source, silent);
    }
    void ctx.resume().catch(() => undefined);

    if (this.o.video) {
      this.useCamera(local);
      this.timers.push(setInterval(() => void this.sendFrame(), FRAME_MS));
      this.timers.push(
        setInterval(() => {
          const on = performance.now() - this.lastFrameAt < 1500;
          if (on !== this.remoteVideo) {
            this.remoteVideo = on;
            this.o.onRemoteVideo?.(on);
          }
        }, 500),
      );
    }
  }

  /** A packet from your partner (already decrypted). */
  receive(bytes: Uint8Array) {
    if (this.stopped || bytes.length < 2) return;
    if (bytes[0] === AUDIO) {
      const pcm = decodeMuLaw(bytes.subarray(1));
      this.player?.port.postMessage(pcm, [pcm.buffer]);
      this.stats.audioIn++;
    } else if (bytes[0] === VIDEO) {
      // Only the newest picture matters: older ones waiting to be drawn are skipped.
      this.nextFrame = bytes.slice(1);
      this.stats.videoIn++;
      void this.drawFrames();
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  setCameraOff(off: boolean) {
    this.cameraOff = off;
  }

  /** The camera changed (front ↔ back). */
  useCamera(stream: MediaStream) {
    if (!this.o.video) return;
    if (!this.camera) {
      this.camera = document.createElement("video");
      this.camera.muted = true;
      this.camera.playsInline = true;
    }
    this.camera.srcObject = stream;
    void this.camera.play().catch(() => undefined);
  }

  stop() {
    this.stopped = true;
    this.timers.forEach(clearInterval);
    this.timers = [];
    if (this.capture) this.capture.port.onmessage = null;
    for (const node of [...this.nodes, this.capture, this.player]) node?.disconnect();
    this.nodes = [];
    if (this.camera) this.camera.srcObject = null;
    this.camera = null;
  }

  private sendAudio(samples: Int16Array) {
    if (this.stopped || this.muted) return;
    const packet = new Uint8Array(samples.length + 1);
    packet[0] = AUDIO;
    packet.set(encodeMuLaw(samples), 1);
    if (this.o.send(packet)) this.stats.audioOut++;
  }

  private async sendFrame() {
    const v = this.camera;
    if (this.grabbing || this.stopped || this.cameraOff || !v || v.readyState < 2 || !v.videoWidth) return;
    // The network is behind: skip this picture so the voice stays smooth.
    if (this.o.backlog() > 96 * 1024) return;
    this.grabbing = true;
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
      this.grab.width = Math.round(v.videoWidth * scale);
      this.grab.height = Math.round(v.videoHeight * scale);
      this.grab.getContext("2d")?.drawImage(v, 0, 0, this.grab.width, this.grab.height);
      const blob = await new Promise<Blob | null>((resolve) => this.grab.toBlob(resolve, "image/jpeg", 0.6));
      if (!blob || this.stopped) return;
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      if (jpeg.length + 1 > MAX_FRAME_BYTES) return;
      const packet = new Uint8Array(jpeg.length + 1);
      packet[0] = VIDEO;
      packet.set(jpeg, 1);
      if (this.o.send(packet)) this.stats.videoOut++;
    } finally {
      this.grabbing = false;
    }
  }

  private async drawFrames() {
    if (this.drawing) return;
    this.drawing = true;
    try {
      while (this.nextFrame && !this.stopped) {
        const jpeg = this.nextFrame;
        this.nextFrame = null;
        try {
          const picture = await createImageBitmap(new Blob([jpeg], { type: "image/jpeg" }));
          const c = this.o.canvas;
          if (c.width !== picture.width || c.height !== picture.height) {
            c.width = picture.width;
            c.height = picture.height;
          }
          c.getContext("2d")?.drawImage(picture, 0, 0);
          picture.close();
          this.lastFrameAt = performance.now();
        } catch {
          /* a broken picture: skip it */
        }
      }
    } finally {
      this.drawing = false;
    }
  }
}
