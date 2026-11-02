import type { CSSProperties } from 'react'
import { CARD_BY_ID, COMMANDER_BY_ID, FACTION_BY_ID, type MatchState, type PlayerId, type PlayerStats } from '../../game'
import type { Achievement } from '../../store/achievements'
import type { DailyChallenge } from '../../store/dailyChallenge'
import type { BestPlay, HealthSnapshot } from '../../store/match'
import type { RecordSummary } from '../../store/records'
import { HealthChart } from './HealthChart'
import { withBase } from '../../utils/assets'
import { Link } from 'react-router-dom'
import { useProfile } from '../../components/useProfile'
import { StreakEmblem } from '../../components/ProfileBadges'
import styles from '../BattlePage.module.css'
import heroStyles from './ResultHero.module.css'

interface MatchResultDialogProps {
  match: MatchState
  me: PlayerId
  stats: PlayerStats
  elapsedSeconds: number
  tally: RecordSummary
  daily: DailyChallenge
  achievements: readonly Achievement[]
  healthHistory: readonly HealthSnapshot[]
  bestPlay?: BestPlay
  isPvp: boolean
  /** En PvP: si este lado ya pidió la revancha y si la pidió el rival. */
  rematchSelf: boolean
  /** La partida es un piso de la Torre del Nexo. */
  isTower?: boolean
  onTower: () => void
  rematchPeer: boolean
  onRematch: () => void
  onRepeat: () => void
  onHome: () => void
  onDownloadLog: () => void
  /** Vuelve a ver el golpe que decidió la partida (la última jugada, a cámara lenta). */
  onReplay?: () => void
  reducedMotion?: boolean
}

/** Brasas fijas por índice: aleatorias cambiarían en cada render y temblarían. */
const EMBERS = Array.from({ length: 18 }, (_, index) => ({
  x: `${(index * 53) % 100}%`, delay: `${(index * 0.37) % 3.2}s`, size: `${3 + (index % 3)}px`,
}))

/**
 * Cabecera con el comandante que ha ganado: el propio, con rayos y brasas,
 * si se gana; el rival, apagado y con el retrato agrietado, si se pierde.
 */
function ResultHero({ match, me, won, reducedMotion }: { match: MatchState; me: PlayerId; won: boolean; reducedMotion?: boolean }) {
  const winner = match.winner ?? me
  const commander = COMMANDER_BY_ID[match.players[winner].commanderId]
  if (!commander) return null
  const accent = FACTION_BY_ID[commander.faction].accentColor
  return (
    <div
      className={heroStyles.hero}
      data-outcome={won ? 'victory' : 'defeat'}
      data-reduced-motion={reducedMotion || undefined}
      style={{ '--accent': accent } as CSSProperties}
      aria-hidden="true"
    >
      {won && (
        <span className={heroStyles.embers}>
          {EMBERS.map((ember, index) => (
            <i key={index} style={{ '--x': ember.x, '--d': ember.delay, '--s': ember.size } as CSSProperties} />
          ))}
        </span>
      )}
      <span className={heroStyles.portraitWrap}>
        {won && <span className={heroStyles.rays} />}
        <span className={heroStyles.halo} />
        <img className={heroStyles.portrait} src={withBase(commander.art.webp)} alt="" />
        {!won && <span className={heroStyles.crack} />}
      </span>
      <span className={heroStyles.caption}>{won ? `${commander.name} triunfa` : `${commander.name} se impone`}</span>
    </div>
  )
}

/** Pantalla final: resultado, estadísticas de la partida y qué hacer después. */
/**
 * Duración en un formato que se lee de un vistazo. Una partida normal dura
 * varios minutos y «487s» obliga a echar la cuenta mental.
 */
const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total}s`
  const minutos = Math.floor(total / 60)
  const resto = total % 60
  return resto === 0 ? `${minutos} min` : `${minutos}m ${resto}s`
}

export function MatchResultDialog(props: MatchResultDialogProps) {
  const { streak } = useProfile()
  const won = props.match.winner === props.me
  return (
    <div className={styles.resultBackdrop}>
      <section className={styles.result} data-outcome={won ? 'victory' : 'defeat'}>
        <ResultHero match={props.match} me={props.me} won={won} reducedMotion={props.reducedMotion} />
        <small>La crónica ha concluido</small>
        <h2>{won ? 'Victoria' : 'Derrota'}</h2>
        <p>{won ? 'El Nexo rival se quiebra bajo tu voluntad.' : 'Tu Nexo se desvanece. La siguiente crónica aún puede cambiar.'}</p>
        <div className={styles.resultStats}>
          <div><strong>{props.match.turn}</strong><span>Turnos</span></div>
          <div><strong>{formatDuration(props.elapsedSeconds)}</strong><span>Duración</span></div>
          <div><strong>{props.stats.damageDealt}</strong><span>Daño</span></div>
          <div><strong>{props.stats.cardsPlayed}</strong><span>Jugadas</span></div>
        </div>
        <HealthChart history={props.healthHistory} me={props.me} />
        {props.bestPlay && (() => {
          const card = CARD_BY_ID[props.bestPlay.cardId ?? '']
          // La mejor jugada, como vitrina: la carta con su arte y el dato
          // grande, en vez de una frase suelta al final de la lista.
          return (
            <div className={heroStyles.bestShowcase} data-mine={props.bestPlay.by === props.me || undefined}>
              {card && <img src={withBase(card.art.webp)} alt="" />}
              <div>
                <small>🏆 Mejor jugada · turno {props.bestPlay.turn}</small>
                <strong>{card?.name ?? 'Una unidad'}</strong>
                <span>{props.bestPlay.by === props.me ? 'Tuya' : 'Del rival'}: <b>{props.bestPlay.amount}</b> de daño de un golpe</span>
              </div>
            </div>
          )
        })()}
        {/* Recompensas de la victoria: el sobre ganado y la racha. */}
        {/* Recompensas y repetición en una sola fila: apiladas hacían la
            pantalla final muy alta, y el recuento de debajo (con margen
            negativo para pegarse a la gráfica) se montaba sobre el botón. */}
        {((won && !props.isPvp) || props.onReplay) && (
          <div className={heroStyles.rewardRow}>
            {won && !props.isPvp && <Link to="/album" className={heroStyles.packReward}>🎁 +1 sobre · ábrelo en el álbum</Link>}
            {won && !props.isPvp && <StreakEmblem streak={streak} />}
            {props.onReplay && (
              <button type="button" className={heroStyles.replayDecisive} onClick={props.onReplay}>
                🎬 Ver el golpe decisivo
              </button>
            )}
          </div>
        )}
        {props.tally.played > 1 && (
          <p className={styles.resultTally}>
            Llevas <strong>{props.tally.won}</strong> {props.tally.won === 1 ? 'victoria' : 'victorias'} de{' '}
            <strong>{props.tally.played}</strong> escaramuzas · {props.tally.winRate}%
          </p>
        )}
        {won && props.daily.done && (
          <p className={styles.dailyResultNote}>✓ Reto de hoy completado: {props.daily.title}</p>
        )}
        {props.achievements.length > 0 && (
          <div className={styles.resultAchievements}>
            <small>Logro{props.achievements.length > 1 ? 's' : ''} desbloqueado{props.achievements.length > 1 ? 's' : ''}</small>
            {props.achievements.map((achievement) => (
              <p key={achievement.id}>
                <span aria-hidden="true">{achievement.icon}</span> {achievement.name}
              </p>
            ))}
          </div>
        )}
        {/* En PvP la revancha exige que los dos lados la pidan: uno solo
            repitiendo no basta, sería jugar contra un rival que no lo sabe. */}
        {props.isPvp && props.rematchSelf && !props.rematchPeer && (
          <p className={styles.rematchWaiting}>Esperando a que tu rival acepte la revancha…</p>
        )}
        <div className={styles.resultActions}>
          {/* En la Torre no hay revancha ni repetición: el piso ya está
              resuelto y lo que toca es volver a la escalera, donde se elige
              bendición o se ve hasta dónde se llegó. */}
          {props.isTower
            ? <button onClick={props.onTower}>Volver a la Torre</button>
            : props.isPvp
              ? <button onClick={props.onRematch} disabled={props.rematchSelf}>{props.rematchPeer ? 'Aceptar revancha' : 'Jugar otra vez'}</button>
              : <button onClick={props.onRepeat}>Repetir</button>}
          {/* Sin el reset, la partida terminada quedaba persistida: si luego se
              elegía la misma facción, se reanudaba esta misma (mismo rival, ya
              con ganador) en vez de empezar una nueva. */}
          <button onClick={props.onHome}>Volver al inicio</button>
        </div>
        <button
          className={styles.downloadLog}
          onClick={props.onDownloadLog}
          title="Descarga un archivo con el registro de esta partida, útil para reportar un problema"
        >
          ⬇ Descargar registro de la partida
        </button>
      </section>
    </div>
  )
}
