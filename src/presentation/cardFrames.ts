// La mano y las fichas 3D comparten la ventana medida en el chasis original.
export const FIMBUL_FRAME = {
  asset: '/assets/cards/frames/fimbul-hielo-v1.webp',
  art: { x: .14, y: .155, width: .72, height: .385 },
  window: [[5, 5], [14, 13], [14, 6], [28, 2], [51, 0], [73, 2],
    [87, 6], [89, 13], [91, 5], [96, 8], [100, 15], [99, 24], [93, 79],
    [89, 86], [80, 100], [66, 97], [50, 96], [33, 97], [17, 100],
    [11, 89], [6, 83], [2, 27], [0, 17]],
} as const

export const FIMBUL_ART_CLIP = `polygon(${FIMBUL_FRAME.window.map(([x, y]) => `${x}% ${y}%`).join(',')})`

export const frameRuleSize = (length: number): number => length > 240 ? 3.1 : length > 170 ? 3.5 : length > 110 ? 3.9 : 4.3
