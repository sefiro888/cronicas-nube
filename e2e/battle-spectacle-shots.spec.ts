import { test, type Page } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch } from '../src/game'
import type { BoardPiece, CardDefinition, MatchState, PlayerId, Position } from '../src/game'
import type { useMatchStore as MatchStore } from '../src/store/match'

/**
 * Capturas del espectáculo de batalla: el poder de comandante con sus
 * unidades marcadas, la carta en grande con su panel «Qué hace» y un duelo
 * en que una mítica destruye a su rival.
 *
 *   RUN_SHOTS=1 SHOTS_DIR=/ruta npx playwright test e2e/battle-spectacle-shots.spec.ts
 *
 * Fuera del gate, como el resto de capturas.
 */
test.skip(!process.env.RUN_SHOTS, 'solo bajo demanda con RUN_SHOTS=1')

const DIR = process.env.SHOTS_DIR ?? 'e2e/__shots__'

const pieza = (instanceId: string, cardId: string, owner: PlayerId, position: Position): BoardPiece => {
  const card = CARD_BY_ID[cardId]!
  return {
    instanceId, cardId, owner, position,
    currentHealth: card.health ?? card.resistance ?? 1,
    attackModifier: 0, movedThisTurn: false, attackedThisTurn: false,
    enteredOnTurn: 0, statuses: [],
  }
}

const cards = Object.values(CARD_BY_ID)
const unitOf = (filter: (card: CardDefinition) => boolean): CardDefinition =>
  cards.find((card) => card.type === 'unit' && filter(card))!

const seed = async (page: Page, match: MatchState, deckId: string) => {
  await page.addInitScript(([state, version, deck]) => {
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({
      state: { match: state, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 },
      version,
    }))
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
      state: { muted: true, scenario: 'sanctuary', graphicsQuality: 'high', confirmEndTurn: false, presentationPace: 'cinematic', selectedDeckId: deck },
      version: 7,
    }))
  }, [match, 2, deckId] as const)
}

/**
 * Congela todas las animaciones CSS en el instante `ms` de su propia línea
 * de tiempo. El navegador de la nube no tiene GPU y cada captura tarda más
 * de un segundo: sin congelar, el golpe entero ocurre entre dos fotos.
 */
const freezeAt = async (page: Page, ms: number) => {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      animation.pause()
      animation.currentTime = time
    }
  }, ms)
}

/**
 * Reloj de la página parado desde el principio; solo avanza con `runFor`.
 * Pausar a mitad de partida no funcionaba: `pauseAt` salta hasta la hora que
 * se le da y la carta en grande ya había terminado al hacer la captura.
 */
const T0 = new Date('2026-11-01T10:00:00Z').getTime()
const frozenClock = async (page: Page) => {
  await page.clock.install({ time: T0 })
  await page.clock.pauseAt(T0 + 1000)
}

/** Avanza el reloj falso en pasos hasta que se cumpla la condición. */
const runUntil = async (page: Page, check: () => Promise<boolean>, step = 120, max = 60) => {
  for (let index = 0; index < max; index += 1) {
    if (await check()) return true
    await page.clock.runFor(step)
  }
  return check()
}

test('poder de comandante: escena y unidades marcadas', async ({ page }) => {
  test.setTimeout(420_000)
  const goblins = STARTER_DECKS.find((deck) => deck.faction === 'goblins')!
  const base = createMatch(goblins, STARTER_DECKS[1]!, 1311657807)
  const goblin = unitOf((card) => card.faction === 'goblins')
  const source = cards.find((card) => card.type === 'mana' && card.faction === 'goblins')
  const match: MatchState = {
    ...base,
    turn: 6,
    phase: 'main',
    activePlayer: 'player',
    board: [
      pieza('g1', goblin.id, 'player', { x: 2, y: 5 }),
      pieza('g2', goblin.id, 'player', { x: 3, y: 5 }),
      pieza('g3', goblin.id, 'player', { x: 4, y: 4 }),
      pieza('r1', unitOf((card) => card.faction !== 'goblins').id, 'ai', { x: 3, y: 2 }),
    ],
    players: {
      ...base.players,
      player: {
        ...base.players.player,
        resources: Array.from({ length: 5 }, (_, index) => ({
          instanceId: `src-${index}`, cardId: source?.id ?? 'fuente-furia', faction: 'goblins', exhausted: false,
        })),
      },
    },
  }
  await seed(page, match, goblins.id)
  await frozenClock(page)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/battle')
  await runUntil(page, async () => (await page.getByTestId('battle-board').count()) > 0, 500, 80)
  await page.clock.runFor(2500)
  await page.getByRole('button', { name: /¿Y si/i }).click()
  const spotlight = page.getByTestId('cast-spotlight')
  await runUntil(page, async () => (await spotlight.count()) > 0, 100)
  // Instantes de la presentación de 5 s: entrada del comandante, destello,
  // carta con su panel y final.
  for (const [index, ms] of [500, 1000, 1400, 2200, 3600].entries()) {
    await freezeAt(page, ms)
    await page.screenshot({ path: `${DIR}/poder-${index}.png` })
  }
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()))
  await spotlight.click()
  await page.clock.runFor(200)
  for (const [index, ms] of [300, 700, 1400].entries()) {
    await page.clock.runFor(150)
    await freezeAt(page, ms)
    await page.screenshot({ path: `${DIR}/poder-marcas-${index}.png` })
  }
})

test('duelo: una mítica destruye a una común', async ({ page }) => {
  test.setTimeout(420_000)
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 1311657807)
  const mythic = unitOf((card) => card.rarity === 'mythic' && (card.range ?? 1) <= 1 && (card.attack ?? 0) >= 4)
  const victim = unitOf((card) => card.rarity === 'common' && (card.health ?? 9) <= 2 && !card.keywords.includes('flying'))
  const match: MatchState = {
    ...base,
    turn: 6,
    phase: 'main',
    activePlayer: 'player',
    board: [
      pieza('mio', mythic.id, 'player', { x: 3, y: 4 }),
      pieza('presa', victim.id, 'ai', { x: 3, y: 3 }),
    ],
  }
  await seed(page, match, STARTER_DECKS[0]!.id)
  await frozenClock(page)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/battle')
  await runUntil(page, async () => (await page.getByTestId('battle-board').count()) > 0, 500, 80)
  await page.clock.runFor(2500)
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await page.clock.runFor(300)
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  const duel = page.getByTestId('combat-duel')
  await runUntil(page, async () => (await duel.count()) > 0, 100)
  await freezeAt(page, 600)
  await page.screenshot({ path: `${DIR}/duelo-0-intro.png` })
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()))
  // Hasta que la defensora haya caído: entonces están todas las capas del golpe.
  await runUntil(page, async () => (await page.locator('[data-role="defender"][data-destroyed]').count()) > 0)
  for (const [index, ms] of [80, 200, 320, 450, 650, 900].entries()) {
    await freezeAt(page, ms)
    await page.screenshot({ path: `${DIR}/duelo-${index + 1}.png` })
  }
})

/** Una unidad propia frente a una rival (o al Nexo) para fotografiar un estilo de ataque. */
const attackScene = async (page: Page, name: string, attacker: CardDefinition, distance: number, nexus = false) => {
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 1311657807)
  const victim = unitOf((card) => card.rarity === 'common' && (card.health ?? 0) >= 6 && !card.keywords.includes('flying'))
    ?? unitOf((card) => !card.keywords.includes('flying'))
  const from = { x: 3, y: nexus ? 0 : 4 }
  const match: MatchState = {
    ...base,
    turn: 6,
    phase: 'main',
    activePlayer: 'player',
    board: [
      pieza('mio', attacker.id, 'player', from),
      ...(nexus ? [] : [pieza('presa', victim.id, 'ai', { x: 3, y: 4 - distance })]),
    ],
  }
  await seed(page, match, STARTER_DECKS[0]!.id)
  await frozenClock(page)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/battle')
  await runUntil(page, async () => (await page.getByTestId('battle-board').count()) > 0, 500, 80)
  await page.clock.runFor(2500)
  // El ataque se despacha directamente al almacén (el servidor de Vite deja
  // importar el módulo): con el reloj congelado, el cursor de teclado no
  // siempre respondía y la captura salía sin ataque.
  await page.evaluate(async (toNexus) => {
    // Ruta en variable para que TypeScript no intente resolverla en Node.
    const path = '/src/store/match.ts'
    const { useMatchStore } = await import(/* @vite-ignore */ path) as { useMatchStore: typeof MatchStore }
    useMatchStore.getState().dispatch(toNexus
      ? { type: 'attack-nexus', playerId: 'player', attackerId: 'mio' }
      : { type: 'attack-piece', playerId: 'player', attackerId: 'mio', defenderId: 'presa' })
  }, nexus)
  for (let index = 0; index < 16; index += 1) {
    await page.clock.runFor(160)
    await page.screenshot({ path: `${DIR}/${name}-${String(index).padStart(2, '0')}.png` })
  }
}

const sub = (word: string, range: number) => unitOf((card) => (card.subtype ?? '').toLowerCase().includes(word) && (card.range ?? 1) === range)

test('estilos de ataque', async ({ page }) => {
  test.setTimeout(900_000)
  const kind = process.env.ATTACK_KIND ?? 'shot'
  const scenes: Record<string, [CardDefinition, number]> = {
    shot: [sub('arcabucero', 2), 2],
    bolt: [sub('hechicera', 2), 2],
    breath: [sub('dragón', 2), 2],
    arrow: [sub('cazador', 2), 2],
    crush: [sub('constructo', 1), 1],
    claw: [sub('bestia', 1), 1],
  }
  const [card, distance] = scenes[kind]!
  await attackScene(page, `ataque-${kind}`, card, distance)
})

test('ataque al Nexo', async ({ page }) => {
  test.setTimeout(600_000)
  await attackScene(page, 'nexo', sub('bestia', 1), 1, true)
})
