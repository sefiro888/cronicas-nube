import type { CSSProperties } from 'react'
import { FACTION_BY_ID, type FactionId, type MatchState, type PlayerId } from '../../game'
import { tidePhase } from '../../game/marea'
import { runoAttackBonus } from '../../game/kalevala'
import { FactionBattleArt } from './FactionBattleArt'
import styles from './FactionPowers.module.css'

interface Readout {
  readonly faction: FactionId
  readonly label: string
  readonly value: string
  readonly side?: string
  readonly owner?: PlayerId
}

export function FactionPowers({ match, me, ownFaction, rivalFaction }: {
  readonly match: MatchState
  readonly me: PlayerId
  readonly ownFaction?: FactionId
  readonly rivalFaction?: FactionId
}) {
  const rival = me === 'player' ? 'ai' : 'player'
  const own = match.players[me]
  const enemy = match.players[rival]
  const readouts: Readout[] = []
  if (ownFaction === 'jade' || rivalFaction === 'jade' || match.mandate) {
    readouts.push({ faction: 'jade', label: 'Mandato', value: match.mandate === me ? 'Tuyo' : match.mandate ? 'Rival' : 'Libre', owner: match.mandate })
  }
  if (ownFaction === 'marea' || rivalFaction === 'marea') {
    const high = tidePhase(match) === 'high'
    readouts.push({ faction: 'marea', label: high ? 'Pleamar' : 'Bajamar', value: high ? '→ Bajamar' : '→ Pleamar' })
  }
  for (const [player, faction, side, other] of [[own, ownFaction, 'Tú', enemy], [enemy, rivalFaction, 'Rival', own]] as const) {
    if (faction === 'sol' || player.sunCount !== undefined) {
      readouts.push({ faction: 'sol', label: 'Cuenta del Sol', value: String(player.sunCount ?? 0), side })
    }
    if (faction === 'olimpo' || player.hybris !== undefined) {
      readouts.push({ faction: 'olimpo', label: 'Hybris', value: String(player.hybris ?? 0), side })
    }
    if (faction === 'kalevala' || player.runo !== undefined) {
      const runo = player.runo ?? 0
      readouts.push({ faction: 'kalevala', label: 'Runo', value: `${runo} · +${runoAttackBonus(runo)} ATQ`, side })
    }
    if (faction === 'duna') {
      readouts.push({ faction: 'duna', label: 'Juicio', value: player.nexusHealth < other.nexusHealth ? 'Activo' : 'Inactivo', side })
    }
  }
  if (!readouts.length) return null
  return (
    <div className={styles.powers} aria-label="Poderes de facción" role="region" tabIndex={0}>
      {readouts.map(({ faction, label, value, side, owner }) => (
        <span key={`${faction}-${side ?? 'común'}`} className={styles.power} data-mandate={owner ? owner === me ? 'own' : 'rival' : undefined} style={{ '--seal': FACTION_BY_ID[faction].accentColor } as CSSProperties}>
          <FactionBattleArt faction={faction} kind="seal" />
          {side && <small>{side}</small>}
          <span>{label}</span>
          <strong key={value}>{value}</strong>
        </span>
      ))}
    </div>
  )
}
