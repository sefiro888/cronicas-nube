import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../test/fakeAudioContext'
import {
  AMBIENCE,
  __resetAudioForTests,
  cueDuration,
  currentMusicTheme,
  playSynthCue,
  setAudioMix,
  startAmbientMusic,
  stopAmbientMusic,
  voicesForCue,
  type SoundCue,
} from './audio'

const CUES: readonly SoundCue[] = [
  'draw', 'resource', 'summon', 'spell', 'move', 'attack', 'impact',
  'destroy', 'freeze', 'shield', 'reveal', 'spotlight', 'land', 'trait', 'turn', 'victory', 'defeat', 'ui',
  'attack-slash', 'attack-claw', 'attack-crush', 'attack-spectral', 'attack-arrow', 'attack-shot', 'attack-bolt', 'attack-breath',
]

afterEach(() => {
  __resetAudioForTests()
  vi.useRealTimers()
})

describe('timbre de las señales', () => {
  it('cada señal tiene al menos una voz y ninguna dura más de un segundo y medio', () => {
    for (const cue of CUES) {
      const voices = voicesForCue(cue)
      expect(voices.length, cue).toBeGreaterThan(0)
      expect(cueDuration(cue), cue).toBeGreaterThan(0)
      expect(cueDuration(cue), cue).toBeLessThanOrEqual(1.5)
    }
  })

  it('las señales de acción apilan varias capas, no un pitido suelto', () => {
    for (const cue of ['summon', 'attack', 'impact', 'destroy', 'victory'] as const) {
      expect(voicesForCue(cue).length, cue).toBeGreaterThanOrEqual(2)
    }
  })

  it('mantiene todas las frecuencias dentro del rango audible', () => {
    for (const cue of CUES) {
      for (const voice of voicesForCue(cue)) {
        expect(voice.freq, cue).toBeGreaterThan(20)
        expect(voice.freq, cue).toBeLessThan(20000)
        if (voice.toFreq !== undefined) {
          expect(voice.toFreq, cue).toBeGreaterThan(20)
          expect(voice.toFreq, cue).toBeLessThan(20000)
        }
        expect(voice.gain, cue).toBeGreaterThan(0)
        expect(voice.gain, cue).toBeLessThanOrEqual(1)
      }
    }
  })

  it('la victoria suena mayor y la derrota grave: no son la misma señal', () => {
    const victory = voicesForCue('victory')
    const defeat = voicesForCue('defeat')
    const highest = Math.max(...victory.map((voice) => voice.freq))
    const lowest = Math.min(...defeat.map((voice) => voice.freq))
    expect(highest).toBeGreaterThan(lowest)
  })
})

describe('motor', () => {
  it('reutiliza un único AudioContext para toda la sesión', () => {
    const spy = installFakeAudio()
    playSynthCue('attack')
    playSynthCue('impact')
    playSynthCue('destroy')
    expect(spy.contexts).toBe(1)
  })

  it('crea un nodo sonoro por cada voz de la señal', () => {
    const spy = installFakeAudio()
    playSynthCue('impact')
    const voices = voicesForCue('impact')
    const noise = voices.filter((voice) => voice.wave === 'noise').length
    expect(spy.oscillators).toBe(voices.length - noise)
    expect(spy.bufferSources).toBe(noise)
  })

  it('silenciado no reproduce nada', () => {
    const spy = installFakeAudio()
    setAudioMix({ muted: true })
    playSynthCue('victory')
    expect(spy.oscillators).toBe(0)
  })

  it('no revienta si el navegador no trae WebAudio', () => {
    ;(window as unknown as { AudioContext: unknown }).AudioContext = undefined
    expect(() => playSynthCue('ui')).not.toThrow()
    expect(() => startAmbientMusic('caldera')).not.toThrow()
  })
})

describe('ambiente del escenario', () => {
  it('monta las tres capas y suelta sucesos sueltos con el tiempo', () => {
    vi.useFakeTimers()
    const spy = installFakeAudio()
    startAmbientMusic('caldera')
    expect(currentMusicTheme()).toBe('caldera')
    // Lecho de ruido en bucle + tono grave de varias voces + su modulador.
    expect(spy.bufferSources).toBeGreaterThanOrEqual(1)
    const droneVoices = spy.oscillators
    expect(droneVoices).toBeGreaterThanOrEqual(3)
    // La caldera chisporrotea cada pocos segundos: en medio minuto hay más nodos.
    vi.advanceTimersByTime(30_000)
    expect(spy.bufferSources + spy.oscillators).toBeGreaterThan(droneVoices + 1)
  })

  it('parar deja de programar sucesos nuevos', () => {
    vi.useFakeTimers()
    const spy = installFakeAudio()
    startAmbientMusic('sanctuary')
    vi.advanceTimersByTime(30_000)
    stopAmbientMusic()
    expect(currentMusicTheme()).toBeNull()
    vi.advanceTimersByTime(1000)
    const after = spy.oscillators
    vi.advanceTimersByTime(60_000)
    expect(spy.oscillators).toBe(after)
  })

  it('pedir el ambiente que ya suena no lo reinicia', () => {
    vi.useFakeTimers()
    const spy = installFakeAudio()
    startAmbientMusic('sanctuary')
    const afterFirst = spy.oscillators
    startAmbientMusic('sanctuary')
    expect(spy.oscillators).toBe(afterFirst)
  })

  it('cambiar de escenario cambia el ambiente', () => {
    vi.useFakeTimers()
    installFakeAudio()
    startAmbientMusic('sanctuary')
    startAmbientMusic('aether-citadel')
    expect(currentMusicTheme()).toBe('aether-citadel')
  })

  it('cada sitio tiene un perfil distinto: aire, tono y sucesos propios', () => {
    const cave = AMBIENCE.caldera
    const sky = AMBIENCE['aether-citadel']
    const ruins = AMBIENCE.sanctuary
    // La caldera retumba (corte grave), la ciudadela silba (corte alto).
    expect(cave.air.cutoff).toBeLessThan(sky.air.cutoff)
    // Y sus sucesos son de otra naturaleza y otro ritmo.
    expect(new Set([cave.detail.kind, sky.detail.kind, ruins.detail.kind]).size).toBe(3)
    expect(cave.detail.everyMax).toBeLessThan(ruins.detail.everyMax)
    for (const profile of Object.values(AMBIENCE)) {
      expect(profile.air.breath).toBeLessThan(0.2)
      expect(profile.drone.gain).toBeLessThan(0.15)
      expect(profile.detail.everyMin).toBeLessThan(profile.detail.everyMax)
    }
  })
})

describe('capa melódica', () => {
  it('cada sitio tiene su modo: no son la misma escala transportada', () => {
    const modos = Object.values(AMBIENCE).map((profile) => profile.motif.scale.join(','))
    // Siete perfiles, y al menos seis escalas distintas entre ellos.
    expect(new Set(modos).size).toBeGreaterThanOrEqual(6)
  })

  it('las frases dejan silencio de sobra entre ellas', () => {
    for (const [theme, profile] of Object.entries(AMBIENCE)) {
      const { motif } = profile
      expect(motif.phrase[0], theme).toBeGreaterThan(0)
      expect(motif.phrase[0], theme).toBeLessThanOrEqual(motif.phrase[1])
      expect(motif.rest[0], theme).toBeLessThan(motif.rest[1])
      // El silencio más corto tiene que superar a la frase más larga: si no,
      // las frases se encadenarían y esto dejaría de ser música de fondo.
      expect(motif.rest[0], theme).toBeGreaterThan(motif.phrase[1] * motif.step)
      expect(motif.gain, theme).toBeLessThan(0.1)
    }
  })

  it('el eco nunca se realimenta hasta crecer solo', () => {
    for (const [theme, profile] of Object.entries(AMBIENCE)) {
      // Con realimentación >= 1 el eco se suma a sí mismo y satura la mezcla.
      expect(profile.echo.feedback, theme).toBeLessThan(0.5)
      expect(profile.echo.mix, theme).toBeLessThanOrEqual(0.4)
      expect(profile.echo.time, theme).toBeGreaterThan(0)
      expect(profile.echo.time, theme).toBeLessThanOrEqual(2)
    }
  })

  it('la melodía llega sola al cabo de un rato, no al abrir la partida', () => {
    vi.useFakeTimers()
    const spy = installFakeAudio()
    startAmbientMusic('grove')
    const alArrancar = spy.oscillators
    // El primer silencio del claro es de 6 a 12 s: al segundo no hay nada aún.
    vi.advanceTimersByTime(1000)
    expect(spy.oscillators).toBe(alArrancar)
    vi.advanceTimersByTime(60_000)
    expect(spy.oscillators).toBeGreaterThan(alArrancar)
  })
})
