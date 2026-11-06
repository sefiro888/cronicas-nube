import type { CSSProperties } from 'react'
import { CARD_GLOSSARY, type GlossaryEntry } from './GlossaryText'

/**
 * Identidad visual de cada término del glosario: icono, color y familia.
 *
 * Existe porque todos los términos se pintaban igual (mismo azul, mismo
 * subrayado) y en plena batalla no había forma de distinguir de un vistazo
 * un daño de un escudo o de un efecto que dura un turno. Con una identidad
 * fija, el mismo icono y color aparecen en el texto de la carta, en el panel
 * «Qué hace», en el duelo y sobre las fichas del tablero: se aprende una vez.
 *
 * Los iconos son trazos propios sobre una cuadrícula de 24 (sin arte de
 * terceros). Se dibujan con `currentColor` para heredar el color del término.
 */
export type KeywordFamily = 'ataque' | 'defensa' | 'control' | 'magia' | 'recurso' | 'faccion' | 'regla'

export interface KeywordIdentity {
  readonly glyph: GlyphId
  readonly color: string
  readonly family: KeywordFamily
}

export const FAMILY_LABELS: Readonly<Record<KeywordFamily, string>> = {
  ataque: 'Ataque',
  defensa: 'Defensa',
  control: 'Control',
  magia: 'Magia',
  recurso: 'Recurso',
  faccion: 'Mecánica de facción',
  regla: 'Regla',
}

/** Trazos de cada icono. Pocos y gruesos: tienen que leerse a 14 px. */
const GLYPHS = {
  flame: 'M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.6 2.4-4.8.3 1.6 1 2.6 2.1 3C11 7.4 11.4 4.6 12 2Z',
  bomb: 'M10 8a7 7 0 1 0 .01 0ZM14.5 6.5l2-2M17 3l1.5-1.5M18 6h2.5M16.5 2.5V1',
  snow: 'M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9 3.5l3 2 3-2M9 20.5l3-2 3 2',
  shield: 'M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5Z',
  tower: 'M5 22V8l2-2V3h2v2h2V3h2v2h2V3h2v3l2 2v14ZM10 22v-5h4v5',
  spear: 'M3 21 15 9M13 5l6-3-3 6-2 1-2-2ZM5 15l4 4',
  wing: 'M2 14c4-1 7-4 9-9 1 4 0 7-2 9 3-1 6-1 9 0-3 3-7 4-11 4l-5-4Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7Z',
  heart: 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11Z',
  star: 'M12 2l2.6 6.4L21 9l-5 4.4 1.5 6.6L12 16.6 6.5 20 8 13.4 3 9l6.4-.6Z',
  drop: 'M12 2s7 7.6 7 12.5A7 7 0 0 1 5 14.5C5 9.6 12 2 12 2Z',
  scale: 'M12 3v18M7 21h10M4 7h16M4 7l-2.5 6h5ZM20 7l-2.5 6h5Z',
  skull: 'M12 2a8 8 0 0 0-8 8c0 3 1.5 4.6 3 5.6V19h10v-3.4c1.5-1 3-2.6 3-5.6a8 8 0 0 0-8-8ZM9 11h.01M15 11h.01M10 22v-3M14 22v-3',
  sun: 'M12 7a5 5 0 1 0 .01 0ZM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12ZM12 9a3 3 0 1 0 .01 0Z',
  spiral: 'M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6 8 8 0 0 1 8-8',
  sword: 'M14.5 3H21v6.5L9 21.5 2.5 15ZM5 13l6 6M3 21l3-3',
  crown: 'M2 18 4 7l5 5 3-8 3 8 5-5 2 11ZM2 21h20',
  card: 'M6 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM8 7h6M8 11h6',
  gem: 'M12 2 21 9l-9 13L3 9Z M3 9h18M12 2v20',
  wall: 'M2 6h20v14H2ZM2 13h20M8 6v7M16 6v7M12 13v7',
  wave: 'M2 9c3-3 5 3 8 0s5 3 8 0 3-1 4-1M2 15c3-3 5 3 8 0s5 3 8 0 3-1 4-1',
  coin: 'M12 3a9 9 0 1 0 .01 0ZM12 7v10M9 9.5c0-1.4 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2.5-3 1.2-3 2.5 1.3 2 3 2 3-.6 3-2',
  phalanx: 'M5 2v20M12 2v20M19 2v20M3 5l2-3 2 3M10 5l2-3 2 3M17 5l2-3 2 3',
  target: 'M12 2a10 10 0 1 0 .01 0ZM12 7a5 5 0 1 0 .01 0ZM12 11a1 1 0 1 0 .01 0Z',
  grid: 'M3 3h6v6H3ZM15 3h6v6h-6ZM3 15h6v6H3ZM15 15h6v6h-6ZM9 6h6M6 9v6',
  hourglass: 'M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10',
  horde: 'M8 7a3 3 0 1 0 .01 0ZM16 7a3 3 0 1 0 .01 0ZM2 21c0-4 3-6 6-6s6 2 6 6M10 21c0-4 3-6 6-6s6 2 6 6',
  virus: 'M12 7a5 5 0 1 0 .01 0ZM12 1v4M12 19v4M1 12h4M19 12h4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M4.2 19.8 7 17M17 7l2.8-2.8',
  blade: 'M12 2v14M8 16h8M12 16v6M9 5l3-3 3 3',
} as const

export type GlyphId = keyof typeof GLYPHS

const IDENTITY: Readonly<Record<string, KeywordIdentity>> = {
  'vida-combate': { glyph: 'heart', color: '#ff917c', family: 'defensa' },
  contraataque: { glyph: 'blade', color: '#8ed5ff', family: 'ataque' },
  impacto: { glyph: 'sword', color: '#ff866b', family: 'ataque' },
  curacion: { glyph: 'heart', color: '#89f0b2', family: 'defensa' },
  movimiento: { glyph: 'target', color: '#69dced', family: 'control' },
  robo: { glyph: 'card', color: '#a9beff', family: 'recurso' },
  invocacion: { glyph: 'star', color: '#f6cb7d', family: 'magia' },
  conjuro: { glyph: 'spiral', color: '#c39aff', family: 'magia' },
  baja: { glyph: 'skull', color: '#fb9b81', family: 'ataque' },
  maldicion: { glyph: 'eye', color: '#dca0f7', family: 'control' },

  esencia: { glyph: 'drop', color: '#7ad7ff', family: 'recurso' },
  ofrenda: { glyph: 'drop', color: '#ff6b5a', family: 'faccion' },
  juicio: { glyph: 'scale', color: '#f2c45a', family: 'faccion' },
  desafio: { glyph: 'sword', color: '#9fd3ff', family: 'faccion' },
  furor: { glyph: 'flame', color: '#ff7b3a', family: 'faccion' },
  renacer: { glyph: 'spiral', color: '#ffb36b', family: 'faccion' },
  avatar: { glyph: 'spiral', color: '#d9a2ff', family: 'faccion' },
  mandato: { glyph: 'eye', color: '#6fe3a8', family: 'faccion' },
  hybris: { glyph: 'bolt', color: '#ffd84a', family: 'faccion' },
  metamorfosis: { glyph: 'spiral', color: '#7ff0e0', family: 'faccion' },
  'sacrificio-sol': { glyph: 'skull', color: '#ff8f3a', family: 'faccion' },
  'cuenta-del-sol': { glyph: 'sun', color: '#ffc533', family: 'faccion' },
  contagio: { glyph: 'virus', color: '#9be15d', family: 'faccion' },
  horda: { glyph: 'horde', color: '#d6a46a', family: 'faccion' },
  ruinas: { glyph: 'wall', color: '#b9a88f', family: 'regla' },
  cobertura: { glyph: 'tower', color: '#a7c3a0', family: 'defensa' },
  agotar: { glyph: 'hourglass', color: '#c2b7a3', family: 'regla' },
  impulso: { glyph: 'bolt', color: '#ffe066', family: 'ataque' },
  congelar: { glyph: 'snow', color: '#9fe8ff', family: 'control' },
  perforar: { glyph: 'spear', color: '#ff9a62', family: 'ataque' },
  'vinculo-vital': { glyph: 'heart', color: '#ff7aa8', family: 'defensa' },
  aturdir: { glyph: 'star', color: '#ffd65a', family: 'control' },
  abrasar: { glyph: 'flame', color: '#ff5a2a', family: 'control' },
  adyacencia: { glyph: 'grid', color: '#c9c1ad', family: 'regla' },
  alcance: { glyph: 'target', color: '#ffb36b', family: 'ataque' },
  guardia: { glyph: 'tower', color: '#8fb8ff', family: 'defensa' },
  volador: { glyph: 'wing', color: '#cfe8ff', family: 'ataque' },
  escudo: { glyph: 'shield', color: '#6fd8ff', family: 'defensa' },
  unica: { glyph: 'crown', color: '#ffd36b', family: 'regla' },
  robar: { glyph: 'card', color: '#9ec9ff', family: 'recurso' },
  descartar: { glyph: 'card', color: '#d58cff', family: 'control' },
  nexo: { glyph: 'gem', color: '#ff8a7a', family: 'regla' },
  'golpe-veloz': { glyph: 'bolt', color: '#ffef7a', family: 'ataque' },
  petardazo: { glyph: 'bomb', color: '#ff8a1f', family: 'faccion' },
  chispa: { glyph: 'coin', color: '#ffcf4a', family: 'faccion' },
  formacion: { glyph: 'phalanx', color: '#e0b878', family: 'faccion' },
  descarga: { glyph: 'blade', color: '#ffb05a', family: 'faccion' },
  canto: { glyph: 'wave', color: '#6fc7c0', family: 'faccion' },
}

const FALLBACK: KeywordIdentity = { glyph: 'star', color: '#e9cf8a', family: 'regla' }

export const keywordIdentity = (id: string): KeywordIdentity => IDENTITY[id] ?? FALLBACK

/** Ids del glosario que aún no tienen identidad propia (la prueba exige cero). */
export const glossaryIdsWithoutIdentity = (): readonly string[] =>
  CARD_GLOSSARY.filter((entry) => !IDENTITY[entry.id]).map((entry) => entry.id)

export function KeywordGlyph({ glyph, className, title }: { glyph: GlyphId; className?: string; title?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={GLYPHS[glyph]} />
    </svg>
  )
}

/** Variables CSS de un término: color propio y una versión translúcida para fondos. */
export const keywordStyle = (id: string): CSSProperties => {
  const { color } = keywordIdentity(id)
  return { '--kw': color } as CSSProperties
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Términos del glosario que aparecen en un texto, en orden de aparición y
 * sin repetir. Lo usa el panel «Qué hace» de la carta en grande.
 */
export const glossaryEntriesIn = (text: string, entries: readonly GlossaryEntry[] = CARD_GLOSSARY): readonly GlossaryEntry[] => {
  const found: { entry: GlossaryEntry; index: number }[] = []
  for (const entry of entries) {
    let first = Infinity
    for (const term of entry.terms) {
      const match = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, 'iu').exec(text)
      if (match && match.index < first) first = match.index
    }
    if (first !== Infinity) found.push({ entry, index: first })
  }
  return found.sort((a, b) => a.index - b.index).map((item) => item.entry)
}
