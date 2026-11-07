import { expect, test } from '@playwright/test'
import { STARTER_DECKS } from '../src/game'
import type { MatchState, GameAction } from '../src/game'
import type { useMatchStore as Store } from '../src/store/match'
import type { chooseNextAiAction as Choose } from '../src/game/ai'
import type { useNetworkStore as Network } from '../src/store/network'

test('una partida online completa conserva estado, efectos, reconexión y revancha', async ({ browser }, testInfo) => {
  test.skip(process.env.RUN_LIVE_PVP !== '1', 'Requiere Supabase real')
  test.setTimeout(600_000)
  const contexts = await Promise.all([{ width: 1920, height: 1080 }, { width: 1366, height: 768 }].map((viewport) => browser.newContext({ viewport })))
  try {
    await Promise.all(contexts.map((context) => context.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { graphicsQuality: 'low', reducedMotion: true, presentationPace: 'fast', animationSpeed: 2, muted: true }, version: 3 }))
    })))
    const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()))
    const read = (page: typeof host) => page.evaluate(async () => {
      const path = '/src/store/match.ts'
      const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
      return useMatchStore.getState().match
    })
    await Promise.all([host, guest].map((page) => page.goto('/multiplayer')))
    await guest.getByTitle(STARTER_DECKS.find((deck) => deck.faction === 'goblins')!.name, { exact: true }).click()
    await host.getByRole('button', { name: /Fiordo de Fimbul/ }).click()
    await host.getByRole('button', { name: /Crear sala/ }).click()
    const code = await host.locator('[class*="codeRow"] strong').innerText()
    await guest.getByRole('textbox', { name: 'Código de sala' }).fill(code)
    await guest.getByRole('button', { name: 'Unirse', exact: true }).click()
    await host.getByRole('button', { name: 'Entrar a la batalla' }).click()
    await guest.getByRole('button', { name: 'Entrar a la batalla' }).click()
    await Promise.all([host, guest].map((page) => expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 })))
    await Promise.all([host, guest].map((page) => page.getByRole('button', { name: 'Conservar las diez' }).click()))
    await expect.poll(async () => (await read(guest))?.players.ai.mulliganTaken).toBe(true)
    const originalSeed = (await read(host))!.seed
    const seen = new Set<string>()
    let actions = 0
    let reconnected = false
    while (actions < 1200) {
      const match = (await read(host))!
      if (match.winner) break
      const page = match.activePlayer === 'player' ? host : guest
      const action = await page.evaluate(async () => {
        const storePath = '/src/store/match.ts'
        const aiPath = '/src/game/ai.ts'
        const { useMatchStore } = await import(storePath) as { useMatchStore: typeof Store }
        const { chooseNextAiAction } = await import(aiPath) as { chooseNextAiAction: typeof Choose }
        const match = useMatchStore.getState().match!
        return chooseNextAiAction(match, new Set(), 'hard', match.activePlayer)
      })
      const before = JSON.stringify(match)
      await page.evaluate(async ({ action, host }) => {
        const storePath = '/src/store/match.ts'
        const networkPath = '/src/store/network.ts'
        const { useMatchStore } = await import(storePath) as { useMatchStore: typeof Store }
        const { useNetworkStore } = await import(networkPath) as { useNetworkStore: typeof Network }
        if (host) {
          if (!useMatchStore.getState().dispatch(action)) throw new Error(useMatchStore.getState().message)
        } else useNetworkStore.getState().room!.send('intent', { kind: 'action', action })
      }, { action: action as GameAction, host: page === host })
      await expect.poll(async () => JSON.stringify(await read(host)), { timeout: 30_000 }).not.toBe(before).catch(async (error: unknown) => {
        await testInfo.attach('accion-sin-cambio', { body: JSON.stringify({ action, before: match, after: await read(host) }, null, 2), contentType: 'application/json' })
        throw error
      })
      const resolved = (await read(host))!
      await expect.poll(() => read(guest), { timeout: 30_000 }).toEqual(resolved)
      const eventTypes = await guest.evaluate(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        const state = useMatchStore.getState()
        return [...state.pendingAnimations, ...(state.currentEvent ? [state.currentEvent] : [])].map((event) => event.type)
      })
      eventTypes.forEach((type) => seen.add(type))
      if (!resolved.winner) await Promise.all([host, guest].map((page) => page.evaluate(async () => {
        const path = '/src/store/match.ts'
        const { useMatchStore } = await import(path) as { useMatchStore: typeof Store }
        useMatchStore.getState().skipAnimations()
      })))
      actions += 1
      if (actions % 5 === 0) console.log(`Partida completa · ${actions} acciones · turno ${resolved.turn}`)
      if (!reconnected && resolved.turn >= 10) {
        await guest.reload()
        await expect(guest.locator('canvas')).toBeVisible({ timeout: 45_000 })
        await expect.poll(() => read(guest), { timeout: 20_000 }).toEqual(resolved)
        reconnected = true
      }
    }
    const final = (await read(host)) as MatchState
    expect(final.winner, `Sin ganador tras ${actions} acciones y ${final.turn} turnos`).toBeTruthy()
    expect(seen.has('attack')).toBe(true)
    expect(seen.has('destroy')).toBe(true)
    await expect(host.getByRole('button', { name: 'Jugar otra vez', exact: true })).toBeVisible({ timeout: 60_000 })
    await Promise.all([host, guest].map((page, index) => page.screenshot({ path: testInfo.outputPath(`final-${index}.png`) })))
    await host.getByRole('button', { name: 'Jugar otra vez', exact: true }).click()
    await guest.getByRole('button', { name: /Aceptar revancha|Jugar otra vez/ }).click()
    await expect.poll(async () => (await read(guest))?.seed, { timeout: 20_000 }).not.toBe(originalSeed)
    expect((await read(guest))!.winner).toBeUndefined()
    await testInfo.attach('resultado', { body: JSON.stringify({ actions, turns: final.turn, winner: final.winner, reconnected, events: [...seen] }, null, 2), contentType: 'application/json' })
  } finally { await Promise.all(contexts.map((context) => context.close())) }
})
