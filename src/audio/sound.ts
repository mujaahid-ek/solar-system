/**
 * Sound: a synthesised wind bed — two layers of filtered brown noise that
 * gust slowly against each other, so there is no loop seam and no screech —
 * plus two sampled UI blips (hover, select). Sound is ON by default, but the
 * browser autoplay policy means the bed only actually starts on the first
 * user gesture anywhere on the page.
 */

const UI: Record<string, string> = {
  hover: '/audio/hover.mp3',
  select: '/audio/select.mp3',
};

const XFADE = 1.6;
const BED_LEVEL = 0.5;
const UI_LEVEL: Record<string, number> = { hover: 0.5, select: 0.85 };
/** hovering across the nav strip shouldn't machine-gun the blip */
const HOVER_GAP = 0.07;

interface Wind {
  out: GainNode;
  nodes: AudioScheduledSourceNode[];
}

export class Sound {
  enabled = true; // on by default; the bed waits for the first gesture

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bedBus: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private missing = new Set<string>();
  private wind: Wind | null = null;
  private lastHover = 0;
  private armed = false;

  constructor() {
    // the bed can't start before a user gesture — arm it on the first one
    const arm = () => {
      if (this.armed) return;
      this.armed = true;
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
      if (this.enabled) this.start();
    };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    window.addEventListener('touchstart', arm);
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

  /** spin up the context, wind bed and UI samples together */
  private start() {
    this.ensureCtx();
    this.startBed();
    for (const url of Object.values(UI)) void this.load(url);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.start();
    else this.stopBed();
    return this.enabled;
  }

  /* ---------- procedural wind bed ---------- */

  /** a long brown-noise buffer: smooth, low-frequency, tapered so it loops clean */
  private brownNoise(seconds: number): AudioBuffer {
    const ctx = this.ensureCtx();
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // integrate → brown (no highs = no screech)
      d[i] = last * 3.2;
    }
    // fade the ends into each other so the loop wrap can never click
    const f = Math.min(2400, (len / 2) | 0);
    for (let i = 0; i < f; i++) {
      const g = i / f;
      d[i] *= g;
      d[len - 1 - i] *= g;
    }
    return buf;
  }

  /** wire a slow sine LFO onto an AudioParam, oscillating around `center` */
  private lfo(freq: number, depth: number, target: AudioParam, center: number): OscillatorNode {
    const ctx = this.ensureCtx();
    target.value = center;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const amp = ctx.createGain();
    amp.gain.value = depth;
    osc.connect(amp).connect(target);
    osc.start();
    return osc;
  }

  private startBed() {
    if (this.wind || !this.enabled) return;
    const ctx = this.ensureCtx();
    const nodes: AudioScheduledSourceNode[] = [];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + XFADE);
    out.connect(this.bedBus!);

    // layer 1 — low rumble, gusting in level
    const base = ctx.createBufferSource();
    base.buffer = this.brownNoise(7);
    base.loop = true;
    const baseLP = ctx.createBiquadFilter();
    baseLP.type = 'lowpass';
    baseLP.frequency.value = 480;
    baseLP.Q.value = 0.7;
    const baseGain = ctx.createGain();
    nodes.push(this.lfo(0.05, 0.3, baseGain.gain, 0.55)); // 0.25‥0.85
    base.connect(baseLP).connect(baseGain).connect(out);
    base.start();
    nodes.push(base);

    // layer 2 — airy whoosh, its band slowly sweeping, kept soft
    const air = ctx.createBufferSource();
    air.buffer = this.brownNoise(6);
    air.loop = true;
    const airBP = ctx.createBiquadFilter();
    airBP.type = 'bandpass';
    airBP.Q.value = 0.5;
    nodes.push(this.lfo(0.08, 260, airBP.frequency, 720)); // sweep 460‥980 Hz
    const airGain = ctx.createGain();
    nodes.push(this.lfo(0.07, 0.08, airGain.gain, 0.12));
    air.connect(airBP).connect(airGain).connect(out);
    air.start();
    nodes.push(air);

    this.wind = { out, nodes };
  }

  private stopBed() {
    if (!this.wind || !this.ctx) return;
    const { out, nodes } = this.wind;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0.0001, t + XFADE * 0.6);
    const stopAt = t + XFADE * 0.6 + 0.05;
    for (const n of nodes) {
      try {
        n.stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
    this.wind = null;
  }

  /* ---------- UI sounds (sampled) ---------- */

  private async load(url: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(url)) return this.buffers.get(url)!;
    if (this.missing.has(url)) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const raw = await res.arrayBuffer();
      const buf = await this.ensureCtx().decodeAudioData(raw);
      this.buffers.set(url, buf);
      return buf;
    } catch {
      this.missing.add(url);
      return null;
    }
  }

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
