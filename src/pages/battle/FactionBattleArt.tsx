import type { FactionId } from '../../game'
import type { AttackKind } from '../../battle/attackStyle'
import styles from './FactionBattleArt.module.css'

interface Signature {
  readonly name: string
  readonly ink: string
  readonly light: string
  readonly motif: string
  readonly trail: string
  readonly rhythm: 'surge' | 'strike' | 'assemble' | 'spiral'
}

// Trazos originales en una cuadrícula común. Cada mundo tiene su propio
// relieve, recorrido y cadencia, además de los colores del marco.
const SIGNATURES = {
  fury: {
    name: 'Escoria ardiente', ink: '#fa6129', light: '#ffe299', rhythm: 'surge',
    motif: 'M24 53 13 36 24 40 30 17 40 32 47 12 55 44 47 54Z M30 50 37 39 44 49',
    trail: 'M4 35 28 40 35 30 67 43 90 27 120 38 146 20 174 35 196 34',
  },
  arcane: {
    name: 'Cristal arcano', ink: '#67b9ff', light: '#dbfaff', rhythm: 'assemble',
    motif: 'M35 6 60 35 35 62 10 35Z M35 6V62 M10 35H60 M23 35 35 20 47 35 35 50Z',
    trail: 'M4 34 38 34 56 18 83 18 102 34 121 50 148 50 166 34 196 34',
  },
  nature: {
    name: 'Savia y raíces', ink: '#88cc54', light: '#e8ffa7', rhythm: 'surge',
    motif: 'M16 54Q40 47 53 13Q30 12 20 31Q15 43 26 46 M27 43 44 25 M31 38 30 26 M36 34 46 35',
    trail: 'M4 37Q22 62 46 34T92 34T140 33T196 34 M73 44Q88 50 96 60 M126 42Q141 53 152 54',
  },
  order: {
    name: 'Vitral solar', ink: '#d7b460', light: '#fff1bc', rhythm: 'assemble',
    motif: 'M35 9 54 18V37Q51 49 35 60Q19 49 16 37V18Z M35 14V54 M20 29H50 M22 45 48 21 M22 21 48 45',
    trail: 'M4 34H196 M27 34 42 23 57 34 42 45Z M92 34 107 23 122 34 107 45Z M153 34 168 23 183 34 168 45Z',
  },
  shadow: {
    name: 'Velo de tinta', ink: '#a67adb', light: '#f2d7ff', rhythm: 'spiral',
    motif: 'M46 12Q19 16 22 37Q25 57 53 49Q43 62 28 57Q10 52 12 34Q13 15 34 10Z M36 31Q44 25 56 33Q44 40 36 31Z',
    trail: 'M4 36Q34 14 57 42T113 38T165 27Q183 26 196 34 M14 46Q36 33 51 49T87 49',
  },
  void: {
    name: 'Fractura del espacio', ink: '#ac72fb', light: '#efddff', rhythm: 'strike',
    motif: 'M24 14Q9 35 24 56 M31 9Q17 35 31 61 M46 9Q60 35 46 61 M53 14Q68 35 53 56 M31 40 44 28',
    trail: 'M4 34H57 M58 51Q41 34 58 17 M63 54Q45 34 63 14 M139 51Q156 34 139 17 M134 54Q152 34 134 14 M141 34H196',
  },
  duna: {
    name: 'Tribunal de arena', ink: '#d59a4a', light: '#ffe8a6', rhythm: 'surge',
    motif: 'M35 11V53 M17 57H53 M13 23H57 M20 23 11 43H29Z M50 23 41 43H59Z',
    trail: 'M4 41Q44 24 80 36T149 35T196 34 M33 42Q68 32 108 44T172 43 M82 51H141',
  },
  fimbul: {
    name: 'Viento de runas', ink: '#66c9ef', light: '#effbff', rhythm: 'strike',
    motif: 'M35 8V61 M12 22 58 48 M12 48 58 22 M28 14 35 21 42 14 M28 55 35 48 42 55 M15 30 24 29 22 20 M48 50 46 41 55 40',
    trail: 'M4 43 37 42 58 24 85 36 109 19 134 41 164 24 196 34 M58 24 53 12 M134 41 132 56 M164 24 174 14',
  },
  samsara: {
    name: 'Rueda de brasas', ink: '#ee9a48', light: '#ffdf9e', rhythm: 'spiral',
    motif: 'M12 35A23 23 0 1 1 35 58A17 17 0 1 1 52 41A11 11 0 1 1 41 30 M35 8V14 M35 56V62 M8 35H14 M56 35H62',
    trail: 'M4 34Q34 3 64 34T124 34T184 34L196 34 M54 34a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M114 34a10 10 0 1 0 20 0a10 10 0 1 0 -20 0',
  },
  jade: {
    name: 'Caligrafía imperial', ink: '#58cba2', light: '#f5efab', rhythm: 'assemble',
    motif: 'M12 12H58V58H12Z M19 19H51V51H19Z M26 26H44V35H33V44H26Z M38 44H45',
    trail: 'M4 40Q40 14 75 31T134 32Q155 25 167 34H196 M153 14H183V53H153Z M161 23H175V44H161Z',
  },
  olimpo: {
    name: 'Rayo y laurel', ink: '#e6bc59', light: '#fffae0', rhythm: 'strike',
    motif: 'M39 8 22 35H34L29 59 50 30H38Z M19 48Q10 38 13 25 M50 51Q61 42 58 25 M18 41 10 39 M53 43 62 38',
    trail: 'M4 34 39 31 52 10 69 47 90 23 114 40 137 14 152 38 171 26 196 34',
  },
  sol: {
    name: 'Obsidiana solar', ink: '#f4ae35', light: '#fff0ab', rhythm: 'assemble',
    motif: 'M35 7 40 18 50 12 51 24 63 24 56 35 63 46 51 46 50 58 40 52 35 63 30 52 20 58 19 46 7 46 14 35 7 24 19 24 20 12 30 18Z M35 24 46 35 35 46 24 35Z',
    trail: 'M4 34 52 18 74 34 52 50Z M74 34 124 19 146 34 124 49Z M146 34 179 24 196 34 179 44Z',
  },
  bestiario: {
    name: 'Huella primigenia', ink: '#a6bc66', light: '#ffe4a4', rhythm: 'surge',
    motif: 'M16 49Q18 35 35 29Q52 35 54 49Q50 56 35 49Q20 56 16 49Z M16 32 12 24 17 20 23 28Z M26 22 25 13 31 11 35 19Z M38 19 42 11 48 14 46 23Z M49 28 55 20 60 25 55 33Z',
    trail: 'M4 46Q41 17 81 25T148 26L196 34 M24 56Q65 27 105 35T185 40 M46 61Q84 42 115 48T174 49',
  },
  plaga: {
    name: 'Esporas de contagio', ink: '#9db848', light: '#e4efa1', rhythm: 'spiral',
    motif: 'M35 26a9 9 0 1 0 .1 0 M35 26V12 M44 31 58 23 M44 40 58 48 M35 44V58 M27 40 12 48 M27 31 12 23 M31 12h8 M55 20l6 6 M55 51l6 -6',
    trail: 'M4 41Q30 24 62 42T125 41T196 34 M39 32l9-15 11 8 M83 44l12 14 13-8 M141 32l9-15 14 7',
  },
  marea: {
    name: 'Ciclo de las aguas', ink: '#54cfc6', light: '#c4fff1', rhythm: 'surge',
    motif: 'M9 44Q24 46 30 26Q42 7 58 26Q42 24 44 35Q46 43 62 42 M9 51Q21 59 35 51T63 51',
    trail: 'M4 44Q26 46 44 27T83 23Q74 31 95 37T145 35Q166 22 196 34 M9 51Q41 52 72 47T131 48T186 45',
  },
  forja: {
    name: 'Presión de caldera', ink: '#e58943', light: '#ffdfab', rhythm: 'assemble',
    motif: 'M28 10H42L44 19 51 17 60 27 55 35 60 43 51 53 44 51 42 60H28L26 51 19 53 10 43 15 35 10 27 19 17 26 19Z M35 25a10 10 0 1 0 .1 0',
    trail: 'M4 34H196 M22 20H50V48H22Z M71 20H99V48H71Z M120 20H148V48H120Z M160 28H183V40H160Z',
  },
  goblins: {
    name: 'Mecha de chatarra', ink: '#f6bc42', light: '#fff7c7', rhythm: 'strike',
    motif: 'M35 9 39 25 54 16 47 31 64 35 47 40 55 55 40 47 35 63 30 47 15 55 23 40 6 35 23 30 15 15 30 24Z',
    trail: 'M4 34Q24 12 46 37T88 38Q101 16 117 32T151 33L163 20 166 34 182 26 176 37 196 34',
  },
  tercios: {
    name: 'Pica y pólvora', ink: '#caa47b', light: '#ffedcb', rhythm: 'strike',
    motif: 'M13 54 53 14 M45 15 59 9 54 23 M19 58 56 21 M21 28H48 M22 35H41',
    trail: 'M4 35H196 M24 28H115 M36 43H148 M163 24 196 35 163 46 M40 21Q53 15 64 21',
  },
  kalevala: {
    name: 'Canto grabado', ink: '#d8ad63', light: '#ffedbd', rhythm: 'spiral',
    motif: 'M19 53V16L30 25 19 35 M37 54V13 M37 26 51 17 M37 43 51 34 M47 53 57 45',
    trail: 'M4 34Q30 7 56 34T108 34T160 34Q178 22 196 34 M43 18V47L55 40 M94 20V48L106 42 M147 18V46L159 39',
  },
} as const satisfies Record<FactionId, Signature>

const ATTACK_TRACES: Record<AttackKind, string> = {
  slash: 'M72 60 132 7 M95 60 145 15',
  claw: 'M70 51 118 10 M87 59 135 18 M106 64 151 27',
  crush: 'M75 52 88 42 102 54 119 40 136 53',
  spectral: 'M54 47Q83 6 108 39T163 37',
  arrow: 'M5 46Q102 -8 192 32l-19 -1 8 10',
  shot: 'M5 28 194 33 M39 39 188 35',
  bolt: 'M9 31 64 24 80 42 116 26 143 39 193 34',
  breath: 'M6 34Q75 22 188 14 M6 34Q95 51 188 54',
  barbs: 'M20 21Q110 10 190 33 M20 49Q110 61 190 35',
  orb: 'M4 34Q83 9 185 34 M185 34a8 8 0 1 0 .1 0',
}

export const factionBattleSignature = (faction: FactionId) => SIGNATURES[faction]

export function FactionBattleArt({ faction, kind, attack, reverse, reducedMotion }: {
  readonly faction: FactionId
  readonly kind: 'seal' | 'strike' | 'spell'
  readonly attack?: AttackKind
  readonly reverse?: boolean
  readonly reducedMotion?: boolean
}) {
  const art = factionBattleSignature(faction)
  return (
    <svg className={styles.art} data-kind={kind} data-faction-art={faction} data-rhythm={art.rhythm}
      data-reverse={reverse || undefined} data-static={reducedMotion || undefined}
      viewBox={kind === 'seal' ? '0 0 70 70' : '0 0 200 68'} preserveAspectRatio={kind === 'seal' ? 'xMidYMid meet' : 'none'}
      style={{ color: art.light, filter: `drop-shadow(0 0 5px ${art.ink})` }} aria-hidden="true">
      {kind === 'seal' ? <path d={art.motif} /> : (
        <>
          <path className={styles.trail} d={art.trail} pathLength="1" />
          {attack && <path className={styles.trace} d={ATTACK_TRACES[attack]} pathLength="1" />}
          <path className={styles.contact} d={art.motif} transform="translate(170 17) scale(.48)" />
        </>
      )}
    </svg>
  )
}
