import type { CSSProperties, ReactNode } from 'react'
import { KeywordGlyph, keywordIdentity } from '../../components/keywordIdentity'
import type { FactionId } from '../../game'
import { FactionBattleArt, factionBattleSignature } from './FactionBattleArt'
import styles from './BattlePlate.module.css'

export function BattlePlate({ label, detail, metric, keyword, faction, active = false, compact = false }: {
  readonly label: string
  readonly detail?: ReactNode
  readonly metric?: string
  readonly keyword?: string
  readonly faction?: FactionId
  readonly active?: boolean
  readonly compact?: boolean
}) {
  const identity = keywordIdentity(keyword ?? 'habilidad')
  const signature = faction ? factionBattleSignature(faction) : undefined
  return (
    <span className={styles.plate} data-testid="battle-plate" data-family={identity.family}
      data-active={active || undefined} data-compact={compact || undefined} data-faction={faction} data-grain={signature?.rhythm}
      style={{ '--rune': identity.color, '--metal': signature?.ink ?? identity.color } as CSSProperties}>
      <span className={styles.medal} aria-hidden="true"><KeywordGlyph glyph={identity.glyph} /></span>
      <span className={styles.words}>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      {metric && <b className={styles.metric}>{metric}</b>}
      {faction && <span className={styles.engraving}><FactionBattleArt faction={faction} kind="seal" /></span>}
    </span>
  )
}
