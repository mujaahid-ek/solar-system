/**
 * Sound: one looped ambient bed for the whole catalog — a Jovian chorus
 * recording (Univ. of Iowa, CC BY 4.0) — plus two sampled UI blips (hover,
 * select). Off by default; nothing plays before a user gesture (which is
 * also what the Web Audio API requires).
 */

const AMBIENT_URL = '/audio/ambient.mp3';
const UI: Record<string, string> = {
  hover: '/audio/hover.mp3',
  select: '/audio/select.mp3',
};

const XFADE = 1.6;
const BED_LEVEL = 0.5;
const UI_LEVEL: Record<string, number> = { hover: 0.5, select: 0.85 };
/** hovering across the nav strip shouldn't machine-gun the blip */
const HOVER_GAP = 0.07;

interface Playing {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

export class Sound {
  enabled = false;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bedBus: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private missing = new Set<string>();
  private playing: Playing | null = null;
  private lastHover = 0;

  constructor() {
    this.enabled = false; // always opt-in per visit; catalog stays quiet by default
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.bedBus = this.ctx.createGain();
      this.bedBus.gain.value = BED_LEVEL;
      this.bedBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensureCtx();
      this.startBed();
      for (const name of Object.keys(UI)) void this.load(UI[name]);
    } else {
      this.stopBed();
    }
    return this.enabled;
  }

  /* ---------- loading ---------- */

  private async load(url: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(url)) return this.buffers.get(url)!;
    if (this.missing.has(url)) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const raw = await res.arrayBuffer();
      const buf = await this.ensureCtx().decodeAudioData(raw);
      if (url === AMBIENT_URL) this.condition(buf);
      this.buffers.set(url, buf);
      return buf;
    } catch {
      this.missing.add(url);
      return null;
    }
  }

  /** normalize peak and fade both ends so the loop seam breathes instead of clicking */
  private condition(buf: AudioBuffer) {
    const fade = Math.min(1.2 * buf.sampleRate, buf.length / 4);
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    }
    const gain = peak > 0.001 ? 0.6 / peak : 1;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        let g = gain;
        if (i < fade) g *= i / fade;
        else if (i > d.length - fade) g *= (d.length - i) / fade;
        d[i] *= g;
      }
    }
  }

  /* ---------- ambient bed ---------- */

  private async startBed() {
    if (this.playing) return;
    const buf = await this.load(AMBIENT_URL);
    // the toggle may have flipped back while decoding
    if (!this.enabled || this.playing || !buf) return;

    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + XFADE);
    src.connect(gain);
    gain.connect(this.bedBus!);
    src.start();
    this.playing = { src, gain };
  }

  private stopBed() {
    if (!this.playing || !this.ctx) return;
    const { src, gain } = this.playing;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + XFADE * 0.6);
    src.stop(t + XFADE * 0.6 + 0.05);
    this.playing = null;
  }

  /* ---------- UI sounds (sampled) ---------- */

  private blip(name: 'hover' | 'select') {
    if (!this.enabled) return;
    const buf = this.buffers.get(UI[name]);
    if (!buf) {
      void this.load(UI[name]);
      return;
    }
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = UI_LEVEL[name];
    src.connect(g).connect(this.master!);
    src.start();
  }

  hover() {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.lastHover < HOVER_GAP) return;
    this.lastHover = now;
    this.blip('hover');
  }

  select() {
    this.blip('select');
  }
}
