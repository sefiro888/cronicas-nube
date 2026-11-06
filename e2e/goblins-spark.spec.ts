import { expect, test } from '@playwright/test';
import { STARTER_DECKS, applyAction, createMatch, type MatchState } from '../src/game';

for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]] as const) {
  test(`Goblins resuelve y guarda una Chispa real a ${width} × ${height}`, async ({ page }) => {
    const goblins = STARTER_DECKS.find((deck) => deck.faction === 'goblins')!;
    const base = createMatch(goblins, STARTER_DECKS[1]!, 42);
    const initial: MatchState = { ...base, terrain: [], board: [{ instanceId: 'objetivo', cardId: 'centinela-cristal', owner: 'ai', position: { x: 3, y: 3 }, currentHealth: 8,
      attackModifier: 0, enteredOnTurn: 0, movedThisTurn: false, attackedThisTurn: false, statuses: [] }], players: { ...base.players, player: {
      ...base.players.player, mulliganTaken: true, hand: [{ instanceId: 'chispazo', cardId: 'chispazo' }],
      resources: [{ instanceId: 'fuente', cardId: 'fuente-goblin', faction: 'goblins', exhausted: false }],
    } } };
    const rolled = applyAction(initial, { type: 'play-card', playerId: 'player', cardInstanceId: 'chispazo' });
    expect(rolled.ok).toBe(true);
    await page.setViewportSize({ width, height });
    await page.addInitScript((match) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1');
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { selectedDeckId: 'gremio-chispa', muted: true, scenario: 'foundry', graphicsQuality: 'medium', reducedMotion: true, confirmEndTurn: false }, version: 7 }));
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: { match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 }, version: 2 }));
    }, { ...rolled.state, animations: [] });
    await page.goto('/battle');
    await expect(page.getByTestId('battle-intro')).toBeHidden({ timeout: 15000 });
    const dialog = page.getByRole('dialog', { name: 'Resolver Chispa' });
    await expect(dialog).toBeVisible({ timeout: 25000 });
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `e2e/__shots__/goblins-dialogo-${width}x${height}.png` });
    const face = rolled.state.pendingSpark!.faces[0]!;
    await dialog.getByRole('radio', { name: face === 'cara' ? 'Cara' : 'Cruz', exact: true }).check();
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: `Resolver ${face}`, exact: true }).click();
    await expect(dialog).toBeHidden();
    const spell = page.getByTestId('cast-spotlight');
    await expect(spell).toContainText(`Chispa · ${face === 'cara' ? 'Cara' : 'Cruz'}`);
    await expect(spell.locator('[data-faction-art="goblins"][data-kind="spell"]').first()).toBeVisible();
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/chispa-${width}.png` });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-match')!).state.match);
    expect(saved.pendingSpark).toBeUndefined();
    expect(saved.players.player.hand).toHaveLength(0);
    expect(saved.players.player.resources[0].exhausted).toBe(true);
    expect(saved.sparkRandomState).toBe(rolled.state.sparkRandomState);
    expect(saved.board[0].currentHealth).toBe(face === 'cara' ? 5 : 7);
    await expect(page.getByTestId('battle-board')).toBeVisible();
    await page.screenshot({ path: `e2e/__shots__/goblins-chispa-${width}x${height}.png` });
  });
}
