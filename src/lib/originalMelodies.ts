export type OriginalMelody = {
  trackKey: string;
  title: string;
  creator: string;
  category: string;
  bpm: number;
  notes: number[];
  pad: number[];
  durationSeconds: number;
};

export const ORIGINAL_MELODIES: OriginalMelody[] = [
  { trackKey: "possara:calm-dawn", title: "Calm Dawn", creator: "POSSARA Originals", category: "Calm", bpm: 84, notes: [64,67,71,69,67,64,62,64], pad: [48,55,60], durationSeconds: 5.7 },
  { trackKey: "possara:hope-rising", title: "Hope Rising", creator: "POSSARA Originals", category: "Hope", bpm: 92, notes: [60,64,67,72,71,67,69,72], pad: [48,55,64], durationSeconds: 5.2 },
  { trackKey: "possara:focus-flow", title: "Focus Flow", creator: "POSSARA Originals", category: "Study", bpm: 96, notes: [62,65,69,65,62,67,69,72], pad: [50,57,62], durationSeconds: 5 },
  { trackKey: "possara:celebration-pulse", title: "Celebration Pulse", creator: "POSSARA Originals", category: "Celebration", bpm: 110, notes: [67,69,71,74,71,69,67,74], pad: [55,62,67], durationSeconds: 4.4 },
  { trackKey: "possara:reflection-light", title: "Reflection Light", creator: "POSSARA Originals", category: "Reflection", bpm: 76, notes: [57,60,64,62,60,57,55,57], pad: [45,52,57], durationSeconds: 6.3 },
];

const urlCache = new Map<string, string>();

function midiToHz(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function renderMelody(track: OriginalMelody) {
  const sampleRate = 12000;
  const beatSeconds = 60 / track.bpm;
  const duration = track.notes.length * beatSeconds;
  const samples = new Float32Array(Math.ceil(sampleRate * duration));

  track.notes.forEach((note, noteIndex) => {
    const start = Math.floor(noteIndex * beatSeconds * sampleRate);
    const length = Math.floor(beatSeconds * sampleRate);
    const frequency = midiToHz(note);
    for (let i = 0; i < length && start + i < samples.length; i += 1) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.035);
      const release = Math.min(1, Math.max(0, (beatSeconds - t) / 0.09));
      const envelope = attack * release;
      samples[start + i] += envelope * (
        0.48 * Math.sin(2 * Math.PI * frequency * t) +
        0.14 * Math.sin(2 * Math.PI * frequency * 2 * t) +
        0.06 * Math.sin(2 * Math.PI * frequency * 3 * t)
      );
    }
  });

  track.pad.forEach((note) => {
    const frequency = midiToHz(note);
    for (let i = 0; i < samples.length; i += 1) {
      const t = i / sampleRate;
      samples[i] += 0.08 * Math.sin(2 * Math.PI * frequency * t);
    }
  });

  const delay = Math.floor(sampleRate * 0.17);
  for (let i = delay; i < samples.length; i += 1) samples[i] += samples[i - delay] * 0.16;

  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
  const scale = peak > 0 ? 0.88 / peak : 1;
  const fade = Math.floor(sampleRate * 0.2);
  for (let i = 0; i < samples.length; i += 1) {
    let gain = scale;
    if (i < fade) gain *= i / fade;
    if (i > samples.length - fade) gain *= (samples.length - i) / fade;
    samples[i] *= gain;
  }

  return encodeWav(samples, sampleRate);
}

export function getOriginalMelody(trackKey: string) {
  return ORIGINAL_MELODIES.find((track) => track.trackKey === trackKey) ?? null;
}

export function getOriginalMelodyUrl(trackKey: string) {
  const cached = urlCache.get(trackKey);
  if (cached) return cached;
  const track = getOriginalMelody(trackKey);
  if (!track || typeof URL === "undefined") return null;
  const url = URL.createObjectURL(renderMelody(track));
  urlCache.set(trackKey, url);
  return url;
}
