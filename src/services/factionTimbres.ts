import type { FactionId } from '../game/types'
import type { Voice } from './audio'

/** Instrumentos originales: el ruido conserva el golpe físico y las voces afinadas dan identidad. */
export const FACTION_TIMBRES: Readonly<Record<FactionId, { transpose: number; tail: number; harmonic: number; wave: OscillatorType }>> = {
  fury: { transpose: -5, tail: .72, harmonic: 98, wave: 'sawtooth' },
  arcane: { transpose: 7, tail: 1.4, harmonic: 659, wave: 'sine' },
  nature: { transpose: 2, tail: 1.18, harmonic: 392, wave: 'triangle' },
  order: { transpose: 4, tail: 1.3, harmonic: 523, wave: 'triangle' },
  shadow: { transpose: -7, tail: 1.6, harmonic: 147, wave: 'sine' },
  void: { transpose: -9, tail: 1.75, harmonic: 110, wave: 'sine' },
  duna: { transpose: -2, tail: 1.22, harmonic: 277, wave: 'triangle' },
  fimbul: { transpose: 9, tail: .88, harmonic: 880, wave: 'sine' },
  samsara: { transpose: 1, tail: 1.55, harmonic: 330, wave: 'sine' },
  jade: { transpose: 5, tail: 1.4, harmonic: 587, wave: 'triangle' },
  olimpo: { transpose: 3, tail: 1.24, harmonic: 494, wave: 'triangle' },
  sol: { transpose: -4, tail: .94, harmonic: 196, wave: 'triangle' },
  bestiario: { transpose: -6, tail: .76, harmonic: 123, wave: 'sawtooth' },
  plaga: { transpose: -8, tail: 1.1, harmonic: 131, wave: 'sawtooth' },
  marea: { transpose: -1, tail: 1.65, harmonic: 349, wave: 'sine' },
  forja: { transpose: -3, tail: .64, harmonic: 233, wave: 'triangle' },
  goblins: { transpose: 6, tail: .56, harmonic: 740, wave: 'square' },
  tercios: { transpose: 0, tail: .82, harmonic: 262, wave: 'triangle' },
  kalevala: { transpose: 8, tail: 1.7, harmonic: 784, wave: 'sine' },
}

export function factionVoices(voices: readonly Voice[], faction?: FactionId): readonly Voice[] {
  if (!faction) return voices
  const timbre = FACTION_TIMBRES[faction]
  const pitch = 2 ** (timbre.transpose / 12)
  const colored = voices.map((voice): Voice => ({
    ...voice,
    freq: voice.freq * (voice.wave === 'noise' ? Math.sqrt(pitch) : pitch),
    toFreq: voice.toFreq === undefined ? undefined : voice.toFreq * pitch,
    wave: voice.wave === 'sine' || voice.wave === 'triangle' ? timbre.wave : voice.wave,
    duration: Math.min(2.4, voice.duration * timbre.tail),
    gain: voice.gain * .88,
  }))
  return [...colored, { wave: 'sine', freq: timbre.harmonic, toFreq: timbre.harmonic * 1.005, at: .04, duration: .24 * timbre.tail, gain: .045, attack: .018 }]
}
