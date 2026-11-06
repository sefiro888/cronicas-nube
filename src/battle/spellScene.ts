import type { AnimationEvent, FactionId } from '../game'
import type { CastImpact, ImpactTone } from './castImpact'
import { gridToWorld, NEXUS_WORLD } from './grid/gridCoordinates'

type BoardPoint = readonly [number, number]
export interface SpellSite {
  readonly at: BoardPoint
  readonly tone: ImpactTone
  readonly nexus?: boolean
}

export const spellChoreography = (event: AnimationEvent, impact?: CastImpact) => {
  const origin = event.from ? gridToWorld(event.from) : NEXUS_WORLD[`${event.actorId}-nexus`]
  if (!origin) return undefined
  const sites = new Map<string, SpellSite>()
  const routes: { from: BoardPoint; to: BoardPoint }[] = []
  for (const piece of impact?.pieces ?? []) {
    const at = gridToWorld(piece.movedFrom ?? piece.position)
    const tone = (['harm', 'control', 'boon', 'neutral'] as const).find((tone) => piece.changes.some((change) => change.tone === tone)) ?? 'neutral'
    const key = at.join(',')
    if (!sites.has(key) || tone === 'harm') sites.set(key, { at, tone })
    if (piece.movedFrom) routes.push({ from: at, to: gridToWorld(piece.position) })
  }
  for (const owner of ['player', 'ai'] as const) {
    const delta = impact?.nexus[owner]
    const at = NEXUS_WORLD[`${owner}-nexus`]!
    if (delta) sites.set(at.join(','), { at, tone: delta < 0 ? 'harm' : 'boon', nexus: true })
  }
  // Con el saldo resuelto, una selección que no cambió nada no recibe un impacto ficticio.
  if (!impact) {
    const nexus = event.targetId ? NEXUS_WORLD[event.targetId] : undefined
    const at = event.to ? gridToWorld(event.to) : nexus
    if (at) sites.set(at.join(','), { at, tone: 'neutral', nexus: Boolean(nexus) })
  }
  const ordered = [...sites.values()].sort((a, b) =>
    Math.hypot(a.at[0] - origin[0], a.at[1] - origin[1]) - Math.hypot(b.at[0] - origin[0], b.at[1] - origin[1]))
  const aimed = event.to ? gridToWorld(event.to) : undefined
  return { origin, sites: ordered, routes, primary: (aimed && sites.get(aimed.join(','))?.at) ?? ordered[0]?.at }
}

/** Metal, luz, geometría del grabado y familia de material. */
export const SPELL_INSCRIPTIONS = {
  fury: ['#ff4c21', '#ffcf62', 5, 0, 1],
  arcane: ['#5478ff', '#d4ddff', 8, 1, 2],
  nature: ['#68d044', '#edff9b', 7, 2, 3],
  order: ['#ffcc55', '#fff7d2', 4, 1, 4],
  shadow: ['#9f42df', '#fca4e5', 3, 2, 5],
  void: ['#9430ff', '#b7a4ff', 7, 0, 6],
  duna: ['#e69a32', '#fff4b4', 12, 1, 7],
  fimbul: ['#51aaff', '#d7ffff', 6, 0, 8],
  samsara: ['#ff7050', '#ffe2a4', 8, 2, 9],
  jade: ['#30d798', '#ffe6a1', 4, 1, 10],
  olimpo: ['#708aff', '#fff1b3', 6, 1, 11],
  sol: ['#ff912a', '#fff498', 16, 1, 12],
  bestiario: ['#b9da66', '#ffe9ad', 3, 0, 13],
  plaga: ['#9dce28', '#ddff83', 5, 2, 14],
  marea: ['#21c9ce', '#c6fff0', 5, 2, 15],
  forja: ['#ff7134', '#ffe0a2', 8, 0, 16],
  goblins: ['#c1ef36', '#ffdb64', 10, 0, 17],
  tercios: ['#f25241', '#ffe39a', 4, 0, 18],
  kalevala: ['#6fe7e6', '#ffe5ae', 9, 2, 19],
} as const satisfies Record<FactionId, readonly [string, string, number, number, number]>
