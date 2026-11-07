import { expect, test } from '@playwright/test'
import { createMatch, STARTER_DECKS, type BoardPiece } from '../src/game'
import type { useMatchStore as Store } from '../src/store/match'

test.describe('Sala real con presentación del invitado', () => {
  test.skip(process.env.RUN_LIVE_PVP !== '1', 'Requiere acceso al Supabase de pruebas')
  for (const width of [1920, 1366]) test(`duelo, muerte, repetición y escenario compartido a ${width}`, async ({ browser }, testInfo) => {
    test.setTimeout(120_000)
    const contexts = await Promise.all([0, 1].map(() => browser.newContext({ viewport: { width, height: width === 1920 ? 1080 : 768 } })))
    try {
      await Promise.all(contexts.map((context) => context.addInitScript(() => localStorage.setItem('cronicas-nexo-howto-visto', '1'))))
      const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()))
      const waitForGuest = async (predicate: () => Promise<unknown>) => {
        await expect.poll(() => guest.evaluate(predicate), { timeout: 45_000 }).toBeTruthy()
      }
      await Promise.all([host, guest].map((page) => page.goto('/multiplayer')))
      await host.getByRole('button', { name: /Fiordo de Fimbul/ }).click()
      await host.screenshot({ path: testInfo.outputPath('preparacion.png'), fullPage: true })
      await host.getByRole('button', { name: /Crear sala/ }).click()
      const code = await host.locator('[class*="codeRow"] strong').innerText()
      await guest.getByRole('textbox', { name: 'Código de sala' }).fill(code)
      await guest.getByRole('button', { name: 'Unirse', exact: true }).click()
      await expect(guest.getByText(/Campo elegido por el anfitrión · Fiordo de Fimbul/)).toBeVisible()
      await host.getByRole('button', { name: 'Entrar a la batalla' }).click()
      await host.waitForURL('**/battle')
      await guest.getByRole('button', { name: 'Entrar a la batalla' }).click()
      await guest.waitForURL('**/battle')
      await waitForGuest(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        return !!useMatchStore.getState().match
      })
      await Promise.all([host, guest].map((page) => expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 })))
      const initial = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 4451)
      const piece = (instanceId: string, cardId: string, owner: 'player' | 'ai', y: number, health: number): BoardPiece => ({ instanceId, cardId, owner, position: { x: 3, y }, currentHealth: health, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [] })
      const match = { ...initial, turn: 4, activePlayer: 'player' as const, terrain: [], animations: [], board: [piece('attacker', 'lobo-salvaje', 'player', 3, 2), piece('victim', 'sabueso-brasa', 'ai', 4, 1)], players: { player: { ...initial.players.player, mulliganTaken: true }, ai: { ...initial.players.ai, mulliganTaken: true } } }
      await host.evaluate(async (match) => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        useMatchStore.getState().startFromMatch(match)
      }, match)
      await guest.evaluate(async () => {
        const path = '/src/store/network.ts'
        const { useNetworkStore } = await import(path)
        useNetworkStore.getState().room.send('resync', {})
      })
      await guest.waitForFunction(() => JSON.parse(localStorage.getItem('cronicas-nexo-match') ?? 'null')?.state?.match?.seed === 4451)
      const accepted = await host.evaluate(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        return useMatchStore.getState().dispatch({ type: 'attack-piece', playerId: 'player', attackerId: 'attacker', defenderId: 'victim' })
      })
      expect(accepted).toBe(true)
      await waitForGuest(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        const state = useMatchStore.getState()
        return state.lastPlay?.some((event) => event.type === 'destroy') && (state.pendingAnimations.length > 0 || !!state.currentEvent)
      })
      await guest.screenshot({ path: testInfo.outputPath('duelo-invitado.png') })
      await waitForGuest(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        const state = useMatchStore.getState()
        return !state.currentEvent && !state.pendingAnimations.length
      })
      await guest.evaluate(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        useMatchStore.getState().replayLastPlay()
      })
      await waitForGuest(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        const state = useMatchStore.getState()
        return [...state.pendingAnimations, ...(state.currentEvent ? [state.currentEvent] : [])].some((event) => event.id.includes('-repetida-'))
      })
      await guest.reload()
      await guest.waitForFunction(() => JSON.parse(localStorage.getItem('cronicas-nexo-match') ?? 'null')?.state?.match?.seed === 4451)
      await waitForGuest(async () => {
        const path = '/src/store/network.ts'
        const { useNetworkStore } = await import(path)
        return useNetworkStore.getState().scenario === 'fimbul'
      })
      const spellMatch = { ...match, seed: 4452, activePlayer: 'ai' as const, board: [piece('target', 'lobo-salvaje', 'player', 3, 9)], players: { ...match.players, ai: { ...match.players.ai, commanderId: initial.players.player.commanderId, commanderPowerUsed: false, hand: [{ instanceId: 'ash', cardId: 'lluvia-ceniza' }], resources: Array.from({ length: 10 }, (_, i) => ({ instanceId: `mana-${i}`, cardId: 'fuente-furia', faction: 'fury' as const, exhausted: false })) } } }
      await host.evaluate(async (match) => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        useMatchStore.getState().startFromMatch(match)
      }, spellMatch)
      await guest.waitForFunction(() => JSON.parse(localStorage.getItem('cronicas-nexo-match') ?? 'null')?.state?.match?.seed === 4452)
      await guest.evaluate(async () => {
        const path = '/src/store/network.ts'
        const { useNetworkStore } = await import(path)
        useNetworkStore.getState().room.send('intent', { kind: 'action', action: { type: 'play-card', playerId: 'ai', cardInstanceId: 'ash', target: { kind: 'piece', pieceId: 'target' } } })
      })
      await waitForGuest(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        return useMatchStore.getState().lastPlay?.some((event) => event.cardId === 'lluvia-ceniza')
      })
      await guest.screenshot({ path: testInfo.outputPath('hechizo-invitado.png') })
      await guest.evaluate(async () => {
        const path = '/src/store/network.ts'
        const { useNetworkStore } = await import(path)
        useNetworkStore.getState().room.send('intent', { kind: 'action', action: { type: 'commander-power', playerId: 'ai' } })
      })
      await guest.waitForFunction(() => JSON.parse(localStorage.getItem('cronicas-nexo-match') ?? 'null')?.state?.match?.players.ai.commanderPowerUsed === true)
    } finally { await Promise.all(contexts.map((context) => context.close())) }
  })
})

