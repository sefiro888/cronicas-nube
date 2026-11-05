import type { FactionId } from '../game/types'
import { factionVoices } from './factionTimbres'

export type SoundCue =
  | 'draw'
  | 'resource'
  | 'summon'
  | 'spell'
  | 'move'
  | 'attack'
  | 'impact'
  | 'destroy'
  | 'freeze'
  | 'shield'
  | 'reveal'
  | 'spotlight'
  | 'land'
  | 'trait'
  | 'turn'
  | 'victory'
  | 'defeat'
  | 'ui'
  // Un sonido por tipo de ataque (ver battle/attackStyle.ts): antes todos
  // los golpes sonaban con el mismo silbido.
  | 'attack-slash'
  | 'attack-claw'
  | 'attack-crush'
  | 'attack-spectral'
  | 'attack-arrow'
  | 'attack-shot'
  | 'attack-bolt'
  | 'attack-breath'

/**
 * Una voz es una capa de la señal: un oscilador (o una ráfaga de ruido) con su
 * envolvente propia. Las señales del juego se construyen apilando voces —un
 * golpe es sub-grave + ruido, una fanfarria son tres notas desplazadas en el
 * tiempo— en vez de un único pitido.
 *
 * Es una descripción de datos a propósito: se puede comprobar en tests sin
 * WebAudio y se renderiza en un solo sitio (`renderVoice`).
 */
export interface Voice {
  /** 'noise' usa una ráfaga de ruido blanco filtrado en vez de un oscilador. */
  wave: OscillatorType | 'noise'
  /** Frecuencia inicial en Hz (para 'noise', el corte del filtro). */
  freq: number
  /** Frecuencia final del barrido; si se omite, la voz no barre. */
  toFreq?: number
  /** Retardo desde el inicio de la señal, en segundos. */
  at: number
  /** Duración de la voz en segundos. */
  duration: number
  /** Ganancia relativa de la voz (0-1) antes de aplicar la mezcla del usuario. */
  gain: number
  /** Ataque de la envolvente en segundos: 0 = percusivo, alto = pad suave. */
  attack?: number
  /** Filtro pasa-banda para el ruido; alto = más metálico, bajo = más sordo. */
  q?: number
}

/** Semitono sobre una fundamental, en la escala temperada. */
const step = (root: number, semitones: number): number => root * Math.pow(2, semitones / 12)

/**
 * Timbre de cada señal del juego. Los graves llevan el peso físico (golpes,
 * destrucción) y los agudos la información (robar, revelar, congelar), de modo
 * que se distingan aunque suenen encadenados durante una animación larga.
 */
export const voicesForCue = (cue: SoundCue): readonly Voice[] => {
  switch (cue) {
    case 'draw':
      return [
        { wave: 'noise', freq: 3200, toFreq: 1400, at: 0, duration: 0.14, gain: 0.5, q: 1.4 },
        { wave: 'triangle', freq: 620, toFreq: 900, at: 0.02, duration: 0.1, gain: 0.25 },
      ]
    case 'resource':
      return [
        { wave: 'sine', freq: 660, at: 0, duration: 0.16, gain: 0.35 },
        { wave: 'sine', freq: 990, at: 0.05, duration: 0.16, gain: 0.22 },
      ]
    case 'summon':
      // Acorde grave que "aterriza": la unidad pesa.
      return [
        { wave: 'sawtooth', freq: 110, at: 0, duration: 0.42, gain: 0.35, attack: 0.06 },
        { wave: 'sawtooth', freq: step(110, 7), at: 0.03, duration: 0.4, gain: 0.24, attack: 0.06 },
        { wave: 'sine', freq: 55, at: 0, duration: 0.34, gain: 0.5 },
        { wave: 'noise', freq: 900, toFreq: 300, at: 0.18, duration: 0.22, gain: 0.28, q: 0.8 },
      ]
    case 'spell': {
      // Arpegio ascendente de tres notas: la magia "se eleva".
      const root = 520
      return [0, 4, 9].map((semitones, index) => ({
        wave: 'sine' as const,
        freq: step(root, semitones),
        toFreq: step(root, semitones + 0.2),
        at: index * 0.055,
        duration: 0.26,
        gain: 0.3 - index * 0.04,
        attack: 0.01,
      }))
    }
    case 'move':
      return [
        { wave: 'noise', freq: 1100, toFreq: 420, at: 0, duration: 0.16, gain: 0.34, q: 0.7 },
        { wave: 'triangle', freq: 200, toFreq: 150, at: 0, duration: 0.12, gain: 0.18 },
      ]
    case 'attack':
      // Filo: silbido corto y brillante antes del impacto.
      return [
        { wave: 'noise', freq: 4200, toFreq: 1200, at: 0, duration: 0.13, gain: 0.42, q: 2.4 },
        { wave: 'square', freq: 300, toFreq: 120, at: 0.01, duration: 0.1, gain: 0.16 },
      ]
    case 'attack-slash':
      // Acero: silbido largo y un tintineo metálico al final.
      return [
        { wave: 'noise', freq: 5200, toFreq: 1600, at: 0, duration: 0.18, gain: 0.4, q: 3.2 },
        { wave: 'triangle', freq: 1900, toFreq: 1700, at: 0.12, duration: 0.22, gain: 0.12 },
        { wave: 'triangle', freq: 2850, at: 0.13, duration: 0.16, gain: 0.07 },
      ]
    case 'attack-claw':
      // Zarpazo: tres desgarros cortos y un gruñido grave.
      return [
        { wave: 'noise', freq: 2400, toFreq: 900, at: 0, duration: 0.07, gain: 0.38, q: 1.4 },
        { wave: 'noise', freq: 2600, toFreq: 900, at: 0.06, duration: 0.07, gain: 0.36, q: 1.4 },
        { wave: 'noise', freq: 2800, toFreq: 900, at: 0.12, duration: 0.08, gain: 0.34, q: 1.4 },
        { wave: 'sawtooth', freq: 110, toFreq: 80, at: 0, duration: 0.3, gain: 0.14 },
      ]
    case 'attack-crush':
      // Mazazo: golpe sordo enorme y temblor de piedra.
      return [
        { wave: 'sine', freq: 90, toFreq: 30, at: 0.05, duration: 0.5, gain: 0.85 },
        { wave: 'noise', freq: 400, toFreq: 90, at: 0.05, duration: 0.45, gain: 0.55, q: 0.5 },
        { wave: 'square', freq: 55, toFreq: 40, at: 0.06, duration: 0.25, gain: 0.2 },
      ]
    case 'attack-spectral':
      // Espíritus: lamento que sube y baja con un susurro.
      return [
        { wave: 'sine', freq: 520, toFreq: 880, at: 0, duration: 0.45, gain: 0.18, attack: 0.12 },
        { wave: 'sine', freq: 530, toFreq: 300, at: 0.2, duration: 0.4, gain: 0.14, attack: 0.08 },
        { wave: 'noise', freq: 3000, toFreq: 1400, at: 0, duration: 0.5, gain: 0.16, q: 4, attack: 0.15 },
      ]
    case 'attack-arrow':
      // Flecha: cuerda que se suelta y zumbido que cruza.
      return [
        { wave: 'triangle', freq: 180, toFreq: 120, at: 0, duration: 0.08, gain: 0.3 },
        { wave: 'noise', freq: 6000, toFreq: 2500, at: 0.04, duration: 0.3, gain: 0.22, q: 6 },
      ]
    case 'attack-shot':
      // Pólvora: estampido seco y cola de humo.
      return [
        { wave: 'noise', freq: 1800, toFreq: 300, at: 0, duration: 0.09, gain: 0.8, q: 0.4 },
        { wave: 'sine', freq: 160, toFreq: 50, at: 0, duration: 0.2, gain: 0.6 },
        { wave: 'noise', freq: 500, toFreq: 200, at: 0.06, duration: 0.5, gain: 0.18, q: 0.3, attack: 0.05 },
      ]
    case 'attack-bolt':
      // Rayo: chasquido eléctrico con zumbido que tiembla.
      return [
        { wave: 'noise', freq: 7000, toFreq: 3000, at: 0, duration: 0.06, gain: 0.5, q: 0.8 },
        { wave: 'sawtooth', freq: 70, toFreq: 140, at: 0.02, duration: 0.35, gain: 0.18 },
        { wave: 'square', freq: 1400, toFreq: 300, at: 0.05, duration: 0.25, gain: 0.08 },
      ]
    case 'attack-breath':
      // Aliento de dragón: rugido grave y llamarada que crece.
      return [
        { wave: 'sawtooth', freq: 85, toFreq: 60, at: 0, duration: 0.6, gain: 0.3, attack: 0.05 },
        { wave: 'noise', freq: 900, toFreq: 2600, at: 0.05, duration: 0.7, gain: 0.5, q: 0.5, attack: 0.15 },
      ]
    case 'impact':
      // Golpe: sub-grave con caída + capa de ruido sordo.
      return [
        { wave: 'sine', freq: 140, toFreq: 44, at: 0, duration: 0.26, gain: 0.75 },
        { wave: 'noise', freq: 700, toFreq: 180, at: 0, duration: 0.18, gain: 0.45, q: 0.6 },
        { wave: 'square', freq: 90, toFreq: 60, at: 0.01, duration: 0.12, gain: 0.2 },
      ]
    case 'destroy':
      // Derrumbe: barrido largo hacia abajo con crujido.
      return [
        { wave: 'sawtooth', freq: 180, toFreq: 40, at: 0, duration: 0.5, gain: 0.42 },
        { wave: 'noise', freq: 1600, toFreq: 200, at: 0, duration: 0.45, gain: 0.4, q: 0.5 },
        { wave: 'sine', freq: 70, toFreq: 35, at: 0.06, duration: 0.4, gain: 0.5 },
      ]
    case 'freeze':
      // Cristal: campanilla muy aguda + siseo helado.
      return [
        { wave: 'sine', freq: 1980, toFreq: 2400, at: 0, duration: 0.32, gain: 0.24 },
        { wave: 'sine', freq: 2970, at: 0.04, duration: 0.26, gain: 0.14 },
        { wave: 'noise', freq: 6000, toFreq: 3000, at: 0, duration: 0.34, gain: 0.2, q: 3 },
      ]
    case 'shield':
      return [
        { wave: 'sine', freq: 300, toFreq: 450, at: 0, duration: 0.3, gain: 0.34, attack: 0.05 },
        { wave: 'triangle', freq: 600, toFreq: 900, at: 0.04, duration: 0.26, gain: 0.18, attack: 0.05 },
      ]
    case 'reveal':
      return [
        { wave: 'sine', freq: 780, toFreq: 1170, at: 0, duration: 0.24, gain: 0.26, attack: 0.02 },
        { wave: 'noise', freq: 5200, toFreq: 2600, at: 0, duration: 0.2, gain: 0.16, q: 2.2 },
      ]
    case 'spotlight':
      // Carta en grande: golpe grave que abre espacio y un brillo que sube,
      // como un telón. Más largo que 'reveal' porque la presentación dura 5 s
      // y un pitido corto sonaba a error de interfaz.
      return [
        { wave: 'sine', freq: 70, toFreq: 48, at: 0, duration: 0.6, gain: 0.55 },
        { wave: 'noise', freq: 600, toFreq: 2400, at: 0, duration: 0.5, gain: 0.22, q: 0.9, attack: 0.08 },
        { wave: 'sine', freq: step(440, 7), toFreq: step(440, 12), at: 0.12, duration: 0.7, gain: 0.18, attack: 0.12 },
        { wave: 'triangle', freq: step(880, 7), at: 0.3, duration: 0.6, gain: 0.1, attack: 0.05 },
      ]
    case 'land':
      // Aterrizaje: el sub-grave es el peso; el ruido corto, la losa.
      return [
        { wave: 'sine', freq: 95, toFreq: 38, at: 0, duration: 0.32, gain: 0.7 },
        { wave: 'noise', freq: 500, toFreq: 140, at: 0, duration: 0.26, gain: 0.4, q: 0.6 },
      ]
    case 'trait':
      // Habilidad que actúa: dos notas brillantes en quinta, cortas, para que
      // se distingan del golpe que las acompaña.
      return [
        { wave: 'triangle', freq: step(660, 0), at: 0, duration: 0.18, gain: 0.24, attack: 0.005 },
        { wave: 'triangle', freq: step(660, 7), at: 0.07, duration: 0.24, gain: 0.22, attack: 0.005 },
        { wave: 'noise', freq: 7000, toFreq: 4000, at: 0, duration: 0.14, gain: 0.1, q: 3 },
      ]
    case 'turn':
      // Dos notas de aviso, como una campana de sala.
      return [
        { wave: 'triangle', freq: 494, at: 0, duration: 0.3, gain: 0.3, attack: 0.01 },
        { wave: 'triangle', freq: 659, at: 0.13, duration: 0.34, gain: 0.28, attack: 0.01 },
      ]
    case 'victory': {
      // Fanfarria mayor de cuatro notas.
      const root = 392
      return [0, 4, 7, 12].map((semitones, index) => ({
        wave: 'triangle' as const,
        freq: step(root, semitones),
        at: index * 0.12,
        duration: index === 3 ? 0.8 : 0.36,
        gain: 0.32,
        attack: 0.015,
      }))
    }
    case 'defeat': {
      // Caída menor: la misma forma que la victoria, invertida y grave.
      const root = 262
      return [0, -3, -8].map((semitones, index) => ({
        wave: 'sawtooth' as const,
        freq: step(root, semitones),
        at: index * 0.18,
        duration: index === 2 ? 0.9 : 0.4,
        gain: 0.26,
        attack: 0.03,
      }))
    }
    case 'ui':
    default:
      return [{ wave: 'sine', freq: 640, toFreq: 820, at: 0, duration: 0.07, gain: 0.22 }]
  }
}

/** Duración total de una señal, para saber cuánto tarda en apagarse. */
export const cueDuration = (cue: SoundCue): number =>
  voicesForCue(cue).reduce((longest, voice) => Math.max(longest, voice.at + voice.duration), 0)

// ── Motor ────────────────────────────────────────────────────────────────────

interface Engine {
  context: AudioContext
  /** Bus de efectos: señales cortas de acción. */
  sfx: GainNode
  /** Bus de música: la capa ambiental de fondo. */
  music: GainNode
  /** Envío compartido a la reverberación. */
  reverb: GainNode
}

let engine: Engine | null = null
let mix = { master: 0.75, effects: 0.7, music: 0.35, muted: false }

/**
 * Genera una respuesta de impulso (sala mediana) por ruido decaído: da cuerpo a
 * las señales sin cargar ningún archivo de audio externo.
 */
const buildImpulse = (context: AudioContext, seconds = 1.6, decay = 3): AudioBuffer => {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

/**
 * Un ÚNICO AudioContext para toda la sesión. La versión anterior creaba uno por
 * sonido: los navegadores limitan cuántos contextos simultáneos admiten (Chrome
 * corta sobre los 6) y abrirlos cuesta milisegundos de hilo principal, así que
 * en una animación con varios eventos seguidos empezaban a fallar sonidos.
 */
const getEngine = (): Engine | null => {
  if (engine) return engine
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext
  if (!AudioContextClass) return null
  try {
    const context = new AudioContextClass()
    const master = context.createGain()
    master.gain.value = 1
    // El compresor evita que un golpe y una fanfarria simultáneos saturen.
    const limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 6
    limiter.attack.value = 0.003
    limiter.release.value = 0.18
    master.connect(limiter).connect(context.destination)

    const sfx = context.createGain()
    const music = context.createGain()
    sfx.connect(master)
    music.connect(master)

    const reverb = context.createGain()
    reverb.gain.value = 0.22
    const convolver = context.createConvolver()
    convolver.buffer = buildImpulse(context)
    reverb.connect(convolver).connect(master)

    engine = { context, sfx, music, reverb }
    applyMix()
    return engine
  } catch {
    return null
  }
}

const applyMix = (): void => {
  if (!engine) return
  const master = mix.muted ? 0 : Math.max(0, Math.min(1, mix.master))
  engine.sfx.gain.value = master * Math.max(0, Math.min(1, mix.effects))
  engine.music.gain.value = master * Math.max(0, Math.min(1, mix.music))
}

/**
 * Fija la mezcla desde las preferencias del usuario. Se aplica en caliente: al
 * mover un deslizador durante la partida, la música de fondo cambia de volumen
 * sin cortarse.
 */
export const setAudioMix = (next: Partial<typeof mix>): void => {
  mix = { ...mix, ...next }
  applyMix()
}

/**
 * Los navegadores arrancan el AudioContext suspendido hasta que hay un gesto
 * real del usuario. Llamar a esto desde cualquier clic lo despierta.
 */
export const resumeAudio = (): void => {
  const active = getEngine()
  if (active && active.context.state === 'suspended') void active.context.resume()
}

const renderVoice = (active: Engine, voice: Voice, startAt: number, level: number): void => {
  const { context } = active
  const begin = startAt + voice.at
  const end = begin + voice.duration
  const gain = context.createGain()
  const peak = Math.max(0.0001, voice.gain * level * 0.5)
  const attack = voice.attack ?? 0.004
  gain.gain.setValueAtTime(0.0001, begin)
  gain.gain.exponentialRampToValueAtTime(peak, begin + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  gain.connect(active.sfx)
  gain.connect(active.reverb)

  if (voice.wave === 'noise') {
    const length = Math.max(1, Math.floor(context.sampleRate * voice.duration))
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = voice.q ?? 1
    filter.frequency.setValueAtTime(voice.freq, begin)
    if (voice.toFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(40, voice.toFreq), end)
    source.connect(filter).connect(gain)
    source.start(begin)
    source.stop(end)
    return
  }

  const oscillator = context.createOscillator()
  oscillator.type = voice.wave
  oscillator.frequency.setValueAtTime(voice.freq, begin)
  if (voice.toFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, voice.toFreq), end)
  oscillator.connect(gain)
  oscillator.start(begin)
  oscillator.stop(end)
}

/**
 * Reproduce una señal del juego. Ya no recibe volumen: la mezcla del usuario
 * (general / efectos / silencio) vive en los buses del motor y se aplica en
 * caliente, así que cada punto de llamada solo dice QUÉ suena, no cuánto.
 */
export function playSynthCue(cue: SoundCue, faction?: FactionId): void {
  if (mix.muted) return
  const active = getEngine()
  if (!active) return
  if (active.context.state === 'suspended') void active.context.resume()
  const startAt = active.context.currentTime + 0.005
  for (const voice of factionVoices(voicesForCue(cue), faction)) renderVoice(active, voice, startAt, 1)
}

// ── Ambiente ─────────────────────────────────────────────────────────────────

export type MusicTheme = 'aether-citadel' | 'sanctuary' | 'caldera' | 'duna' | 'fimbul' | 'grove' | 'shore' | 'foundry' | 'jade-court' | 'wheel-ghat' | 'menu'

/**
 * Perfil sonoro de cada sitio. No es música: es el AMBIENTE del lugar, tres
 * capas que suenan a la vez.
 *
 * - `air`: lecho de ruido en bucle, filtrado y con el corte respirando muy
 *   despacio — el viento de la ciudadela, el aire quieto del santuario, el
 *   rugido sordo de la caldera.
 * - `drone`: dos o tres notas larguísimas, muy graves y ligeramente
 *   desafinadas entre sí, que dan tono y profundidad sin melodía que se pegue.
 * - `detail`: sucesos sueltos y espaciados (una gota, una chispa, una
 *   campanilla) que llegan a intervalos irregulares para que el sitio parezca
 *   vivo y no un bucle.
 *
 * La versión anterior encadenaba acordes de pad y sonaba a órgano de juguete:
 * en un juego de tablero la capa de fondo tiene que poder ignorarse mientras
 * se piensa la jugada.
 */
interface AmbienceProfile {
  air: {
    /** Espectro del lecho: 'brown' pesa hacia los graves, 'pink' es más neutro. */
    color: 'brown' | 'pink'
    /** Corte del pasa-bajos, en Hz, y cuánto respira arriba y abajo. */
    cutoff: number
    sweep: number
    /** Ciclos por segundo de esa respiración: siempre muy por debajo de 1. */
    breath: number
    gain: number
  }
  drone: {
    /** Fundamental en Hz y los intervalos (en semitonos) que se apilan encima. */
    root: number
    intervals: readonly number[]
    wave: OscillatorType
    gain: number
    /** Desafinado entre las voces, en cents: da el batido lento característico. */
    detune: number
  }
  detail: {
    kind: 'chime' | 'drip' | 'ember' | 'sandgust' | 'icecrack'
    /** Separación mínima y máxima entre sucesos, en segundos. */
    everyMin: number
    everyMax: number
    gain: number
  }
  /**
   * `motif`: la MÚSICA propiamente dicha, que antes no existía. Las tres capas
   * anteriores dan ambiente pero ningún sitio tenía tema propio.
   *
   * No es una melodía compuesta ni un bucle: es un paseo aleatorio por los
   * grados de una escala, en frases cortas separadas por silencios largos. Esa
   * decisión es deliberada — esto suena debajo de una partida que dura media
   * hora, y cualquier melodía cerrada se aprende de memoria a la tercera vuelta
   * y acaba molestando. Al no repetirse nunca igual, se puede ignorar mientras
   * se piensa la jugada, que es lo que tiene que hacer la música de un juego de
   * tablero.
   *
   * Lo que de verdad distingue un sitio de otro no son las notas sino el MODO
   * (`scale`), el registro (`root`) y el timbre: la Caldera va en frigio
   * dominante con sierra filtrada y la Ciudadela en pentatónica mayor con
   * triangular abierta, y se reconocen aunque el paseo sea el mismo algoritmo.
   */
  motif: {
    /** Fundamental, en Hz: fija el registro del sitio. */
    root: number
    /** Grados disponibles en semitonos. Es el modo, y es lo que da el carácter. */
    scale: readonly number[]
    wave: OscillatorType
    /** Corte del pasa-bajos de cada nota: cierra o abre el timbre. */
    tone: number
    /** Duración de la nota y separación entre notas de una misma frase. */
    note: number
    step: number
    /** Notas por frase: mínimo y máximo. */
    phrase: readonly [number, number]
    /** Silencio entre frases, en segundos. Es lo que la hace ignorable. */
    rest: readonly [number, number]
    gain: number
    /** Segunda voz en semitonos sobre la nota (0 = a una sola voz). */
    harmony: number
  }
  /**
   * El eco del sitio. Una cueva cerrada devuelve el sonido, un desierto
   * abierto no devuelve nada y un bosque lo absorbe entre las hojas: es la
   * pista más fuerte de dónde está uno, y hasta ahora las seis escenas
   * compartían exactamente la misma sala.
   */
  echo: { time: number; feedback: number; mix: number }
}

export const AMBIENCE: Record<MusicTheme, AmbienceProfile> = {
  // Altura y aire libre: viento fino, tono luminoso, campanillas de cristal.
  'aether-citadel': {
    air: { color: 'pink', cutoff: 820, sweep: 420, breath: 0.055, gain: 0.14 },
    drone: { root: 98, intervals: [0, 7, 19], wave: 'triangle', gain: 0.05, detune: 6 },
    detail: { kind: 'chime', everyMin: 7, everyMax: 16, gain: 0.16 },
    // Pentatónica mayor y triangular abierta: aire, altura y nada que estorbe.
    motif: { root: 392, scale: [0, 2, 4, 7, 9, 12], wave: 'triangle', tone: 2200, note: 1.2, step: 0.55, phrase: [3, 5], rest: [7, 14], gain: 0.05, harmony: 12 },
    // Plaza de piedra al aire libre: el eco vuelve pronto y limpio.
    echo: { time: 0.42, feedback: 0.26, mix: 0.22 },
  },
  // Piedra, noche y agua: casi sin viento, tono menor, goteo en la lejanía.
  sanctuary: {
    air: { color: 'brown', cutoff: 340, sweep: 140, breath: 0.03, gain: 0.16 },
    drone: { root: 87.3, intervals: [0, 3, 12], wave: 'sine', gain: 0.06, detune: 4 },
    detail: { kind: 'drip', everyMin: 4, everyMax: 11, gain: 0.13 },
    // Pentatónica menor, senoidal y notas largas: solemne, no triste.
    motif: { root: 261.63, scale: [0, 3, 5, 7, 10, 12], wave: 'sine', tone: 1200, note: 2, step: 0.9, phrase: [2, 4], rest: [9, 18], gain: 0.055, harmony: 7 },
    // Piedra y agua quieta en una isla: la cola es larga y oscura.
    echo: { time: 0.66, feedback: 0.38, mix: 0.3 },
  },
  // Interior volcánico: rumor grave constante y brasas que estallan a menudo.
  caldera: {
    air: { color: 'brown', cutoff: 190, sweep: 110, breath: 0.09, gain: 0.22 },
    drone: { root: 65.4, intervals: [0, 1, 12], wave: 'sawtooth', gain: 0.045, detune: 9 },
    detail: { kind: 'ember', everyMin: 1.6, everyMax: 5, gain: 0.1 },
    // Frigio dominante (la segunda menor con la tercera mayor) sobre sierra
    // filtrada: es el modo que suena a amenaza sin necesidad de disonancia.
    motif: { root: 196, scale: [0, 1, 5, 6, 8, 12], wave: 'sawtooth', tone: 700, note: 1.1, step: 0.5, phrase: [3, 6], rest: [5, 11], gain: 0.04, harmony: 0 },
    // Cueva cerrada: es el sitio que más devuelve de los seis.
    echo: { time: 0.5, feedback: 0.42, mix: 0.34 },
  },
  // Desierto a mediodía: viento seco y ancho, tono cálido de quinta abierta y
  // rachas de arena de vez en cuando. Nada de agua ni de cristal: la Necrópolis
  // tiene que sonar a sitio sin sombra.
  duna: {
    air: { color: 'pink', cutoff: 1150, sweep: 620, breath: 0.042, gain: 0.17 },
    drone: { root: 73.4, intervals: [0, 7, 14], wave: 'triangle', gain: 0.05, detune: 7 },
    detail: { kind: 'sandgust', everyMin: 5, everyMax: 13, gain: 0.13 },
    // Doble armónica (hiyaz): dos segundas aumentadas, el color del desierto.
    motif: { root: 293.66, scale: [0, 1, 4, 5, 7, 8, 11], wave: 'triangle', tone: 1700, note: 1, step: 0.42, phrase: [4, 7], rest: [6, 13], gain: 0.045, harmony: 0 },
    // A campo abierto no vuelve nada: la arena se lo traga.
    echo: { time: 0.3, feedback: 0.1, mix: 0.08 },
  },
  // Noche polar sobre un lago helado: viento alto y delgado (nada que lo
  // frene en kilómetros), tono menor muy grave y el crujido del hielo a lo
  // lejos. Es el ambiente más vacío de los cinco a propósito — el frío se
  // transmite por lo que NO suena.
  fimbul: {
    air: { color: 'pink', cutoff: 1450, sweep: 380, breath: 0.05, gain: 0.15 },
    drone: { root: 61.7, intervals: [0, 3, 19], wave: 'sine', gain: 0.055, detune: 5 },
    detail: { kind: 'icecrack', everyMin: 6, everyMax: 17, gain: 0.12 },
    // Notas larguísimas, muy separadas, con la quinta dos octavas por encima:
    // el frío se transmite por lo que NO suena, igual que en la capa de aire.
    motif: { root: 329.63, scale: [0, 2, 3, 7, 10, 12], wave: 'sine', tone: 1500, note: 2.6, step: 1.3, phrase: [2, 3], rest: [12, 24], gain: 0.05, harmony: 19 },
    // Kilómetros de hielo liso: el eco tarda en volver y vuelve entero.
    echo: { time: 0.9, feedback: 0.3, mix: 0.26 },
  },
  // Claro del bosque: hojas moviéndose todo el rato (el aire es lo que más
  // suena, y a media altura: ni el silbido del hielo ni el rumor grave de la
  // cueva), tono cálido de tercera mayor y goteo del agua que cae de las
  // ramas. Es el único ambiente del juego en modo mayor — el bosque es el
  // sitio amable de los seis.
  grove: {
    air: { color: 'pink', cutoff: 720, sweep: 340, breath: 0.075, gain: 0.19 },
    drone: { root: 82.4, intervals: [0, 4, 11], wave: 'triangle', gain: 0.05, detune: 6 },
    detail: { kind: 'drip', everyMin: 3.5, everyMax: 10, gain: 0.12 },
    // Pentatónica mayor con la tercera doblada: el único tema amable del juego.
    motif: { root: 349.23, scale: [0, 2, 4, 7, 9, 12], wave: 'triangle', tone: 1900, note: 1.3, step: 0.6, phrase: [3, 6], rest: [6, 12], gain: 0.048, harmony: 4 },
    // La hojarasca absorbe: casi no hay cola, y la poca que hay es corta.
    echo: { time: 0.34, feedback: 0.18, mix: 0.14 },
  },
  // Rompiente: el oleaje es lo que más suena y va MUY despacio (la
  // respiración más lenta de las siete), porque una ola tarda en romper. El
  // tono es menor con la sexta, que es el color melancólico del atardecer
  // sobre el agua, y el detalle son gotas: lo que escurre de la roca cuando el
  // agua se retira.
  shore: {
    air: { color: 'brown', cutoff: 620, sweep: 460, breath: 0.022, gain: 0.24 },
    drone: { root: 73.4, intervals: [0, 3, 8], wave: 'sine', gain: 0.055, detune: 5 },
    detail: { kind: 'drip', everyMin: 3, everyMax: 9, gain: 0.12 },
    motif: { root: 293.66, scale: [0, 2, 3, 5, 7, 8, 12], wave: 'sine', tone: 1500, note: 1.9, step: 0.85, phrase: [3, 5], rest: [8, 16], gain: 0.05, harmony: 7 },
    // Costa abierta con acantilados: vuelve algo, pero tarda y llega deshecho.
    echo: { time: 0.74, feedback: 0.24, mix: 0.2 },
  },
  // Patio del Gremio: una fábrica no susurra, MACHACA. El lecho es grave y
  // constante (el tiro del horno), el tono lleva la segunda menor que da la
  // sensación de máquina desafinada, y el detalle son chispas frecuentes: es
  // el ambiente con los sucesos más seguidos de los ocho, porque en un taller
  // siempre está sonando algo. La melodía va en menor natural y con notas
  // cortas y regulares, casi a compás: aquí el ritmo es el que marca la
  // máquina, no el que marca la naturaleza.
  foundry: {
    air: { color: 'brown', cutoff: 230, sweep: 130, breath: 0.11, gain: 0.23 },
    drone: { root: 61.7, intervals: [0, 1, 12], wave: 'sawtooth', gain: 0.05, detune: 8 },
    detail: { kind: 'ember', everyMin: 1.4, everyMax: 4.2, gain: 0.11 },
    motif: { root: 220, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'triangle', tone: 900, note: 0.85, step: 0.4, phrase: [4, 7], rest: [5, 11], gain: 0.042, harmony: 12 },
    // Nave cerrada con paredes de chapa: devuelve mucho y devuelve pronto.
    echo: { time: 0.36, feedback: 0.4, mix: 0.3 },
  },
  // Corte de Jade: el único ambiente en escala PENTATÓNICA del juego (los
  // cinco grados sin semitonos), que es lo que suena a música china de
  // inmediato, y con las notas muy separadas porque una corte ceremoniosa no
  // atropella. El detalle son campanillas: las de los aleros, que suenan
  // cuando corre el aire. El aire va alto y suave — un patio cerrado al
  // amanecer, sin el vendaval del Fiordo ni el tiro del horno.
  'jade-court': {
    air: { color: 'pink', cutoff: 880, sweep: 300, breath: 0.03, gain: 0.13 },
    drone: { root: 98, intervals: [0, 7, 12], wave: 'triangle', gain: 0.05, detune: 4 },
    detail: { kind: 'chime', everyMin: 5, everyMax: 13, gain: 0.15 },
    motif: { root: 261.63, scale: [0, 2, 4, 7, 9, 12], wave: 'triangle', tone: 2000, note: 1.6, step: 0.72, phrase: [3, 5], rest: [7, 15], gain: 0.05, harmony: 12 },
    // Patio con muros y galerías: devuelve claro y con cola corta.
    echo: { time: 0.4, feedback: 0.3, mix: 0.24 },
  },
  // Escalinata de la Rueda: el único ambiente con el tono grave SIN MOVERSE
  // nunca (una sola fundamental con su quinta y su octava, como el bordón de
  // una tambura), que es lo que sostiene esta música. Encima, una escala con
  // la segunda menor y la séptima mayor —el color del raga Bhairav, el del
  // amanecer— y notas largas y muy espaciadas. El detalle es goteo: el agua
  // del ghat.
  'wheel-ghat': {
    air: { color: 'brown', cutoff: 400, sweep: 180, breath: 0.026, gain: 0.18 },
    drone: { root: 73.4, intervals: [0, 7, 12], wave: 'sawtooth', gain: 0.05, detune: 3 },
    detail: { kind: 'drip', everyMin: 3.5, everyMax: 10, gain: 0.12 },
    motif: { root: 293.66, scale: [0, 1, 4, 5, 7, 8, 11], wave: 'triangle', tone: 1600, note: 2.1, step: 0.95, phrase: [3, 5], rest: [8, 17], gain: 0.05, harmony: 7 },
    // Escalinata de piedra abierta al río: devuelve poco y se va enseguida.
    echo: { time: 0.52, feedback: 0.22, mix: 0.18 },
  },
  // Portada y menús: lo más discreto posible, solo tono y alguna campanilla.
  menu: {
    air: { color: 'pink', cutoff: 500, sweep: 200, breath: 0.04, gain: 0.09 },
    drone: { root: 110, intervals: [0, 7, 16], wave: 'sine', gain: 0.055, detune: 5 },
    detail: { kind: 'chime', everyMin: 11, everyMax: 24, gain: 0.12 },
    // Portada: quintas y octavas sueltas, sin tercera, para no comprometer el
    // carácter antes de que el jugador elija sitio.
    motif: { root: 220, scale: [0, 7, 12, 16], wave: 'sine', tone: 1400, note: 2.2, step: 1.1, phrase: [2, 3], rest: [14, 26], gain: 0.04, harmony: 0 },
    echo: { time: 0.5, feedback: 0.2, mix: 0.16 },
  },
}

/**
 * Ruido en bucle de varios segundos. 'brown' se integra (cada muestra parte de
 * la anterior), lo que carga el espectro en los graves y da un rumor de fondo;
 * 'pink' aproxima el rosa sumando dos polos, más parecido al siseo del aire.
 */
const buildNoiseLoop = (context: AudioContext, color: 'brown' | 'pink', seconds = 6): AudioBuffer => {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  let brown = 0
  let slow = 0
  let mid = 0
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1
    if (color === 'brown') {
      brown = (brown + white * 0.02) / 1.02
      data[i] = brown * 3.2
    } else {
      slow = 0.99 * slow + white * 0.05
      mid = 0.86 * mid + white * 0.25
      data[i] = (slow + mid + white * 0.12) * 0.6
    }
  }
  // Fundido cruzado en los extremos: sin esto el punto de bucle chasquea.
  const fade = Math.min(2000, Math.floor(length / 8))
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade
    data[i] = (data[i] ?? 0) * k + (data[length - fade + i] ?? 0) * (1 - k)
  }
  return buffer
}

interface AmbienceHandle {
  theme: MusicTheme
  timer: number
  /** Temporizador propio de la capa melódica, aparte del de los sucesos. */
  phraseTimer: number
  /**
   * Grado de la escala en el que se quedó la frase anterior. Guardarlo es lo
   * que hace que la melodía sea un PASEO y no una sucesión de notas sueltas:
   * cada frase arranca donde acabó la última.
   */
  degree: number
  /** Envío al eco del sitio, o null si la escena no devuelve sonido. */
  echo: GainNode | null
  /** Todo lo que hay que parar al cambiar de sitio. */
  sources: Set<AudioScheduledSourceNode>
  /** Ganancia común de la capa: permite fundirla en vez de cortarla en seco. */
  bus: GainNode
}

let ambience: AmbienceHandle | null = null

/** Un suceso suelto del ambiente: gota, chispa o campanilla. */
const playDetail = (active: Engine, handle: AmbienceHandle, profile: AmbienceProfile): void => {
  const { context } = active
  const at = context.currentTime + 0.02
  const gain = context.createGain()
  gain.connect(handle.bus)
  gain.connect(active.reverb)

  if (profile.detail.kind === 'ember') {
    // Brasa: chasquido corto de ruido, con la altura variando en cada disparo.
    const duration = 0.09 + Math.random() * 0.1
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.2
    filter.frequency.value = 900 + Math.random() * 2200
    gain.gain.setValueAtTime(profile.detail.gain * (0.5 + Math.random() * 0.5), at)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    source.connect(filter).connect(gain)
    source.start(at)
    source.stop(at + duration)
    handle.sources.add(source)
    source.addEventListener('ended', () => handle.sources.delete(source))
    return
  }

  if (profile.detail.kind === 'sandgust') {
    // Racha de arena: ruido filtrado que entra y sale despacio, con el corte
    // barriendo hacia arriba — el siseo del grano al levantarse y posarse.
    const duration = 1.6 + Math.random() * 1.8
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 0.7
    filter.frequency.setValueAtTime(700 + Math.random() * 400, at)
    filter.frequency.linearRampToValueAtTime(2200 + Math.random() * 900, at + duration)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(profile.detail.gain * (0.6 + Math.random() * 0.5), at + duration * 0.35)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    source.connect(filter).connect(gain)
    source.start(at)
    source.stop(at + duration)
    handle.sources.add(source)
    source.addEventListener('ended', () => handle.sources.delete(source))
    return
  }

  if (profile.detail.kind === 'icecrack') {
    // Crujido del lago helado: un golpe seco de ruido grave y, pegado detrás,
    // un tono descendente muy filtrado — es la grieta propagándose bajo la
    // superficie, que es lo que le da el punto inquietante y lo separa de un
    // simple chasquido.
    const duration = 0.5 + Math.random() * 0.5
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      // Ataque instantáneo y cola larga: la energía se va muy rápido al principio.
      const t = i / data.length
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 9)
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 6
    filter.frequency.setValueAtTime(1400 + Math.random() * 900, at)
    filter.frequency.exponentialRampToValueAtTime(180 + Math.random() * 120, at + duration)
    gain.gain.setValueAtTime(profile.detail.gain * (0.6 + Math.random() * 0.5), at)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    source.connect(filter).connect(gain)
    source.start(at)
    source.stop(at + duration)
    handle.sources.add(source)
    source.addEventListener('ended', () => handle.sources.delete(source))
    return
  }

  const drip = profile.detail.kind === 'drip'
  const duration = drip ? 0.3 : 2.6
  const base = drip ? 640 + Math.random() * 520 : 880 * Math.pow(2, Math.floor(Math.random() * 3) / 3)
  const oscillator = context.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(base, at)
  // La gota baja de tono al caer; la campanilla se queda quieta y se apaga.
  if (drip) oscillator.frequency.exponentialRampToValueAtTime(base * 0.45, at + duration)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(profile.detail.gain, at + (drip ? 0.008 : 0.06))
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  oscillator.connect(gain)
  oscillator.start(at)
  oscillator.stop(at + duration + 0.05)
  handle.sources.add(oscillator)
  oscillator.addEventListener('ended', () => handle.sources.delete(oscillator))

  if (!drip) {
    // La campanilla lleva su quinta encima, muy floja: suena a cristal golpeado
    // y no a un pitido de test.
    const partial = context.createOscillator()
    const partialGain = context.createGain()
    partial.type = 'sine'
    partial.frequency.value = base * 1.5
    partialGain.gain.setValueAtTime(0.0001, at)
    partialGain.gain.exponentialRampToValueAtTime(profile.detail.gain * 0.35, at + 0.08)
    partialGain.gain.exponentialRampToValueAtTime(0.0001, at + duration * 0.7)
    partial.connect(partialGain)
    partialGain.connect(handle.bus)
    partialGain.connect(active.reverb)
    partial.start(at)
    partial.stop(at + duration)
    handle.sources.add(partial)
    partial.addEventListener('ended', () => handle.sources.delete(partial))
  }
}

/** Programa el siguiente suceso a un intervalo irregular (nunca en rejilla). */
/**
 * Una nota de la capa melódica: oscilador, pasa-bajos y envolvente suave.
 *
 * El ataque ocupa la cuarta parte de la nota. Es mucho, y es a propósito: un
 * ataque rápido suena a instrumento tocado y llama la atención, mientras que
 * uno lento hace que la nota APAREZCA. Es la diferencia entre una melodía que
 * se sigue y una que se queda de fondo.
 */
const renderNote = (
  active: Engine,
  handle: AmbienceHandle,
  profile: AmbienceProfile,
  freq: number,
  at: number,
  level: number,
): void => {
  const { context } = active
  const duration = profile.motif.note
  const osc = context.createOscillator()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  osc.type = profile.motif.wave
  osc.frequency.value = freq
  filter.type = 'lowpass'
  filter.frequency.value = profile.motif.tone
  filter.Q.value = 0.7
  // Las rampas exponenciales no admiten el cero, de ahí el 0.0001 en los extremos.
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), at + duration * 0.25)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(filter).connect(gain)
  gain.connect(handle.bus)
  gain.connect(active.reverb)
  if (handle.echo) gain.connect(handle.echo)
  osc.start(at)
  osc.stop(at + duration + 0.05)
  handle.sources.add(osc)
  osc.addEventListener('ended', () => handle.sources.delete(osc))
}

/**
 * Una frase: unas pocas notas paseando por la escala. El paso es de un grado
 * arriba o abajo casi siempre, y de dos de vez en cuando; al llegar a un
 * extremo rebota hacia dentro. Así la línea se mueve poco y no salta, que es
 * lo que la mantiene por debajo del umbral de atención.
 */
const playPhrase = (active: Engine, handle: AmbienceHandle, profile: AmbienceProfile): number => {
  const { motif } = profile
  const [minNotes, maxNotes] = motif.phrase
  const count = minNotes + Math.floor(Math.random() * (maxNotes - minNotes + 1))
  let at = active.context.currentTime + 0.05
  for (let i = 0; i < count; i += 1) {
    const salto = Math.random() < 0.75 ? 1 : 2
    const sentido = Math.random() < 0.5 ? -1 : 1
    let next = handle.degree + salto * sentido
    if (next < 0 || next >= motif.scale.length) next = handle.degree - salto * sentido
    handle.degree = Math.max(0, Math.min(motif.scale.length - 1, next))
    const freq = step(motif.root, motif.scale[handle.degree] ?? 0)
    // Las notas de dentro de la frase bajan de volumen hacia el final: la
    // frase se apaga sola en vez de cortarse.
    const level = motif.gain * (1 - (i / count) * 0.35)
    renderNote(active, handle, profile, freq, at, level)
    if (motif.harmony > 0) {
      renderNote(active, handle, profile, step(freq, motif.harmony), at, level * 0.4)
    }
    at += motif.step
  }
  return at - active.context.currentTime
}

/** Encadena frases con un silencio largo entre ellas. */
const schedulePhrase = (active: Engine, handle: AmbienceHandle, profile: AmbienceProfile): void => {
  const [minRest, maxRest] = profile.motif.rest
  const rest = minRest + Math.random() * (maxRest - minRest)
  handle.phraseTimer = window.setTimeout(() => {
    if (ambience !== handle) return
    const spent = playPhrase(active, handle, profile)
    handle.phraseTimer = window.setTimeout(() => {
      if (ambience !== handle) return
      schedulePhrase(active, handle, profile)
    }, spent * 1000)
  }, rest * 1000)
}

const scheduleDetail = (active: Engine, handle: AmbienceHandle, profile: AmbienceProfile): void => {
  const { everyMin, everyMax } = profile.detail
  const wait = (everyMin + Math.random() * (everyMax - everyMin)) * 1000
  handle.timer = window.setTimeout(() => {
    if (ambience !== handle) return
    playDetail(active, handle, profile)
    scheduleDetail(active, handle, profile)
  }, wait)
}

/**
 * Arranca (o cambia) el ambiente del sitio. Entra con un fundido de dos
 * segundos para que no aparezca de golpe al abrir la partida. Pedir el mismo
 * ambiente que ya suena no hace nada, así se puede llamar en cada render.
 */
export const startAmbientMusic = (theme: MusicTheme): void => {
  if (ambience?.theme === theme) return
  stopAmbientMusic()
  const active = getEngine()
  if (!active) return
  if (active.context.state === 'suspended') void active.context.resume()
  const { context } = active
  const profile = AMBIENCE[theme]
  const bus = context.createGain()
  bus.connect(active.music)
  const now = context.currentTime
  bus.gain.setValueAtTime(0.0001, now)
  bus.gain.exponentialRampToValueAtTime(1, now + 2)

  const handle: AmbienceHandle = {
    theme,
    timer: 0,
    phraseTimer: 0,
    // Arranca a media escala para que el primer paseo pueda ir en las dos
    // direcciones sin rebotar contra un extremo.
    degree: Math.floor(profile.motif.scale.length / 2),
    echo: null,
    sources: new Set(),
    bus,
  }
  ambience = handle

  // Capa 0: el eco del sitio. Se monta antes que nada porque las otras capas
  // se enganchan a el. La realimentacion se queda muy por debajo de 1: a
  // partir de ahi el eco se retroalimenta y crece hasta saturar.
  if (profile.echo.mix > 0) {
    const send = context.createGain()
    send.gain.value = profile.echo.mix
    const delay = context.createDelay(2)
    delay.delayTime.value = profile.echo.time
    const feedback = context.createGain()
    feedback.gain.value = Math.min(0.45, profile.echo.feedback)
    send.connect(delay)
    delay.connect(feedback).connect(delay)
    delay.connect(bus)
    handle.echo = send
  }

  // Capa 1: el aire del sitio.
  const air = context.createBufferSource()
  air.buffer = buildNoiseLoop(context, profile.air.color)
  air.loop = true
  const airFilter = context.createBiquadFilter()
  airFilter.type = 'lowpass'
  airFilter.frequency.value = profile.air.cutoff
  airFilter.Q.value = 0.4
  const airGain = context.createGain()
  airGain.gain.value = profile.air.gain
  air.connect(airFilter).connect(airGain).connect(bus)
  // Respiración del corte: un oscilador lentísimo modula el filtro, así el
  // lecho sube y baja de brillo en vez de quedarse plano y delatar el bucle.
  const breath = context.createOscillator()
  const breathDepth = context.createGain()
  breath.type = 'sine'
  breath.frequency.value = profile.air.breath
  breathDepth.gain.value = profile.air.sweep
  breath.connect(breathDepth).connect(airFilter.frequency)
  air.start(now)
  breath.start(now)
  handle.sources.add(air)
  handle.sources.add(breath)

  // Capa 2: el tono grave del lugar.
  for (const [index, semitones] of profile.drone.intervals.entries()) {
    const voice = context.createOscillator()
    const voiceGain = context.createGain()
    const filter = context.createBiquadFilter()
    voice.type = profile.drone.wave
    voice.frequency.value = step(profile.drone.root, semitones)
    voice.detune.value = (index - 1) * profile.drone.detune
    filter.type = 'lowpass'
    filter.frequency.value = 420 + index * 180
    voiceGain.gain.value = profile.drone.gain / (index + 1)
    voice.connect(filter).connect(voiceGain).connect(bus)
    voiceGain.connect(active.reverb)
    voice.start(now)
    handle.sources.add(voice)
  }

  // Capa 3: los sucesos sueltos.
  scheduleDetail(active, handle, profile)

  // Capa 4: la musica. Entra con el primer silencio ya cumplido, no de golpe
  // al abrir la partida: lo primero que se oye es el sitio, y el tema llega
  // despues, cuando el jugador ya esta mirando el tablero.
  schedulePhrase(active, handle, profile)
}

/** Apaga el ambiente con un fundido corto y libera sus nodos. */
export const stopAmbientMusic = (): void => {
  const handle = ambience
  if (!handle) return
  ambience = null
  window.clearTimeout(handle.timer)
  window.clearTimeout(handle.phraseTimer)
  const stopAll = () => {
    for (const source of handle.sources) {
      try {
        source.stop()
      } catch {
        // Una fuente ya terminada lanza al pararla otra vez: es inocuo.
      }
    }
    handle.sources.clear()
    // Soltar el bus desconecta con el toda la cadena de eco que colgaba de el.
    try {
      handle.bus.disconnect()
    } catch {
      // Un bus ya desconectado no vuelve a serlo: es inocuo.
    }
  }
  try {
    const context = handle.bus.context
    const now = context.currentTime
    handle.bus.gain.cancelScheduledValues(now)
    handle.bus.gain.setValueAtTime(Math.max(0.0001, handle.bus.gain.value), now)
    handle.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    window.setTimeout(stopAll, 450)
  } catch {
    stopAll()
  }
}

/** ¿Qué ambiente suena ahora mismo? (para la interfaz y para los tests). */
export const currentMusicTheme = (): MusicTheme | null => ambience?.theme ?? null

/** Solo para tests: descarta el motor para poder construir otro limpio. */
export const __resetAudioForTests = (): void => {
  if (ambience) {
    window.clearTimeout(ambience.timer)
    window.clearTimeout(ambience.phraseTimer)
    ambience = null
  }
  engine = null
  mix = { master: 0.75, effects: 0.7, music: 0.35, muted: false }
}


// ── Tensión de la batalla ────────────────────────────────────────────────

/**
 * Capa de tensión sobre el ambiente: un zumbido grave con pulso que crece con
 * la tensión de la partida (turnos y Vida del Nexo más tocado). El ambiente
 * del sitio sigue igual; esta capa entra por encima y se retira sola cuando
 * la partida se calma. Así la música se intensifica sin cambiar de tema.
 */
interface TensionHandle {
  oscillators: OscillatorNode[]
  lfo: OscillatorNode
  filter: BiquadFilterNode
  gain: GainNode
  pulse: GainNode
}

let tension: TensionHandle | null = null

export const setBattleTension = (level: number): void => {
  const active = getEngine()
  if (!active) return
  const { context } = active
  const clamped = Math.max(0, Math.min(1, level))
  if (!tension) {
    const gain = context.createGain()
    gain.gain.value = 0
    const pulse = context.createGain()
    pulse.gain.value = 0.6
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 180
    const lfo = context.createOscillator()
    lfo.frequency.value = 1
    const lfoDepth = context.createGain()
    lfoDepth.gain.value = 0.4
    lfo.connect(lfoDepth).connect(pulse.gain)
    const oscillators = [55, 55.6, 82.4].map((freq, index) => {
      const oscillator = context.createOscillator()
      oscillator.type = index === 2 ? 'triangle' : 'sawtooth'
      oscillator.frequency.value = freq
      oscillator.connect(filter)
      oscillator.start()
      return oscillator
    })
    filter.connect(pulse).connect(gain).connect(active.music)
    lfo.start()
    tension = { oscillators, lfo, filter, gain, pulse }
  }
  const now = context.currentTime
  // Por debajo de un tercio no se oye: una partida tranquila no debe zumbar.
  const audible = Math.max(0, (clamped - 0.33) / 0.67)
  tension.gain.gain.setTargetAtTime(audible * audible * 0.22, now, 1.5)
  tension.filter.frequency.setTargetAtTime(160 + audible * 900, now, 1.5)
  tension.lfo.frequency.setTargetAtTime(0.8 + audible * 3.2, now, 1.5)
}

export const stopBattleTension = (): void => {
  const handle = tension
  if (!handle) return
  tension = null
  const active = getEngine()
  const now = active?.context.currentTime ?? 0
  handle.gain.gain.setTargetAtTime(0, now, 0.4)
  window.setTimeout(() => {
    for (const oscillator of [...handle.oscillators, handle.lfo]) {
      try { oscillator.stop() } catch { /* ya parado: inocuo */ }
    }
    try { handle.gain.disconnect() } catch { /* ya desconectado: inocuo */ }
  }, 2000)
}
