import type { Achievement } from './achievements'

/**
 * Títulos y marcos de perfil. Cada uno se desbloquea con uno de los logros
 * que ya existían (ver achievements.ts); el jugador elige cuál lucir y se ve
 * junto a su comandante en la partida, en la presentación cara a cara y en
 * el álbum. «Aspirante» y el marco de bronce están siempre disponibles.
 */
export interface ProfileTitle {
  readonly id: string
  readonly label: string
  /** Logro que lo desbloquea; sin él, siempre disponible. */
  readonly achievementId?: string
}

export interface ProfileFrame {
  readonly id: string
  readonly label: string
  readonly achievementId?: string
}

export const PROFILE_TITLES: readonly ProfileTitle[] = [
  { id: 'aspirante', label: 'Aspirante' },
  { id: 'sangre-nueva', label: 'Sangre Nueva', achievementId: 'primera-sangre' },
  { id: 'veterano', label: 'Veterano del Nexo', achievementId: 'veterano' },
  { id: 'imparable', label: 'Imparable', achievementId: 'racha' },
  { id: 'relampago', label: 'El Relámpago', achievementId: 'relampago' },
  { id: 'trotamundos', label: 'Trotamundos', achievementId: 'explorador' },
  { id: 'devastador', label: 'Devastador', achievementId: 'devastacion' },
  { id: 'incansable', label: 'Incansable', achievementId: 'guerra-desgaste' },
  { id: 'curtido', label: 'Curtido en Mil Batallas', achievementId: 'curtido' },
  { id: 'duelista', label: 'Duelista', achievementId: 'duelista' },
  { id: 'cronista', label: 'Cronista del Nexo', achievementId: 'cronista' },
  { id: 'leyenda', label: 'Leyenda Viva', achievementId: 'racha-legendaria' },
  { id: 'maestro', label: 'Maestro del Nexo', achievementId: 'maestro' },
]

export const PROFILE_FRAMES: readonly ProfileFrame[] = [
  { id: 'bronce', label: 'Bronce' },
  { id: 'plata', label: 'Plata', achievementId: 'veterano' },
  { id: 'llamas', label: 'Llamas', achievementId: 'racha' },
  { id: 'tormenta', label: 'Tormenta', achievementId: 'relampago' },
  { id: 'runas', label: 'Runas', achievementId: 'explorador' },
  { id: 'acero', label: 'Acero', achievementId: 'curtido' },
  { id: 'oro', label: 'Oro', achievementId: 'cronista' },
  { id: 'prisma', label: 'Prisma', achievementId: 'racha-legendaria' },
  { id: 'real', label: 'Real', achievementId: 'maestro' },
]

const isUnlocked = (achievementId: string | undefined, achievements: readonly Achievement[]) =>
  !achievementId || achievements.some((achievement) => achievement.id === achievementId && achievement.unlocked)

export const unlockedTitles = (achievements: readonly Achievement[]) => PROFILE_TITLES.filter((title) => isUnlocked(title.achievementId, achievements))
export const unlockedFrames = (achievements: readonly Achievement[]) => PROFILE_FRAMES.filter((frame) => isUnlocked(frame.achievementId, achievements))

/** El título elegido si sigue desbloqueado; si no, el primero disponible. */
export const activeTitle = (titleId: string | undefined, achievements: readonly Achievement[]): ProfileTitle =>
  unlockedTitles(achievements).find((title) => title.id === titleId) ?? PROFILE_TITLES[0]!

export const activeFrame = (frameId: string | undefined, achievements: readonly Achievement[]): ProfileFrame =>
  unlockedFrames(achievements).find((frame) => frame.id === frameId) ?? PROFILE_FRAMES[0]!

export const achievementName = (achievementId: string | undefined, achievements: readonly Achievement[]) =>
  achievements.find((achievement) => achievement.id === achievementId)?.name

/** Nivel del emblema de racha: crece a las 1, 3, 5 y 10 victorias seguidas. */
export const streakLevel = (streak: number): 0 | 1 | 2 | 3 | 4 =>
  streak >= 10 ? 4 : streak >= 5 ? 3 : streak >= 3 ? 2 : streak >= 1 ? 1 : 0
