import { useGameStore } from '../../state/GameStore';

export type SoundKey =
  | 'punch_light'
  | 'punch_heavy'
  | 'punch_miss'
  | 'bat_swing'
  | 'bat_impact'
  | 'axe_swing'
  | 'axe_impact'
  | 'hammer_swing'
  | 'hammer_impact'
  | 'stick_swing'
  | 'stick_impact'
  | 'rock_throw'
  | 'rock_impact'
  | 'block'
  | 'enemy_grunt'
  | 'enemy_stagger'
  | 'enemy_knockdown'
  | 'enemy_death'
  | 'elite_roar'
  | 'weapon_pickup'
  | 'weapon_drop'
  | 'wave_start'
  | 'wave_complete'
  | 'boss_entrance'
  | 'boss_phase_change'
  | 'boss_enraged'
  | 'boss_death'
  | 'player_death'
  | 'player_respawn'
  | 'victory'
  | 'rain_ambient'
  | 'thunder_01'
  | 'thunder_02'
  | 'lightning_crack'
  | 'arena_hum';

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  env: GainNode;
  noiseBuffer: AudioBuffer;
  musicState: {
    intensity: number;
    playing: boolean;
    timer: number;
  };
}

let engine: Engine | null = null;

export function isAudioReady(): boolean {
  return !!engine;
}

export function initAudio() {
  if (engine) {
    if (engine.ctx.state === 'suspended') {
      engine.ctx.resume();
    }
    return engine;
  }

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const sfx = ctx.createGain();
  sfx.gain.value = 0.8;
  sfx.connect(master);

  const music = ctx.createGain();
  music.gain.value = 0.45;
  music.connect(master);

  const env = ctx.createGain();
  env.gain.value = 0.25;
  env.connect(master);

  const seconds = 1;
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  engine = {
    ctx,
    master,
    sfx,
    music,
    env,
    noiseBuffer,
    musicState: { intensity: 0, playing: false, timer: 0 },
  };

  startEnvironmentLoops();
  return engine;
}

function muted(): boolean {
  return useGameStore.getState().audioEnabled === false;
}

function noise(volume: number, duration: number, filterFreq: number, type: BiquadFilterType = 'bandpass', attack = 0.005) {
  const e = engine;
  if (!e || muted()) return;
  const src = e.ctx.createBufferSource();
  src.buffer = e.noiseBuffer;
  src.loop = true;
  const filter = e.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.9;
  const gain = e.ctx.createGain();
  const t = e.ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(e.sfx);
  src.start();
  src.stop(t + duration + 0.05);
}

function osc(
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  slideTo?: number,
) {
  const e = engine;
  if (!e || muted()) return;
  const o = e.ctx.createOscillator();
  o.type = type;
  const t = e.ctx.currentTime;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
  const gain = e.ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  o.connect(gain);
  gain.connect(e.sfx);
  o.start();
  o.stop(t + duration + 0.05);
}

function impact(kind: 'thock' | 'clank' | 'thud' | 'crunch' | 'ring') {
  switch (kind) {
    case 'thock':
      osc(160, 0.12, 0.5, 'square', 70);
      noise(0.5, 0.08, 900);
      break;
    case 'clank':
      osc(520, 0.18, 0.4, 'triangle', 200);
      noise(0.4, 0.1, 2600, 'bandpass');
      break;
    case 'thud':
      osc(90, 0.28, 0.7, 'sine', 40);
      noise(0.35, 0.16, 320, 'lowpass');
      break;
    case 'crunch':
      osc(200, 0.16, 0.45, 'sawtooth', 90);
      noise(0.6, 0.14, 1100);
      break;
    case 'ring':
      osc(1400, 0.28, 0.3, 'sine', 900);
      break;
  }
}

export function playSound(key: SoundKey) {
  switch (key) {
    case 'punch_light':
      noise(0.5, 0.07, 750);
      osc(140, 0.09, 0.45, 'square', 90);
      break;
    case 'punch_heavy':
      osc(110, 0.22, 0.65, 'square', 50);
      noise(0.55, 0.12, 500, 'lowpass');
      break;
    case 'punch_miss':
      noise(0.22, 0.16, 1400, 'bandpass');
      break;
    case 'bat_swing':
      noise(0.25, 0.22, 1600, 'bandpass');
      break;
    case 'bat_impact':
      impact('clank');
      noise(0.4, 0.1, 2000);
      break;
    case 'axe_swing':
      noise(0.2, 0.2, 900, 'bandpass');
      break;
    case 'axe_impact':
      impact('crunch');
      break;
    case 'hammer_swing':
      noise(0.35, 0.26, 600, 'lowpass');
      break;
    case 'hammer_impact':
      impact('thud');
      noise(0.5, 0.16, 240, 'lowpass');
      break;
    case 'stick_swing':
      noise(0.18, 0.15, 1000, 'bandpass');
      break;
    case 'stick_impact':
      impact('thock');
      break;
    case 'rock_throw':
      noise(0.3, 0.24, 500, 'lowpass');
      break;
    case 'rock_impact':
      impact('thud');
      noise(0.4, 0.1, 400, 'lowpass');
      break;
    case 'block':
      impact('ring');
      noise(0.3, 0.05, 3400);
      break;
    case 'enemy_grunt':
      osc(180 + Math.random() * 40, 0.14, 0.25, 'sawtooth', 110);
      break;
    case 'enemy_stagger':
      osc(150, 0.1, 0.28, 'sawtooth', 90);
      break;
    case 'enemy_knockdown':
      osc(220, 0.3, 0.3, 'sawtooth', 70);
      noise(0.3, 0.2, 500, 'lowpass');
      break;
    case 'enemy_death':
      osc(300, 0.4, 0.3, 'sawtooth', 60);
      noise(0.4, 0.3, 600, 'lowpass');
      break;
    case 'elite_roar':
      osc(70, 0.9, 0.5, 'sawtooth', 45);
      osc(105, 0.9, 0.35, 'sawtooth', 55);
      noise(0.4, 0.8, 300, 'lowpass');
      break;
    case 'weapon_pickup':
      osc(660, 0.12, 0.3, 'sine');
      setTimeout(() => osc(990, 0.16, 0.3, 'sine'), 70);
      break;
    case 'weapon_drop':
      osc(320, 0.12, 0.25, 'triangle', 200);
      break;
    case 'wave_start':
      [220, 294, 370].forEach((f, i) => setTimeout(() => osc(f, 0.2, 0.3, 'triangle'), i * 90));
      break;
    case 'wave_complete':
      [370, 440, 554, 659].forEach((f, i) => setTimeout(() => osc(f, 0.28, 0.3, 'triangle'), i * 110));
      break;
    case 'boss_entrance':
      osc(90, 1.2, 0.5, 'sawtooth', 40);
      osc(60, 1.4, 0.4, 'sine', 35);
      noise(0.3, 1.0, 200, 'lowpass');
      break;
    case 'boss_phase_change':
      osc(160, 0.5, 0.35, 'square', 80);
      osc(240, 0.5, 0.25, 'square', 110);
      break;
    case 'boss_enraged':
      osc(55, 1.4, 0.55, 'sawtooth', 90);
      noise(0.5, 1.2, 500, 'lowpass');
      break;
    case 'boss_death':
      osc(240, 1.3, 0.4, 'sawtooth', 40);
      noise(0.6, 1.2, 400, 'lowpass');
      setTimeout(() => osc(60, 2.0, 0.4, 'sine', 30), 300);
      break;
    case 'player_death':
      osc(420, 0.6, 0.35, 'sine', 120);
      break;
    case 'player_respawn':
      osc(180, 0.2, 0.3, 'triangle', 260);
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => osc(f, 0.4, 0.32, 'triangle'), i * 150));
      break;
    case 'arena_hum':
      // sustained low hum handled by loop below
      break;
    case 'rain_ambient':
    case 'thunder_01':
    case 'thunder_02':
    case 'lightning_crack':
      thunder();
      break;
    default:
      break;
  }
}

function thunder() {
  const e = engine;
  if (!e || muted()) return;
  const src = e.ctx.createBufferSource();
  src.buffer = e.noiseBuffer;
  src.loop = true;
  const filter = e.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, e.ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(90, e.ctx.currentTime + 1.4);
  const gain = e.ctx.createGain();
  const t = e.ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.8, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  for (let i = 0; i < 4; i++) {
    const crack = e.ctx.createBufferSource();
    crack.buffer = e.noiseBuffer;
    const cfilter = e.ctx.createBiquadFilter();
    cfilter.type = 'highpass';
    cfilter.frequency.value = 2000;
    const cgain = e.ctx.createGain();
    cgain.gain.setValueAtTime(0, t + i * 0.08);
    cgain.gain.linearRampToValueAtTime(0.5, t + i * 0.08 + 0.01);
    cgain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.1);
    crack.connect(cfilter);
    cfilter.connect(cgain);
    cgain.connect(e.env);
    crack.start();
    crack.stop(t + i * 0.08 + 0.15);
  }
  src.connect(filter);
  filter.connect(gain);
  gain.connect(e.env);
  src.start();
  src.stop(t + 2.0);
}

function startEnvironmentLoops() {
  const e = engine;
  if (!e) return;

  const rain = e.ctx.createBufferSource();
  rain.buffer = e.noiseBuffer;
  rain.loop = true;
  const rainFilter = e.ctx.createBiquadFilter();
  rainFilter.type = 'bandpass';
  rainFilter.frequency.value = 2400;
  rainFilter.Q.value = 0.3;
  const rainGain = e.ctx.createGain();
  rainGain.gain.value = 0.06;
  rain.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(e.env);
  rain.start();

  const hum = e.ctx.createOscillator();
  hum.type = 'sine';
  hum.frequency.value = 55;
  const humGain = e.ctx.createGain();
  humGain.gain.value = 0.02;
  const hum2 = e.ctx.createOscillator();
  hum2.type = 'sine';
  hum2.frequency.value = 110;
  const hum2Gain = e.ctx.createGain();
  hum2Gain.gain.value = 0.01;
  hum.connect(humGain);
  humGain.connect(e.env);
  hum2.connect(hum2Gain);
  hum2Gain.connect(e.env);
  hum.start();
  hum2.start();
}

export function setMusicIntensity(intensity: number) {
  const e = engine;
  if (!e) return;
  const clamped = Math.max(0, Math.min(3, intensity));
  e.musicState.intensity = clamped;

  if (!e.musicState.playing && clamped > 0) {
    e.musicState.playing = true;
    scheduleMusicLoop();
  }
}

function scheduleMusicLoop() {
  const e = engine;
  if (!e || !e.musicState.playing) return;

  const step = 0.5;
  const t = e.ctx.currentTime;
  const intensity = e.musicState.intensity;

  const bass = e.ctx.createOscillator();
  bass.type = 'sine';
  bass.frequency.value = 55 + intensity * 8;
  const bassGain = e.ctx.createGain();
  bassGain.gain.setValueAtTime(0, t);
  bassGain.gain.linearRampToValueAtTime(0.12 + intensity * 0.06, t + 0.02);
  bassGain.gain.exponentialRampToValueAtTime(0.0001, t + step * 3.8);
  bass.connect(bassGain);
  bassGain.connect(e.music);
  bass.start(t);
  bass.stop(t + step * 4);

  if (intensity >= 1) {
    const hats = e.ctx.createBufferSource();
    hats.buffer = e.noiseBuffer;
    const hatsFilter = e.ctx.createBiquadFilter();
    hatsFilter.type = 'highpass';
    hatsFilter.frequency.value = 5000;
    const hatsGain = e.ctx.createGain();
    hatsGain.gain.setValueAtTime(0.05 + intensity * 0.03, t + step * 2);
    hatsGain.gain.linearRampToValueAtTime(0.0001, t + step * 2 + 0.08);
    hats.connect(hatsFilter);
    hatsFilter.connect(hatsGain);
    hatsGain.connect(e.music);
    hats.start(t + step * 2);
    hats.stop(t + step * 2 + 0.2);
  }

  if (intensity >= 2) {
    const chordRoot = 220;
    [1, 1.25, 1.5].forEach((m, i) => {
      const o = e.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = chordRoot * m;
      const g = e.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03 + intensity * 0.01, t + 0.01 + i * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      o.connect(g);
      g.connect(e.music);
      o.start(t);
      o.stop(t + 2.1);
    });
  }

  e.musicState.timer = window.setTimeout(scheduleMusicLoop, step * 1000);
}

export function stopMusic() {
  const e = engine;
  if (!e) return;
  e.musicState.playing = false;
  if (e.musicState.timer) {
    clearTimeout(e.musicState.timer);
    e.musicState.timer = 0;
  }
}