import type { CardDefinition } from '../game'
import { frameRuleSize, type CardFrame } from '../presentation/cardFrames'

const TYPE_NAMES = { unit: 'Unidad', structure: 'Estructura', mana: 'Esencia', instant: 'Hechizo inmediato' } as const

function fittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, min = size * .6) {
  let fontSize = size
  do { ctx.font = `bold ${fontSize}px Georgia`; fontSize -= 1 } while (ctx.measureText(text).width > width && fontSize >= min)
  ctx.fillText(text, x, y, width)
}

/** Se compone al cambiar datos visibles, nunca en cada fotograma. Las cifras
 * reciben el valor real de la pieza para no imprimir su Vida inicial al dañarse. */
export function drawCardFace(canvas: HTMLCanvasElement, frame: HTMLImageElement, art: HTMLImageElement, layout: CardFrame,
  card: CardDefinition, attack: number | undefined, health: number | undefined): void {
  canvas.width = 512
  canvas.height = 768
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width, h = canvas.height
  ctx.drawImage(frame, 0, 0, w, h)
  const window = layout.art
  const x = window.x * w, y = window.y * h, width = window.width * w, height = window.height * h
  ctx.save()
  ctx.beginPath()
  layout.window.forEach(([px, py], index) => {
    const point: [number, number] = [x + px / 100 * width, y + py / 100 * height]
    if (index === 0) ctx.moveTo(...point); else ctx.lineTo(...point)
  })
  ctx.closePath()
  ctx.clip()
  const iw = art.naturalWidth, ih = art.naturalHeight
  const scale = Math.max(width / iw, height / ih)
  ctx.drawImage(art, x - (iw * scale - width) / 2, y - (ih * scale - height) * .35, iw * scale, ih * scale)
  ctx.restore()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = layout.titleInk ?? '#fff0d2'
  ctx.shadowColor = '#090300'
  ctx.shadowBlur = 3
  fittedText(ctx, card.name, w * layout.title[0] / 100, h * layout.title[1] / 100, w * (layout.title[2] - 10) / 100, 24)
  const colored = Object.values(card.cost.colored).reduce((sum, value) => sum + (value ?? 0), 0)
  const [costX, costY] = layout.cost
  ctx.fillStyle = layout.costInk ?? '#fff0d2'
  ctx.font = 'bold 37px Georgia'
  ctx.fillText(String(card.cost.generic + colored), w * costX / 100, h * (costY - .7) / 100)
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText([colored ? `${colored} C` : '', card.cost.generic ? `${card.cost.generic} G` : ''].filter(Boolean).join(' · '), w * costX / 100, h * (costY + 1.5) / 100)
  ctx.fillStyle = layout.ribbonInk ?? '#fff0d2'
  fittedText(ctx, `${TYPE_NAMES[card.type]}${card.subtype ? ` — ${card.subtype}` : ''}`, w * layout.ribbon[0] / 100, h * layout.ribbon[1] / 100, w * layout.ribbon[2] / 100, 17)
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#2c1b0e'
  const [rulesX, rulesY, rulesWidth, rulesHeight] = layout.rules
  let size = w * frameRuleSize(card.rules.length * 70 / rulesWidth) / 100
  let lines: string[]
  do {
    ctx.font = `600 ${size}px sans-serif`
    lines = []
    let line = ''
    for (const word of card.rules.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > w * rulesWidth / 100) { lines.push(line); line = word } else line = candidate
    }
    if (line) lines.push(line)
    if (lines.length * size * 1.21 <= h * rulesHeight / 100) break
    size -= .5
  } while (size > 10)
  lines.forEach((line, index) => ctx.fillText(line, w * rulesX / 100, h * rulesY / 100 + index * size * 1.21))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = layout.statInk ?? '#fff2d7'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 3
  for (const [value, label, [cx, cy]] of [[attack, 'ATQ', layout.attack], [health, card.type === 'structure' ? 'RES' : 'VID', layout.health]] as const) {
    if (value === undefined) continue
    ctx.font = 'bold 44px Georgia'
    ctx.fillText(String(value), w * cx / 100, h * (cy - 1) / 100)
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText(label, w * cx / 100, h * (cy + 2) / 100)
  }
}
