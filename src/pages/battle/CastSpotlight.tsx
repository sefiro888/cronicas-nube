import { useEffect, type CSSProperties } from 'react'
import { Card, CARD_TYPE_LABELS } from '../../components'
import { FAMILY_LABELS, glossaryEntriesIn, KeywordGlyph, keywordIdentity, keywordStyle } from '../../components/keywordIdentity'
import { CARD_BY_ID, FACTION_BY_ID, type PlayerId } from '../../game'
import { spotlightHeading, type Spotlight } from '../../battle/presentation'
import { durationLabel, impactHeadline, type ImpactChange } from '../../battle/castImpact'
import { FactionBattleArt, factionBattleSignature } from './FactionBattleArt'
import { withBase } from '../../utils/assets'
import styles from './CastSpotlight.module.css'

interface CastSpotlightProps {
  readonly spotlight: Spotlight
  readonly me: PlayerId
  readonly reducedMotion: boolean
  readonly onDismiss: () => void
}

/** Chispas fijas por índice: aleatorias cambiarían en cada render y temblarían. */
const SPARKS = Array.from({ length: 22 }, (_, index) => ({
  x: ((index * 37) % 100) - 50,
  delay: (index * 0.23) % 2.4,
  size: 3 + (index % 4),
}))

/** Runas del círculo del comandante: posiciones fijas alrededor del retrato. */
const RUNES = Array.from({ length: 12 }, (_, index) => index * 30)

/**
 * Términos que no explican nada en el panel: «Nexo» y «Adyacente» salen en
 * casi todas las cartas y solo empujaban fuera lo que de verdad importa.
 */
const PANEL_SKIP = new Set(['nexo', 'adyacencia'])

/** Cuántas unidades afectadas se listan: más no cabe a 1366 × 768. */
const IMPACT_ROWS = 5

const TONE_LABEL: Readonly<Record<ImpactChange['tone'], string>> = {
  harm: 'Daño', boon: 'Mejora', control: 'Control', neutral: 'Cambio',
}

function ChangeChip({ change }: { change: ImpactChange }) {
  const identity = change.glossaryId ? keywordIdentity(change.glossaryId) : undefined
  return (
    <span
      className={styles.chip}
      data-tone={change.tone}
      style={change.glossaryId ? keywordStyle(change.glossaryId) : undefined}
      title={TONE_LABEL[change.tone]}
    >
      {identity && <KeywordGlyph glyph={identity.glyph} className={styles.chipGlyph} />}
      {change.label}
    </span>
  )
}

/**
 * La carta lanzada, en grande y en el centro, antes de que su efecto llegue
 * al tablero. Existe porque el rival jugaba hechizos que solo se notaban por
 * sus consecuencias: una unidad propia moría y no había forma de saber qué la
 * había matado ni de leer la carta.
 *
 * Junto a la carta va el panel «Qué hace»: cada término con su icono, color
 * y definición, cuánto dura y a quién ha afectado. El propietario pidió que
 * el efecto se entendiera sin tener que pasar el ratón por el texto.
 *
 * El poder de comandante tiene entrada propia: el retrato del comandante en
 * un círculo de runas, con onda de choque, antes de que aparezca la carta.
 * Ocurre una vez por partida y tiene que pesar más que cualquier hechizo.
 */
export function CastSpotlight({ spotlight, me, reducedMotion, onDismiss }: CastSpotlightProps) {
  const mine = spotlight.caster === me
  const signature = factionBattleSignature(spotlight.card.faction)
  const accent = FACTION_BY_ID[spotlight.card.faction].accentColor
  const targetCard = spotlight.target?.cardId ? CARD_BY_ID[spotlight.target.cardId] : undefined
  const power = spotlight.kind === 'power'

  // Se puede cerrar con el teclado sin buscar el ratón; se captura antes que
  // los atajos de la partida para que Espacio no dispare otra acción debajo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter' && event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onDismiss()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onDismiss])

  const heading = spotlightHeading(spotlight, me)
  const terms = glossaryEntriesIn(spotlight.card.rules).filter((entry) => !PANEL_SKIP.has(entry.id))
  const duration = durationLabel(spotlight.card.rules)
  const impact = spotlight.impact
  const headline = impact ? impactHeadline(impact, me) : undefined
  const affected = impact?.pieces.slice(0, IMPACT_ROWS) ?? []
  const hidden = (impact?.pieces.length ?? 0) - affected.length
  const announcement = `${heading}: ${spotlight.card.name}${spotlight.target ? `, sobre ${spotlight.target.label}` : ''}. ${spotlight.card.rules}${headline ? ` ${headline}.` : ''}`

  return (
    <div
      className={styles.overlay}
      data-side={mine ? 'own' : 'rival'}
      data-kind={spotlight.kind}
      data-faction={spotlight.card.faction}
      data-tide={spotlight.tide}
      data-rarity={spotlight.card.rarity}
      data-reduced-motion={reducedMotion || undefined}
      style={{ '--accent': accent, '--spotlight-ms': `${spotlight.durationMs}ms` } as CSSProperties}
      onClick={onDismiss}
      data-testid="cast-spotlight"
    >
      <p className={styles.srOnly} role="status" aria-live="assertive">{announcement}</p>
      {power && (
        <>
          <span className={styles.barTop} aria-hidden="true" />
          <span className={styles.barBottom} aria-hidden="true" />
          {!reducedMotion && (
            <div className={styles.powerIntro} aria-hidden="true">
              <span className={styles.powerFlare} />
              <span className={styles.shockwave} />
              <span className={styles.shockwave} data-late />
              <div className={styles.medallion}>
                <svg className={styles.runeRing} viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="94" />
                  <circle cx="100" cy="100" r="82" strokeDasharray="4 9" />
                  {RUNES.map((angle) => (
                    <path key={angle} d="M100 10 l5 8 -5 8 -5 -8 Z" transform={`rotate(${angle} 100 100)`} />
                  ))}
                </svg>
                <img src={withBase(spotlight.card.art.webp)} alt="" />
              </div>
              <p className={styles.powerName}>{spotlight.card.name}</p>
            </div>
          )}
          <span className={styles.flash} aria-hidden="true" />
        </>
      )}
      {!power && (spotlight.card.rarity === 'rare' || spotlight.card.rarity === 'mythic') && !reducedMotion && (
        <span className={styles.landing} aria-hidden="true" />
      )}
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.kicker}>
          <span className={styles.rule} />
          <span className={styles.castSeal}><FactionBattleArt faction={spotlight.card.faction} kind="seal" reducedMotion={reducedMotion} /></span>
          <span>{heading}</span>
          <span className={styles.rule} />
        </div>
        {spotlight.commanderName && <p className={styles.commander}>{spotlight.commanderName}</p>}
        <div className={styles.body}>
          <div className={styles.cardSlot}>
            <span className={styles.halo} />
            <span className={styles.castCrest}><FactionBattleArt faction={spotlight.card.faction} kind="seal" reducedMotion={reducedMotion} /></span>
            <span className={styles.rays} />
            {!reducedMotion && (spotlight.card.rarity === 'mythic' || spotlight.card.rarity === 'rare' || power) && (
              <span className={styles.sparks}>
                {SPARKS.slice(0, spotlight.card.rarity === 'rare' && !power ? 10 : SPARKS.length).map((spark, index) => (
                  <i key={index} style={{ '--x': `${spark.x}%`, '--d': `${spark.delay}s`, '--s': `${spark.size}px` } as CSSProperties} />
                ))}
              </span>
            )}
            <Card card={spotlight.card} size="inspect" reducedMotion={reducedMotion} />
            <span className={styles.sheen} />
          </div>

          <section className={styles.details}>
            <header className={styles.detailsHead}>
              <span>Qué hace</span>
              <small>{power ? 'Poder de comandante' : CARD_TYPE_LABELS[spotlight.card.type]}</small>
            </header>

            <div className={styles.castInscription}>
              <FactionBattleArt faction={spotlight.card.faction} kind="spell" reducedMotion={reducedMotion} />
              <span>{spotlight.tide ? spotlight.tide === 'high' ? 'Pleamar · Ola creciente' : 'Bajamar · Corriente de retorno' : signature.name}</span>
            </div>
            {(impact?.mandate || impact?.sun || spotlight.payment || spotlight.sparkFace) && <ul className={styles.castLedger}>
              {spotlight.payment && <li>Ofrenda · −{spotlight.payment.offering} Vida{spotlight.payment.judged && spotlight.card.effects.some((effect) => effect.kind === 'judgement') ? ' · Juicio activo' : ''}</li>}
              {spotlight.sparkFace && <li><span className={styles.sparkCoin} aria-hidden="true">✦</span> Chispa · {spotlight.sparkFace === 'cara' ? 'Cara' : 'Cruz'}</li>}
              {impact?.mandate && <li>Mandato · {impact.mandate === 'free' ? 'Libre' : impact.mandate === me ? 'Tuyo' : 'Rival'}</li>}
              {(['player', 'ai'] as const).map((id) => {
                const counter = impact?.sun?.[id]
                return counter ? <li key={id}>Cuenta del Sol · {id === me ? 'Tu bando' : 'Rival'} · {counter.before} → {counter.after}</li> : null
              })}
            </ul>}
            {headline && (
              <div className={styles.impact}>
                <strong className={styles.impactHeadline}>{headline}</strong>
                {affected.length > 0 && (
                  <ul className={styles.affected}>
                    {affected.map((piece, index) => {
                      const card = CARD_BY_ID[piece.cardId]
                      return (
                        <li key={piece.instanceId} data-owner={piece.owner === me ? 'own' : 'rival'} style={{ '--i': index } as CSSProperties}>
                          {card && <img src={withBase(card.art.webp)} alt="" />}
                          <span className={styles.affectedName}>{card?.name ?? 'Unidad'}</span>
                          <span className={styles.chips}>
                            {piece.changes.map((change) => <ChangeChip key={change.label} change={change} />)}
                          </span>
                        </li>
                      )
                    })}
                    {hidden > 0 && <li className={styles.more}>y {hidden} más</li>}
                  </ul>
                )}
              </div>
            )}

            {duration && (
              <p className={styles.duration}>
                <KeywordGlyph glyph="hourglass" className={styles.durationGlyph} />
                {duration}
              </p>
            )}

            {terms.length > 0 && (
              <ul className={styles.terms}>
                {terms.map((entry, index) => {
                  const identity = keywordIdentity(entry.id)
                  return (
                    <li
                      key={entry.id}
                      className={styles.term}
                      data-family={identity.family}
                      style={{ ...keywordStyle(entry.id), '--i': index } as CSSProperties}
                    >
                      <span className={styles.termGlyph}><KeywordGlyph glyph={identity.glyph} /></span>
                      <span className={styles.termText}>
                        <strong>{entry.label}<em>{FAMILY_LABELS[identity.family]}</em></strong>
                        <small>{entry.definition}</small>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {!headline && terms.length === 0 && !duration && (
              <p className={styles.plain}>{spotlight.card.rules}</p>
            )}
          </section>

          {spotlight.target && (
            <div className={styles.targetColumn}>
              <span className={styles.castRoute}><FactionBattleArt faction={spotlight.card.faction} kind="spell" reducedMotion={reducedMotion} /></span>
              <span className={styles.castTargetSeal}><FactionBattleArt faction={spotlight.card.faction} kind="seal" reducedMotion={reducedMotion} /></span>
              <div className={styles.target}>
                <span className={styles.targetLabel}>Objetivo</span>
                {targetCard
                  ? <Card card={targetCard} size="thumbnail" reducedMotion className={styles.targetCard} />
                  : <span className={styles.targetNexus}>◆</span>}
                <strong>{spotlight.target.label}</strong>
              </div>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <span className={styles.progress}><span /></span>
          <span className={styles.hint}>Clic o Espacio para continuar</span>
        </div>
      </div>
    </div>
  )
}
