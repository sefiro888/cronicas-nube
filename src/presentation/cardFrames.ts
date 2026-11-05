import type { FactionId } from '../game'

type Point = readonly [x: number, y: number]
type Band = readonly [x: number, y: number, width: number]
type Panel = readonly [left: number, top: number, width: number, height: number]

export interface CardFrame {
  readonly id: string
  readonly asset: string
  readonly art: { x: number; y: number; width: number; height: number }
  readonly window: readonly Point[]
  readonly title: Band
  readonly cost: Point
  readonly ribbon: Band
  readonly rules: Panel
  readonly attack: Point
  readonly health: Point
  readonly titleInk?: string
  readonly ribbonInk?: string
  readonly costInk?: string
  readonly statInk?: string
}

// La mano y las fichas 3D comparten la ventana medida en el chasis original.
const FIMBUL_FRAME: CardFrame = {
  id: 'fimbul-hielo',
  title: [50, 12.2, 68],
  cost: [50, 5],
  ribbon: [50, 56.05, 52],
  rules: [15, 63.2, 70, 16],
  attack: [22.5, 86.8],
  health: [76, 86.8],
  asset: '/assets/cards/frames/fimbul-hielo-v1.webp',
  art: { x: .14, y: .155, width: .72, height: .385 },
  window: [[5, 5], [14, 13], [14, 6], [28, 2], [51, 0], [73, 2],
    [87, 6], [89, 13], [91, 5], [96, 8], [100, 15], [99, 24], [93, 79],
    [89, 86], [80, 100], [66, 97], [50, 96], [33, 97], [17, 100],
    [11, 89], [6, 83], [2, 27], [0, 17]],
} as const

const FRAMES: Partial<Record<FactionId, CardFrame>> = {
  fimbul: FIMBUL_FRAME,
  order: {
    id: 'order', asset: '/assets/cards/frames/order-v2.webp',
    art: { x: .1, y: 0.15, width: .8, height: 0.39 },
    window: [[5, 0], [95, 0], [100, 6], [100, 94], [95, 100], [5, 100], [0, 94], [0, 6]],
    title: [58, 8.5, 63], cost: [15, 9], ribbon: [50, 57.2, 75],
    rules: [13, 63, 74, 17.8], attack: [16, 89.2], health: [84, 89.2],
  },
  shadow: {
    id: 'shadow', asset: '/assets/cards/frames/shadow-v2.webp',
    art: { x: .1, y: 0.15, width: .8, height: 0.39 },
    window: [[5, 0], [95, 0], [100, 6], [100, 94], [95, 100], [5, 100], [0, 94], [0, 6]],
    title: [58, 8.5, 63], cost: [15, 9], ribbon: [50, 57.2, 75],
    rules: [13, 63, 74, 17.8], attack: [16, 89.2], health: [84, 89.2],
  },
  void: {
    id: 'void', asset: '/assets/cards/frames/void-v2.webp',
    art: { x: .1, y: 0.15, width: .8, height: 0.391 },
    window: [[5, 0], [95, 0], [100, 6], [100, 94], [95, 100], [5, 100], [0, 94], [0, 6]],
    title: [58, 8.5, 63], cost: [15, 9], ribbon: [50, 57.2, 75],
    rules: [13, 63, 74, 17.8], attack: [16, 89.2], health: [84, 89.2],
  },
  olimpo: {
    id: 'olimpo', asset: '/assets/cards/frames/olimpo-v2.webp',
    art: { x: .1, y: 0.151, width: .8, height: 0.387 },
    window: [[5, 0], [95, 0], [100, 6], [100, 94], [95, 100], [5, 100], [0, 94], [0, 6]],
    title: [58, 8.5, 63], cost: [15, 9], ribbon: [50, 57.2, 75],
    rules: [13, 63, 74, 17.8], attack: [16, 89.2], health: [84, 89.2],
  },
  nature: {
    id: 'nature', asset: '/assets/cards/frames/nature-v1.webp',
    art: { x: 0.1, y: 0.13, width: 0.8, height: 0.45 },
    window: [[12, 0], [87, 0], [100, 20], [95, 95], [66, 98], [29, 100], [3, 94], [0, 35]],
    title: [56, 8, 58], cost: [14, 9], ribbon: [50, 61, 69],
    rules: [13, 66, 74, 16], attack: [14, 90], health: [85, 90],
  },
  marea: {
    id: 'marea', asset: '/assets/cards/frames/marea-v1.webp',
    art: { x: 0.12, y: 0.15, width: 0.75, height: 0.43 },
    window: [[12, 0], [85, 0], [98, 19], [100, 54], [94, 86], [64, 99], [38, 100], [2, 84], [0, 32]],
    title: [52, 11, 53], cost: [13, 9.5], ribbon: [50, 59, 65],
    rules: [16, 65, 68, 15], attack: [14, 88], health: [84, 88],
    costInk: '#17120d',
    statInk: '#17120d',
  },
  duna: {
    id: 'duna', asset: '/assets/cards/frames/duna-v1.webp',
    art: { x: 0.16, y: 0.19, width: 0.68, height: 0.376 },
    window: [[0, 0], [100, 0], [100, 100], [0, 100]],
    title: [51, 14.8, 62], cost: [50, 6.4], ribbon: [50, 59.7, 62],
    rules: [17, 64, 66, 15], attack: [15, 90], health: [84, 90],
  },
  fury: {
    id: 'fury', asset: '/assets/cards/frames/fury-v1.webp',
    art: { x: 0.1, y: 0.13, width: 0.8, height: 0.413 },
    window: [[19, 0], [91, 0], [97, 5], [100, 14], [100, 84], [97, 94], [90, 98], [70, 100], [54, 96], [50, 88], [46, 96], [30, 100], [10, 98], [3, 94], [0, 84], [0, 18], [5, 10], [11, 6]],
    title: [58.5, 8.3, 62], cost: [14.8, 9.4], ribbon: [50, 57.7, 66],
    rules: [13, 62.5, 74, 16], attack: [14, 91], health: [86, 91],
  },
  sol: {
    id: 'sol', asset: '/assets/cards/frames/sol-v1.webp',
    art: { x: 0.13, y: 0.185, width: 0.74, height: 0.375 },
    window: [[0, 0], [100, 0], [100, 100], [0, 100]],
    title: [50, 15.2, 66], cost: [50, 6.5], ribbon: [50, 58.8, 66],
    rules: [14, 63, 72, 17], attack: [18, 90], health: [84, 90],
  },
  forja: {
    id: 'forja', asset: '/assets/cards/frames/forja-v1.webp',
    art: { x: 0.1, y: 0.145, width: 0.77, height: 0.4 },
    window: [[17, 0], [88, 0], [100, 22], [97, 58], [83, 84], [69, 100], [15, 96], [0, 78], [0, 34]],
    title: [56, 10.4, 55], cost: [16, 10.4], ribbon: [51, 57, 63],
    rules: [15, 62, 70, 16], attack: [14, 89.5], health: [87, 89.5],
    costInk: '#17120d',
  },
  goblins: {
    id: 'goblins', asset: '/assets/cards/frames/goblins-v1.webp',
    art: { x: 0.1, y: 0.14, width: 0.72, height: 0.42 },
    window: [[15, 0], [88, 0], [98, 12], [100, 78], [89, 100], [9, 100], [0, 83], [0, 20]],
    title: [53, 8.7, 60], cost: [12, 8.9], ribbon: [49, 58.7, 66],
    rules: [13, 63, 75, 19], attack: [12, 90], health: [89, 90],
    costInk: '#17120d',
  },
  kalevala: {
    id: 'kalevala', asset: '/assets/cards/frames/kalevala-v1.webp',
    art: { x: 0.11, y: 0.145, width: 0.76, height: 0.37 },
    window: [[8, 0], [92, 0], [100, 10], [100, 84], [92, 100], [8, 100], [0, 84], [0, 10]],
    title: [54, 8.9, 62], cost: [10, 9], ribbon: [50, 55, 67],
    rules: [13, 60, 74, 17], attack: [12, 89], health: [89, 89],
    ribbonInk: '#261a12',
  },
  tercios: {
    id: 'tercios', asset: '/assets/cards/frames/tercios-v1.webp',
    art: { x: 0.07, y: 0.14, width: 0.86, height: 0.37 },
    window: [[6, 0], [94, 0], [100, 10], [100, 90], [94, 100], [6, 100], [0, 90], [0, 10]],
    title: [56, 8.7, 64], cost: [14, 8.7], ribbon: [50, 54, 67],
    rules: [11, 59, 78, 17], attack: [14, 90], health: [85, 90],
  },
  bestiario: {
    id: 'bestiario', asset: '/assets/cards/frames/bestiario-v1.webp',
    art: { x: 0.08, y: 0.125, width: 0.84, height: 0.43 },
    window: [[14, 0], [85, 0], [94, 18], [100, 62], [97, 89], [88, 100], [12, 100], [3, 89], [0, 62], [6, 18]],
    title: [55, 7.7, 57], cost: [11, 7], ribbon: [50, 58, 61],
    rules: [14, 63, 72, 18], attack: [13, 91], health: [85, 91],
    titleInk: '#21170e', ribbonInk: '#261a12',
    costInk: '#17120d',
    statInk: '#17120d',
  },
  jade: {
    id: 'jade', asset: '/assets/cards/frames/jade-v1.webp',
    art: { x: 0.11, y: 0.155, width: 0.76, height: 0.37 },
    window: [[6, 0], [94, 0], [100, 11], [100, 89], [94, 100], [6, 100], [0, 89], [0, 11]],
    title: [50, 11.8, 69], cost: [50, 4.8], ribbon: [50, 56.5, 66],
    rules: [13, 61, 74, 18], attack: [13, 86.3], health: [87, 86.3],
  },
  samsara: {
    id: 'samsara', asset: '/assets/cards/frames/samsara-v1.webp',
    art: { x: 0.1, y: 0.173, width: 0.77, height: 0.363 },
    window: [[7, 0], [93, 0], [100, 15], [100, 88], [93, 100], [7, 100], [0, 88], [0, 15]],
    title: [50, 12.9, 64], cost: [50, 6.1], ribbon: [50, 56, 61],
    rules: [14, 61, 72, 14], attack: [16, 85], health: [84, 85],
  },
  plaga: {
    id: 'plaga', asset: '/assets/cards/frames/plaga-v1.webp',
    art: { x: 0.1, y: 0.157, width: 0.76, height: 0.402 },
    window: [[12, 0], [88, 0], [100, 14], [100, 68], [84, 96], [74, 100], [5, 100], [0, 88], [0, 20]],
    title: [53, 10, 60], cost: [14, 12.4], ribbon: [45, 59, 61],
    rules: [13, 63, 62, 17], attack: [11, 92], health: [85, 92],
  },
  arcane: {
    id: 'arcane', asset: '/assets/cards/frames/arcane-v1.webp',
    art: { x: 0.11, y: 0.135, width: 0.77, height: 0.42 },
    window: [[8, 0], [92, 0], [100, 11], [100, 88], [92, 98], [65, 92], [36, 94], [8, 100], [0, 89], [0, 11]],
    title: [53, 9, 60], cost: [13, 8.2], ribbon: [50, 56.7, 60],
    rules: [15, 62, 71, 19], attack: [17, 91], health: [84, 91],
    statInk: '#17120d',
  },
}

export const cardFrameFor = (faction: FactionId | undefined): CardFrame | undefined =>
  faction && FRAMES[faction]

export const artClipFor = (frame: CardFrame): string =>
  `polygon(${frame.window.map(([x, y]) => `${x}% ${y}%`).join(',')})`

export const frameRuleSize = (length: number): number => length > 240 ? 3.1 : length > 170 ? 3.5 : length > 110 ? 3.9 : 4.3
