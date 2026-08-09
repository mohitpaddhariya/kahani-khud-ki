import type { Mood } from "@/lib/story/types";

interface MoodSound {
  /** Base oscillator frequency in Hz. */
  freq: number;
  /** Second-oscillator ratio: near 1 = detune shimmer, 1.26 ≈ major third, 1.19 ≈ minor third. */
  ratio: number;
  /** Lowpass cutoff shaping the whole bed's brightness. */
  cutoff: number;
  /** Mood level multiplier applied inside the (already tiny) master gain. */
  level: number;
  lfoRate: number;
  lfoDepth: number;
  noise: number;
}

const MOOD_SOUND: Record<Mood, MoodSound> = {
  calm: { freq: 110, ratio: 1.007, cutoff: 620, level: 0.9, lfoRate: 0.07, lfoDepth: 0.35, noise: 0.5 },
  mystery: { freq: 88, ratio: 1.004, cutoff: 340, level: 0.8, lfoRate: 0.045, lfoDepth: 0.45, noise: 0.65 },
  tension: { freq: 66, ratio: 1.012, cutoff: 420, level: 0.95, lfoRate: 0.5, lfoDepth: 0.5, noise: 0.6 },
  adventure: { freq: 132, ratio: 1.498, cutoff: 950, level: 1.0, lfoRate: 0.16, lfoDepth: 0.35, noise: 0.55 },
  triumph: { freq: 165, ratio: 1.26, cutoff: 1300, level: 1.15, lfoRate: 0.12, lfoDepth: 0.3, noise: 0.5 },
  sad: { freq: 98, ratio: 1.189, cutoff: 460, level: 0.75, lfoRate: 0.05, lfoDepth: 0.4, noise: 0.45 },
};

const MASTER_LEVEL = 0.05;
const DUCK_LEVEL = 0.4;
/** setTargetAtTime time constant; ~95% of the way there in 3x this (≈1.5s). */
const RAMP_TC = 0.5;

interface Graph {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  noise: AudioBufferSourceNode;
  noiseGain: GainNode;
  filter: BiquadFilterNode;
  mix: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  duck: GainNode;
  master: GainNode;
}

/**
 * Generative WebAudio ambient bed — no audio files. Two detuned oscillators
 * plus filtered noise, breathing via a slow LFO, everything kept whisper-quiet
 * so it never fights the speech. `start()` must be called from a user gesture.
 */
export class Ambience {
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private mood: Mood = "calm";
  private ducked = false;

  start(): void {
    if (typeof window === "undefined") return;
    if (this.ctx && this.graph) {
      void this.ctx.resume();
      return;
    }

    const ctx = new AudioContext();
    void ctx.resume();
    const params = MOOD_SOUND[this.mood];

    const master = ctx.createGain();
    master.gain.value = 0;
    const duck = ctx.createGain();
    duck.gain.value = this.ducked ? DUCK_LEVEL : 1;
    const mix = ctx.createGain();
    mix.gain.value = params.level;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = params.cutoff;
    filter.Q.value = 0.6;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = params.freq;
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.5;

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = params.freq * params.ratio;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = params.noise * 0.16;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = params.lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = params.level * params.lfoDepth;

    osc1.connect(osc1Gain).connect(filter);
    osc2.connect(osc2Gain).connect(filter);
    noise.connect(noiseGain).connect(filter);
    filter.connect(mix).connect(duck).connect(master).connect(ctx.destination);
    lfo.connect(lfoGain).connect(mix.gain);

    osc1.start();
    osc2.start();
    noise.start();
    lfo.start();
    master.gain.setTargetAtTime(MASTER_LEVEL, ctx.currentTime, 0.8);

    this.ctx = ctx;
    this.graph = { osc1, osc2, noise, noiseGain, filter, mix, lfo, lfoGain, duck, master };
  }

  setMood(mood: Mood): void {
    this.mood = mood;
    if (!this.ctx || !this.graph) return;
    const params = MOOD_SOUND[mood];
    const now = this.ctx.currentTime;
    const g = this.graph;
    g.osc1.frequency.setTargetAtTime(params.freq, now, RAMP_TC);
    g.osc2.frequency.setTargetAtTime(params.freq * params.ratio, now, RAMP_TC);
    g.filter.frequency.setTargetAtTime(params.cutoff, now, RAMP_TC);
    g.mix.gain.setTargetAtTime(params.level, now, RAMP_TC);
    g.lfo.frequency.setTargetAtTime(params.lfoRate, now, RAMP_TC);
    g.lfoGain.gain.setTargetAtTime(params.level * params.lfoDepth, now, RAMP_TC);
    g.noiseGain.gain.setTargetAtTime(params.noise * 0.16, now, RAMP_TC);
  }

  /** Duck to 40% while speech plays so the bed never competes with voices. */
  duck(on: boolean): void {
    this.ducked = on;
    if (!this.ctx || !this.graph) return;
    this.graph.duck.gain.setTargetAtTime(on ? DUCK_LEVEL : 1, this.ctx.currentTime, 0.18);
  }

  stop(): void {
    const ctx = this.ctx;
    const graph = this.graph;
    this.ctx = null;
    this.graph = null;
    if (!ctx || !graph) return;
    graph.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    window.setTimeout(() => {
      try {
        graph.osc1.stop();
        graph.osc2.stop();
        graph.noise.stop();
        graph.lfo.stop();
      } catch {
        // already stopped
      }
      ctx.close().catch(() => undefined);
    }, 600);
  }
}
