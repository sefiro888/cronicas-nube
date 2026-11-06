import { expect, test } from '@playwright/test';
import { CARD_BY_ID, STARTER_DECKS, createMatch, type BoardPiece, type MatchState } from '../src/game';

const cases = [
  ['aether-citadel', 1920, 1080], ['aether-citadel', 1366, 768],
  ['caldera', 1920, 1080], ['caldera', 1366, 768],
  ['fimbul', 1920, 1080], ['fimbul', 1366, 768], ['caldera', 390, 844],
] as const;

for (const [scenario, width, height] of cases) {
  test(`la pérdida mortal de Formación destaca antes de mover en ${scenario} a ${width} × ${height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = createMatch(STARTER_DECKS.find((deck) => deck.faction === 'tercios')!, STARTER_DECKS.find((deck) => deck.faction === 'void')!, 42);
    const unit = (id: string, owner: 'player' | 'ai', x: number, y: number): BoardPiece => ({
      instanceId: id, cardId: 'piquero-de-flandes', owner, position: { x, y }, currentHealth: CARD_BY_ID['piquero-de-flandes']!.health!,
      attackModifier: 0, enteredOnTurn: 0, movedThisTurn: false, attackedThisTurn: false, statuses: [],
    });
    const match: MatchState = { ...base, turn: 4, terrain: [], animations: [],
      board: [{ ...unit('elegida', 'player', 3, 5), currentHealth: 1, formationHealthApplied: 2 }, { ...unit('apoyo', 'player', 4, 5), cardId: 'rodelero' }],
      players: { ...base.players, player: { ...base.players.player, hand: [], mulliganTaken: true } },
    };
    await page.setViewportSize({ width, height });
    await page.addInitScript(({ match, scenario }) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1');
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { selectedDeckId: 'cuadro-tercios', scenario,
        muted: true, reducedMotion: true, graphicsQuality: 'medium', colorblindMode: true, confirmEndTurn: false }, version: 7 }));
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: { match, history: [], matchLog: [], healthHistory: [],
        startedAtMs: Date.now(), elapsedSeconds: 0 }, version: 2 }));
    }, { match, scenario });
    await page.goto('/battle');
    await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25000 });
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    const marker = page.getByTestId('movement-hazard').filter({ hasText: '☠' });
    await expect(marker).toHaveCount(3);
    await expect(page.getByTestId('movement-hazard').and(page.locator('[data-cell="3,4"]'))).toHaveAttribute('data-fatal', 'true');
    await expect(marker.first()).toBeVisible();
    await page.keyboard.press('ArrowUp');
    const warning = page.getByTestId('movement-hazard-warning');
    await expect(warning).toContainText('Este movimiento mata a tu unidad');
    await expect(warning).toContainText('pierde Formación');
    await expect(page.getByText('Cae al mover', { exact: true })).toBeVisible();
    const bounds = await warning.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-match')!).state.match as MatchState);
    expect(saved.board.find((piece) => piece.instanceId === 'elegida')?.position).toEqual({ x: 3, y: 5 });
    expect(saved.board.find((piece) => piece.instanceId === 'elegida')?.currentHealth).toBe(1);
    // El texto HTML aparece antes del siguiente fotograma WebGL con render
    // bajo demanda: comprobar ambos evita fotografiar la losa anterior.
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/__shots__/suelo-formacion-${scenario}-${width}x${height}.png` });
    expect(errors).toEqual([]);
  });
}
