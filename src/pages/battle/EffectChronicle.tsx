import type { ResolvedEffect } from '../../battle/resolvedEffects'
import styles from './EffectChronicle.module.css'

export function EffectChronicle({ effects }: { readonly effects: readonly ResolvedEffect[] }) {
  if (effects.length === 0) return null
  return (
    <details className={styles.chronicle}>
      <summary>Crónica de efectos <span>{effects.length}</span></summary>
      <ol aria-label="Efectos resueltos en orden de ejecución">
        {effects.map((effect) => <li key={effect.id} data-tone={effect.tone}>
          <small>Turno {effect.turn}</small>
          <strong>{effect.source} → {effect.target}</strong>
          <span>{effect.text}</span>
          {effect.before !== undefined && effect.after !== undefined && effect.before !== effect.after && <small>Vida antes y después de la acción: {effect.before} → {effect.after}</small>}
        </li>)}
      </ol>
    </details>
  )
}
