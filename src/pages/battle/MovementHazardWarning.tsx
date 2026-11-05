import type { Position } from '../../game';
import type { MovementHazard } from '../../game/movementHazard';
import styles from '../BattlePage.module.css';

export function MovementHazardWarning({ hazards, focused }: { readonly hazards: ReadonlyMap<string, MovementHazard>; readonly focused?: Position }) {
  if (!hazards.size) return null;
  const current = focused ? hazards.get(`${focused.x},${focused.y}`) : undefined;
  const fatalCount = [...hazards.values()].filter((hazard) => hazard.deaths > 0).length;
  const title = current?.movingPieceDies ? '☠ Este movimiento mata a tu unidad'
    : current?.deaths ? '☠ Este movimiento mata a una aliada'
    : current ? '⚠ Este movimiento hace perder Vida' : '⚠ Cuidado al romper la Formación';
  return <aside className={styles.movementHazardWarning} data-testid="movement-hazard-warning" data-fatal={current ? current.deaths > 0 || undefined : fatalCount > 0 || undefined} role="status" aria-live="polite">
    <strong>{title}</strong>
    {current ? <p>{current.losses.map((loss) => `${loss.name}: ${loss.losesFormation ? 'pierde Formación y ' : 'pierde apoyo y '}
      pierde ${loss.amount} de Vida${loss.dies ? ' y cae' : ''}.`).join(' ')}</p> : <p>
      {fatalCount > 0 && `☠ ${fatalCount} destinos causan una muerte. `}
      Las losas marcadas muestran la Vida que se pierde al mover.
    </p>}
    <small>La Vida extra depende de mantener los apoyos adyacentes.</small>
  </aside>;
}
