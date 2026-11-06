import { mkdir, writeFile } from 'node:fs/promises'
import type { RootState } from '@react-three/fiber'
import type { Mesh, ShaderMaterial } from 'three'
import { expect, test, type Page } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type BoardPiece, type FactionId, type GameAction, type MatchState } from '../src/game'
import type { useMatchStore as MatchStoreHook } from '../src/store/match'
import { fiberModuleUrl } from './helpers/cameraSnapshot'
import { matchStoreUrl } from './helpers/matchStoreUrl'

const deck = (faction: FactionId) => STARTER_DECKS.find((candidate) => candidate.faction === faction)!
const piece = (id: string, cardId: string, owner: BoardPiece['owner'], y: number, statuses: BoardPiece['statuses'] = []): BoardPiece => ({
  instanceId: id, cardId, owner, position: { x: 3, y }, currentHealth: CARD_BY_ID[cardId]!.health!,
  attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses,
})

async function openBattle(page: Page, match: MatchState, own: FactionId, rival: FactionId) {
  await page.addInitScript(([match, ownDeck, rivalDeck]) => {
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
      selectedDeckId: ownDeck, opponentDeckId: rivalDeck, muted: true, graphicsQuality: 'medium', presentationPace: 'cinematic',
    }, version: 7 }))
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
      match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
    }, version: 2 }))
  }, [match, deck(own).id, deck(rival).id] as const)
  const module = matchStoreUrl(page)
  await page.goto('/battle')
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25000 })
  return await module
}

async function waitForRenderedBoard(page: Page, url: string) {
  await expect.poll(() => page.evaluate(async (url) => {
    const { _roots } = await import(/* @vite-ignore */ url) as {
      _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }>
    }
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
    const state = _roots.get(canvas)?.store.getState()
    return Boolean(state?.scene.getObjectByName('battle-view') && state.gl.info.memory.textures > 8)
  }, url), { timeout: 25000 }).toBe(true)
}

const send = (page: Page, module: string, action: GameAction) => page.evaluate(async ({ module, action }) => {
  const { useMatchStore } = await import(/* @vite-ignore */ module) as { useMatchStore: typeof MatchStoreHook }
  const ok = useMatchStore.getState().dispatch(action)
  return { ok, message: useMatchStore.getState().message }
}, { module, action })

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`Mandato, Cuenta del Sol y lanzamiento de Jade a ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const base = createMatch(deck('jade'), deck('sol'), 781)
    const fiber = fiberModuleUrl(page)
    const module = await openBattle(page, {
      ...base, turn: 4, phase: 'main', activePlayer: 'player', mandate: 'ai',
      players: {
        ...base.players,
        player: {
          ...base.players.player, mulliganTaken: true, hand: [{ cardId: 'mandato-revocado', instanceId: 'sello' }],
          resources: Array.from({ length: 4 }, (_, i) => ({ instanceId: `jade-${i}`, cardId: 'fuente-jade', faction: 'jade', exhausted: false })),
        },
        ai: { ...base.players.ai, sunCount: 4, mulliganTaken: true },
      },
    }, 'jade', 'sol')
    const powers = page.getByRole('region', { name: 'Poderes de facción' })
    await expect(powers).toContainText('MandatoRival')
    await expect(powers).toContainText('Cuenta del Sol4')
    const url = await fiber
    await expect.poll(() => page.evaluate(async (url) => {
      const { _roots } = await import(/* @vite-ignore */ url)
      const canvas = document.querySelector('[data-testid="battle-board"] canvas')
      const scene = _roots.get(canvas)?.store.getState().scene
      let panorama = false
      scene?.traverse((mesh: { material?: { map?: { image?: unknown } } }) => {
        const image = mesh.material?.map?.image
        if (image instanceof HTMLImageElement && image.src.includes('/scenarios/')) panorama = true
      })
      return panorama
    }, url), { timeout: 25000 }).toBe(true)
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/poderes-${width}.png` })
    const result = await send(page, module, { type: 'play-card', playerId: 'player', cardInstanceId: 'sello', target: { kind: 'none' } })
    expect(result.ok, result.message).toBe(true)
    await expect(powers).toContainText('MandatoTuyo')
    const cast = page.getByTestId('cast-spotlight')
    await expect(cast).toContainText('Mandato · Tuyo', { timeout: 15000 })
    await expect(cast.locator('[data-faction-art="jade"][data-kind="spell"]')).toBeVisible()
    await expect(cast.locator('section').filter({ hasText: 'Caligrafía imperial' })).toHaveCSS('opacity', '1')
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/hechizo-jade-${width}.png` })
  })

  test(`duelo de Fimbul y Duna con protección y Vida a ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    test.setTimeout(90000)
    const base = createMatch(deck('fimbul'), deck('duna'), 921)
    const module = await openBattle(page, {
      ...base, turn: 4, phase: 'main', activePlayer: 'player', terrain: [],
      players: {
        player: { ...base.players.player, mulliganTaken: true, hand: [] },
        ai: { ...base.players.ai, mulliganTaken: true },
      },
      board: [
        piece('atacante', 'huscarle-del-rey', 'player', 4),
        piece('defensora', 'devoradora-del-inframundo', 'ai', 3, [{ kind: 'shielded', amount: 2 }]),
      ],
    }, 'fimbul', 'duna')
    const result = await send(page, module, { type: 'attack-piece', playerId: 'player', attackerId: 'atacante', defenderId: 'defensora' })
    expect(result.ok, result.message).toBe(true)
    const duel = page.getByTestId('combat-duel')
    await expect(duel).toContainText('Desafío', { timeout: 15000 })
    await expect(duel.locator('[data-faction-art="fimbul"][data-kind="strike"]')).toBeVisible({ timeout: 15000 })
    const defender = duel.locator('[data-role="defender"]')
    await expect(defender).toContainText('2 absorbidos', { timeout: 20000 })
    await expect(defender.getByTestId('battle-plate').filter({ hasText: 'Absorbe 2 de daño' })).toHaveAttribute('data-active', 'true')
    await expect(defender).toContainText('Vida 5 → 3', { timeout: 20000 })
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/duelo-${width}.png` })
  })
}
test('el remate deja visibles los resultados y las habilidades a 1366 × 768', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  const base = createMatch(deck('jade'), deck('tercios'), 921)
  const fiber = fiberModuleUrl(page)
  const module = await openBattle(page, {
    ...base, turn: 4, phase: 'main', activePlayer: 'player', terrain: [],
    players: {
      player: { ...base.players.player, mulliganTaken: true, hand: [{ cardId: 'fuegos-de-artificio', instanceId: 'en-mano' }] },
      ai: { ...base.players.ai, mulliganTaken: true },
    },
    board: [
      { ...piece('primera', 'sabueso-brasa', 'player', 4), position: { x: 1, y: 4 } },
      { ...piece('primera-rival', 'golem-azur', 'ai', 3), position: { x: 1, y: 3 } },
      piece('atacante', 'tigre-blanco-del-oeste', 'player', 4),
      { ...piece('defensor', 'rodelero', 'ai', 3), currentHealth: 2 },
    ],
  }, 'jade', 'tercios')
  const url = await fiber
  await waitForRenderedBoard(page, url)
  const first = await send(page, module, { type: 'attack-piece', playerId: 'player', attackerId: 'primera', defenderId: 'primera-rival' })
  expect(first.ok, first.message).toBe(true)
  await expect(page.getByTestId('combat-duel')).toBeVisible()
  await expect(page.getByTestId('combat-duel')).toBeHidden({ timeout: 20000 })
  const result = await send(page, module, { type: 'attack-piece', playerId: 'player', attackerId: 'atacante', defenderId: 'defensor' })
  expect(result.ok, result.message).toBe(true)
  const duel = page.getByTestId('combat-duel')
  await expect(duel).toHaveAttribute('data-finisher', 'true', { timeout: 20000 })
  await expect(duel.getByRole('status', { name: 'Combo por 2' })).toBeVisible()
  const ability = duel.getByTestId('battle-plate').filter({ hasText: 'Golpe veloz' })
  await expect(ability).toBeVisible()
  await expect(duel.locator('[data-role="defender"]')).toContainText('Destruida', { timeout: 20000 })
  await expect(duel.locator('[data-role="attacker"]')).toContainText('¡Contraataque!')
  const fits = await ability.evaluate((plate) => {
    const arena = plate.closest('[data-testid="combat-duel"]')!.getBoundingClientRect()
    const bounds = plate.getBoundingClientRect()
    const list = plate.closest('ul')!.getBoundingClientRect()
    return bounds.top >= arena.top && bounds.bottom <= arena.bottom && bounds.bottom <= list.bottom
      && !getComputedStyle(plate, '::before').backgroundImage.includes('repeating-')
  })
  expect(fits).toBe(true)
  await page.screenshot({ path: 'tools/captures/duelos-y-poderes/remate-legible-1366.png' })
})

test('Olimpo y Marea muestran el riesgo de cerrar turno y la fase pública', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  const base = createMatch(deck('olimpo'), deck('marea'), 129)
  await openBattle(page, {
    ...base, turn: 4, phase: 'main', activePlayer: 'player',
    players: {
      player: { ...base.players.player, mulliganTaken: true, hybris: 6 },
      ai: { ...base.players.ai, mulliganTaken: true },
    },
  }, 'olimpo', 'marea')
  const powers = page.getByRole('region', { name: 'Poderes de facción' })
  await expect(powers).toContainText('Pleamar→ Bajamar')
  await expect(powers).toContainText('Hybris6')
  await expect(page.getByText('Hybris · perderías 3 de Vida al cerrar el turno')).toBeVisible()
})
test('el duelo contra el Nexo conserva su Vida de apertura y muestra su pérdida real', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  const base = createMatch(deck('fimbul'), deck('duna'), 761)
  const fiber = fiberModuleUrl(page)
  const module = await openBattle(page, {
    ...base, turn: 4, phase: 'main', activePlayer: 'player', terrain: [],
    board: [piece('atacante', 'huscarle-del-rey', 'player', 0)],
    players: {
      player: { ...base.players.player, mulliganTaken: true },
      ai: { ...base.players.ai, nexusHealth: 22, mulliganTaken: true },
    },
  }, 'fimbul', 'duna')
  await waitForRenderedBoard(page, await fiber)
  const result = await send(page, module, { type: 'attack-nexus', playerId: 'player', attackerId: 'atacante' })
  expect(result.ok, result.message).toBe(true)
  const nexus = page.getByTestId('duel-nexus')
  await expect(nexus).toHaveAttribute('data-nexus-form', 'duna', { timeout: 15000 })
  await expect(nexus.getByLabel(/Vida del Nexo: 22 de /)).toBeVisible({ timeout: 15000 })
  await expect(nexus.getByLabel(/Vida del Nexo: 18 de /)).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: 'tools/captures/duelos-y-poderes/duelo-nexo-1366.png' })
})

const spellCases = [
  { card: 'fuegos-de-artificio', faction: 'jade', source: 'fuente-jade', width: 1920, height: 1080, targets: 1, routes: 0, fireworks: true },
  { card: 'resaca-subita', faction: 'marea', source: 'fuente-marea', width: 1366, height: 768, targets: 1, routes: 1, fireworks: false },
  { card: 'invierno-de-fimbul', faction: 'fimbul', source: 'fuente-fimbul', width: 1366, height: 768, targets: 2, routes: 0, fireworks: false },
  { card: 'tormenta-de-arena', faction: 'duna', source: 'fuente-duna', width: 1920, height: 1080, targets: 2, routes: 0, fireworks: false, design: 'Vendaval de la necrópolis' },
  { card: 'rayo-del-olimpo', faction: 'olimpo', source: 'fuente-olimpo', width: 1366, height: 768, targets: 1, routes: 0, fireworks: false, design: 'Ramas del trueno' },
  { card: 'chispazo', faction: 'goblins', source: 'fuente-goblin', width: 1366, height: 768, targets: 1, routes: 0, fireworks: false, design: 'Mecha de Bromuro' },
] as const

for (const sample of spellCases) {
  test(`la coreografía de ${sample.card} sigue su efecto real`, async ({ page }) => {
    await page.setViewportSize({ width: sample.width, height: sample.height })
    const base = createMatch(deck(sample.faction), deck('tercios'), 819)
    const fiber = fiberModuleUrl(page)
    const module = await openBattle(page, {
      ...base, turn: 4, phase: 'main', activePlayer: 'player', terrain: [],
      players: {
        player: {
          ...base.players.player, mulliganTaken: true, hand: [{ cardId: sample.card, instanceId: 'hechizo' }],
          resources: Array.from({ length: 4 }, (_, index) => ({
            instanceId: `fuente-${index}`, cardId: sample.source, faction: sample.faction, exhausted: false,
          })),
        },
        ai: { ...base.players.ai, mulliganTaken: true },
      },
      board: [
        piece('objetivo', 'devoradora-del-inframundo', 'ai', 4),
        { ...piece('otro', sample.faction === 'goblins' ? 'rodelero' : 'golem-azur', 'ai', 3), position: { x: 1, y: 3 } },
        { ...piece('aliado', 'sabueso-brasa', 'player', 5), position: { x: 5, y: 5 } },
      ],
    }, sample.faction, 'tercios')
    const url = await fiber
    await waitForRenderedBoard(page, url)
    const shaderErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Shader Error')) shaderErrors.push(message.text())
    })
    const target = { kind: 'piece', pieceId: 'objetivo' } as const
    const result = await send(page, module, { type: 'play-card', playerId: 'player', cardInstanceId: 'hechizo',
      target: sample.faction === 'fimbul' || sample.faction === 'duna' || sample.faction === 'goblins' ? { kind: 'none' } : target })
    expect(result.ok, result.message).toBe(true)
    let face: 'cara' | 'cruz' | undefined
    if (sample.faction === 'goblins') {
      face = await page.evaluate(() => (JSON.parse(localStorage.getItem('cronicas-nexo-match')!).state.match as MatchState).pendingSpark!.faces[0])
      expect(face).toBeDefined()
      const chosen = await send(page, module, { type: 'choose-spark', playerId: 'player', face: face!, target: face === 'cara' ? target : undefined })
      expect(chosen.ok, chosen.message).toBe(true)
    }
    const capture = await page.evaluate(async (url) => {
      const { _roots } = await import(/* @vite-ignore */ url) as {
        _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }>
      }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const state = _roots.get(canvas)?.store.getState()
      if (!state) throw new Error('Falta el tablero de la batalla')
      return new Promise<{ data: Record<string, unknown>; emblem?: Record<string, unknown>; screenshot: string }>((resolve, reject) => {
        const expires = performance.now() + 15000
        const frame = () => {
          const spell = state.scene.getObjectByName('coreografia-hechizo')
          if (spell) {
            // Se congela solo la muestra de la prueba, para capturar el mismo instante con cualquier GPU.
            spell.traverse((object) => {
              const material = (object as Mesh).material as ShaderMaterial | undefined
              if (material?.uniforms?.time) material.uniforms.time.value = .46
              if (material?.uniforms?.progress) material.uniforms.progress.value = spell.userData.fireworks ? .75 : .66
            })
            state.gl.render(state.scene, state.camera)
            resolve({ data: spell.userData, emblem: spell.getObjectByName('conjuro-emblematico')?.userData, screenshot: canvas.toDataURL('image/png').split(',')[1]! })
          } else if (performance.now() < expires) requestAnimationFrame(frame)
          else reject(new Error('El hechizo no llegó al tablero'))
        }
        requestAnimationFrame(frame)
      })
    }, url)
    expect(capture.data).toMatchObject({ faction: sample.faction, targets: face === 'cruz' ? 2 : sample.targets, routes: sample.routes, fireworks: sample.fireworks })
    if ('design' in sample) expect(capture.emblem).toMatchObject({ name: sample.design, faction: sample.faction, ...(face ? { face } : {}) })
    expect(shaderErrors).toEqual([])
    const folder = 'tools/captures/coreografia-hechizos'
    await mkdir(folder, { recursive: true })
    await writeFile(`${folder}/${sample.card}-${sample.width}.png`, Buffer.from(capture.screenshot, 'base64'))
  })
}

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`Jade muestra a quién congela y conserva el contador a ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const base = createMatch(deck('jade'), deck('tercios'), 41)
    const fiber = fiberModuleUrl(page)
    const module = await openBattle(page, {
      ...base, phase: 'main', turn: 4, mandate: 'player', terrain: [],
      players: {
        player: { ...base.players.player, hand: [{ cardId: 'dragon-del-rio-amarillo', instanceId: 'hechizo' }], mulliganTaken: true,
          resources: Array.from({ length: 6 }, (_, i) => ({ instanceId: `fuente-${i}`, cardId: 'fuente-jade', faction: 'jade', exhausted: false })) },
        ai: { ...base.players.ai, mulliganTaken: true },
      },
      board: [
        piece('fuerte', 'el-gran-capitan', 'ai', 3),
        { ...piece('débil', 'rodelero', 'ai', 3), position: { x: 1, y: 3 } },
      ],
    }, 'jade', 'tercios')
    await waitForRenderedBoard(page, await fiber)
    await page.getByRole('button', { name: /^Dragón del Río Amarillo\./ }).click()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByText('Congelación · 2 turnos', { exact: true })).toBeVisible()
    await expect(page.getByText(/Mandato · congela a El gran capitán durante 2 turnos/i)).toBeVisible()
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/prevision-jade-${width}.png` })
    const result = await send(page, module, { type: 'play-card', playerId: 'player', cardInstanceId: 'hechizo', position: { x: 3, y: 7 }, target: { kind: 'none' } })
    expect(result.ok, result.message).toBe(true)
    await expect(page.getByLabel('Congelada · 2 turnos', { exact: true })).toBeVisible({ timeout: 20000 })
  })

  test(`Marea señala el destino real de un empuje acortado a ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const base = createMatch(deck('marea'), deck('tercios'), 43)
    const module = await openBattle(page, {
      ...base, phase: 'main', turn: 4, terrain: [],
      players: {
        player: { ...base.players.player, hand: [{ cardId: 'resaca-subita', instanceId: 'hechizo' }], mulliganTaken: true,
          resources: [{ instanceId: 'fuente', cardId: 'fuente-marea', faction: 'marea', exhausted: false }] },
        ai: { ...base.players.ai, mulliganTaken: true },
      },
      board: [piece('propia', 'oraculo-de-las-mareas', 'player', 5), piece('objetivo', 'rodelero', 'ai', 4), piece('bloqueo', 'rodelero', 'ai', 2)],
    }, 'marea', 'tercios')
    await page.getByRole('button', { name: /^Resaca Súbita\./ }).click()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByText('Empuje → D4', { exact: true })).toBeVisible()
    await expect(page.getByText(/Rodelero retrocede 1 de 2 casillas hasta D4/)).toBeVisible()
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/prevision-marea-${width}.png` })
    const result = await send(page, module, { type: 'play-card', playerId: 'player', cardInstanceId: 'hechizo', target: { kind: 'piece', pieceId: 'objetivo' } })
    expect(result.ok, result.message).toBe(true)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-match')!).state.match as MatchState)
    expect(saved.board.find((unit) => unit.instanceId === 'objetivo')?.position).toEqual({ x: 3, y: 3 })
  })
}
