// Audio for calls that go through the UsSpace server (when two phones can't connect directly).
// Runs on the audio thread.
//   usspace-capture: microphone → 16 kHz, 16-bit samples, sent in 40 ms pieces.
//   usspace-player:  16 kHz pieces from your partner → speaker, with a small buffer to smooth the network.

const RATE = 16000;
const CHUNK = 640; // 40 ms at 16 kHz

class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / RATE; // microphone samples per 16 kHz sample
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
    this.out = new Int16Array(CHUNK);
    this.n = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      // Average the samples that fall into each 16 kHz step (a simple low-pass + downsample).
      this.sum += input[i];
      this.count++;
      this.phase += 1;
      if (this.phase >= this.step) {
        this.phase -= this.step;
        const v = Math.max(-1, Math.min(1, this.sum / this.count));
        this.sum = 0;
        this.count = 0;
        this.out[this.n++] = v * 32767;
        if (this.n === CHUNK) {
          this.port.postMessage(this.out, [this.out.buffer]);
          this.out = new Int16Array(CHUNK);
          this.n = 0;
        }
      }
    }
    return true;
  }
}

class Player extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(1 << 15);
    this.mask = this.buf.length - 1;
    this.w = 0; // samples written
    this.r = 0; // read position (fractional, for resampling)
    this.step = RATE / sampleRate;
    this.playing = false;
    this.port.onmessage = (e) => {
      const pcm = e.data;
      for (let i = 0; i < pcm.length; i++) this.buf[(this.w + i) & this.mask] = pcm[i];
      this.w += pcm.length;
      // Keep the delay short: if we fell far behind, skip ahead (keep ~150 ms).
      if (this.w - this.r > RATE * 0.5) this.r = this.w - RATE * 0.15;
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    const ch = out[0];
    for (let i = 0; i < ch.length; i++) {
      if (!this.playing) {
        // Wait for 100 ms of sound before starting, so small network hiccups don't cut words.
        if (this.w - this.r >= RATE * 0.1) this.playing = true;
        else {
          ch[i] = 0;
          continue;
        }
      }
      if (this.w - this.r < 2) {
        this.playing = false;
        ch[i] = 0;
        continue;
      }
      const i0 = Math.floor(this.r);
      const f = this.r - i0;
      ch[i] = this.buf[i0 & this.mask] * (1 - f) + this.buf[(i0 + 1) & this.mask] * f;
      this.r += this.step;
    }
    for (let c = 1; c < out.length; c++) out[c].set(ch);
    return true;
  }
}

registerProcessor("usspace-capture", Capture);
registerProcessor("usspace-player", Player);
