import type { CSSProperties } from 'react'
import { usePreferences } from '../store/preferences'
import styles from './WorldAtmosphere.module.css'

/** El ambiente de menús es decorativo y no necesita WebGL ni un reloj de
 * JavaScript; se detiene también con la preferencia de movimiento del juego. */
export function WorldAtmosphere({ tower = false }: { tower?: boolean }) {
  const quiet = usePreferences((state) => state.reducedMotion || state.graphicsQuality === 'low')
  return (
    <div className={styles.atmosphere} data-quiet={quiet} data-tower={tower} aria-hidden="true">
      <div className={styles.mist} />
      {Array.from({ length: 16 }, (_, index) => (
        <i key={index} className={styles.ember} style={{
          '--x': `${(index * 37 + 9) % 100}%`, '--y': `${(index * 23 + 7) % 95}%`,
          '--delay': `${-index * 1.7}s`, '--time': `${9 + index % 7}s`,
        } as CSSProperties} />
      ))}
      {tower && <><div className={styles.ward} /><div className={styles.lightning} /><div className={styles.comet} /></>}
    </div>
  )
}
