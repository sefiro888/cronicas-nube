import { useEffect, type CSSProperties } from 'react'
import { Card, FactionSigil, RARITY_LABELS } from '../../components'
import { BattlePlate } from './BattlePlate'
import { CARD_BY_ID, COMMANDER_BY_ID, FACTION_BY_ID, type FactionId, type PlayerId } from '../../game'
import { inspectionStatuses } from '../../battle/inspectionStatuses'
import { combatTraits, type CombatExchange, type CombatSide } from '../../battle/presentation'
import { withBase } from '../../utils/assets'
import { attackKindFor } from '../../battle/attackStyle'
import { FactionBattleArt, factionBattleSignature } from './FactionBattleArt'
import { NexusReliquary } from './NexusReliquary'
import styles from './CombatDuel.module.css'

interface CombatDuelProps {
  readonly exchange: CombatExchange
  readonly me: PlayerId
  /** Comandante de cada bando, para poner cara al Nexo cuando es el objetivo. */
  readonly commanderIds: Readonly<Record<PlayerId, string>>
  /** Vida actual de cada Nexo: si el objetivo es un Nexo, cuánto le queda importa más que su nombre. */
  readonly nexusHealth: Readonly<Record<PlayerId, number>>
  readonly nexusMaxHealth?: Readonly<Record<PlayerId, number>>
  /** El golpe aún no ha caído: se puede adelantar con un clic. */
  readonly holding: boolean
  readonly reducedMotion: boolean
  readonly onSkip: () => void
  /** Ataques seguidos del mismo bando en este turno, desde el segundo. */
  readonly combo?: number
}

/** Habilidad del duelo → término del glosario que le da icono y color. */
const TRAIT_GLOSSARY: Readonly<Record<string, string>> = {
  'swift-strike': 'golpe-veloz',
  pierce: 'perforar',
  lifelink: 'vinculo-vital',
  stun: 'aturdir',
  flying: 'volador',
  guard: 'guardia',
  shield: 'escudo',
  buff: 'furor',
}

/**
 * Fragmentos en que estalla una carta destruida. Polígonos fijos que cubren
 * la carta entera: aleatorios cambiarían en cada render y se notaría el salto.
 * `dx`/`dy` es hacia dónde sale despedido cada uno, `r` cuánto gira.
 */
const SHARDS = [
  { clip: 'polygon(0 0, 46% 0, 30% 34%, 0 22%)', dx: -90, dy: -120, r: -40 },
  { clip: 'polygon(46% 0, 100% 0, 100% 18%, 58% 30%, 30% 34%)', dx: 40, dy: -150, r: 30 },
  { clip: 'polygon(100% 18%, 100% 52%, 70% 56%, 58% 30%)', dx: 130, dy: -40, r: 55 },
  { clip: 'polygon(0 22%, 30% 34%, 42% 60%, 0 58%)', dx: -140, dy: 10, r: -60 },
  { clip: 'polygon(30% 34%, 58% 30%, 70% 56%, 42% 60%)', dx: 10, dy: -30, r: 80 },
  { clip: 'polygon(0 58%, 42% 60%, 34% 100%, 0 100%)', dx: -100, dy: 140, r: -30 },
  { clip: 'polygon(42% 60%, 70% 56%, 72% 100%, 34% 100%)', dx: 20, dy: 170, r: 45 },
  { clip: 'polygon(70% 56%, 100% 52%, 100% 100%, 72% 100%)', dx: 120, dy: 120, r: 70 },
] as const

/** Chispas del impacto, repartidas en círculo. Más cuanto más rara es quien golpea. */
const SPARK_COUNT: Readonly<Record<string, number>> = { common: 8, uncommon: 11, rare: 15, mythic: 22 }

/** Fragmentos que orbitan el cristal: fijos para que no tiemblen entre renders. */
const ORBIT = Array.from({ length: 7 }, (_, index) => ({ angle: index * (360 / 7), radius: 46 + (index % 3) * 6, speed: 7 + (index % 4) * 2 }))

/**
 * El Nexo como monolito de cristal. Sustituye a una plaquita con un retrato
 * redondo que, según el propietario, «no es nada imponente» justo en el
 * momento más importante: cuando le pegan. El retrato del comandante queda
 * dentro del cristal, rodeado de runas; la Vida es una barra que se vacía con
 * el golpe; el cristal se agrieta según la Vida perdida y por debajo de un
 * cuarto late en rojo.
 */
function NexusMonolith({ artUrl, faction, name, health, maxHealth, damage }: {
  artUrl?: string
  faction?: FactionId
  name?: string
  health: number
  maxHealth?: number
  damage: number
}) {
  // La Torre puede dar más Vida que la del comandante: el máximo nunca baja de la actual.
  const max = Math.max(1, maxHealth ?? health, health + damage)
  const ratio = Math.max(0, Math.min(1, health / max))
  const wear = ratio > 0.75 ? 0 : ratio > 0.5 ? 1 : ratio > 0.25 ? 2 : 3
  return (
    <div className={styles.monolith} data-testid="duel-nexus" data-wear={wear} data-critical={ratio <= 0.25 || undefined} data-hit={damage > 0 || undefined}>
      <span className={styles.monolithAura} />
      <span className={styles.orbit} aria-hidden="true">
        {ORBIT.map((shard, index) => (
          <i key={index} style={{ '--a': `${shard.angle}deg`, '--r': `${shard.radius}%`, '--t': `${shard.speed}s` } as CSSProperties} />
        ))}
      </span>
      <div className={styles.crystal}>
        <NexusReliquary className={styles.facets} integrity={ratio} />
        <span className={styles.core} />
        {faction && <span className={styles.relicSeal}><FactionBattleArt faction={faction} kind="seal" /></span>}
        <div className={styles.portrait}>
          <svg className={styles.runes} viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="47" />
            <circle cx="50" cy="50" r="41" strokeDasharray="2 5" />
          </svg>
          {artUrl && <img src={artUrl} alt="" />}
        </div>
        <svg className={styles.nexusCracks} viewBox="0 0 100 160" aria-hidden="true">
          <path d="M50 18 L44 40 L54 56 L46 78" data-wear="1" />
          <path d="M44 40 L26 52 L22 74 M54 56 L74 64 L80 88" data-wear="2" />
          <path d="M46 78 L40 104 L52 126 M46 78 L64 100 L60 140 M26 52 L14 40" data-wear="3" />
        </svg>
        <strong className={styles.nexusTitle}>{faction && <FactionSigil faction={faction} decorative size="small" />}Nexo</strong>
        <small className={styles.nexusName}>{name}</small>
      </div>
      {damage > 0 && (
        <span key={`burst${damage}`} className={styles.crystalBurst} aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--a': `${index * 30 + 8}deg` } as CSSProperties} />)}
        </span>
      )}
      <div className={styles.lifeBar} aria-label={`Vida del Nexo: ${health} de ${max}`}>
        <span className={styles.lifeFill} style={{ '--ratio': ratio } as CSSProperties} />
        {damage > 0 && <span key={`loss${damage}`} className={styles.lifeLoss} style={{ '--from': Math.min(1, (health + damage) / max), '--ratio': ratio } as CSSProperties} />}
        <span key={health} className={styles.lifeValue}>{health}<small>/{max}</small></span>
      </div>
    </div>
  )
}

function Fighter({ side, role, me, commanderIds, nexusHealth, nexusMaxHealth, phase, holding, foeFaction, foeRarity, reducedMotion }: {
  side: CombatSide
  role: 'attacker' | 'defender'
  me: PlayerId
  commanderIds: CombatDuelProps['commanderIds']
  nexusHealth: CombatDuelProps['nexusHealth']
  nexusMaxHealth?: CombatDuelProps['nexusMaxHealth']
  phase: CombatExchange['phase']
  holding: boolean
  /** Rareza de quien le golpea: decide el color del tajo y las chispas. */
  foeRarity: string
  foeFaction?: FactionId
  reducedMotion: boolean
}) {
  const card = side.cardId ? CARD_BY_ID[side.cardId] : undefined
  const owner = side.owner === me ? 'own' : 'rival'
  const commander = COMMANDER_BY_ID[commanderIds[side.owner]]
  const faction = card?.faction ?? commander?.faction
  const accent = faction ? FACTION_BY_ID[faction].accentColor : '#d8b46a'
  const traits = combatTraits(side, role)
  const rarity = card?.rarity ?? 'mythic'
  const hit = side.damage > 0
  const sparks = SPARK_COUNT[foeRarity] ?? 8
  const shatter = side.destroyed && !side.nexus && card && !reducedMotion && side.renacer === undefined
  const life = side.health?.after
  const stats = card && life !== undefined ? card.type === 'structure' ? { resistance: life } : { health: life } : undefined
  return (
    <div
      className={styles.fighter}
      data-role={role}
      data-owner={owner}
      data-phase={phase}
      data-rarity={card ? rarity : 'nexus'}
      data-destroyed={side.destroyed || undefined}
      data-hit={hit || undefined}
      data-heavy={side.damage >= 3 || side.destroyed || undefined}
      style={{ '--accent': accent, '--foe': foeFaction ? factionBattleSignature(foeFaction).light : `var(--rarity-${foeRarity})` } as CSSProperties}
    >
      <div className={styles.tag}>
        {faction && <span className={styles.tagSeal}><FactionBattleArt faction={faction} kind="seal" reducedMotion={reducedMotion} /></span>}
        <span className={styles.role}>{role === 'attacker' ? <><span className={styles.swords}>⚔</span> Ataca</> : 'Defiende'}</span>
        <span className={styles.owner}>{owner === 'own' ? 'Tu bando' : 'Rival'}</span>
        {card && rarity !== 'common' && <span className={styles.tagRarity}>{RARITY_LABELS[rarity]}</span>}
      </div>
      <div className={styles.cardWrap}>
        <span className={styles.glow} />
        {card && rarity !== 'common' && <span className={styles.rarityFrame} aria-hidden="true" />}
        {card && (rarity === 'rare' || rarity === 'mythic') && (
          <span className={styles.embers} aria-hidden="true">
            {Array.from({ length: rarity === 'mythic' ? 10 : 5 }, (_, index) => <i key={index} style={{ '--n': index } as CSSProperties} />)}
          </span>
        )}
        {card
          ? <Card card={card} size="hand" reducedMotion combatStats={stats} statusEffects={inspectionStatuses(side.piece)} />
          : (
            <NexusMonolith
              artUrl={commander ? withBase(commander.art.webp) : undefined}
              faction={commander?.faction}
              name={commander?.name}
              health={phase === 'intro' ? side.health?.before ?? nexusHealth[side.owner] : nexusHealth[side.owner]}
              maxHealth={nexusMaxHealth?.[side.owner] ?? commander?.nexusHealth}
              damage={side.damage}
            />
          )}
        {hit && !reducedMotion && (
          <>
            {foeFaction && <span key={`impact${side.damage}`} className={styles.contactSeal} aria-hidden="true">
              <FactionBattleArt faction={foeFaction} kind="seal" />
            </span>}
            <span key={`sparks${side.damage}`} className={styles.sparks} aria-hidden="true">
              {Array.from({ length: sparks }, (_, index) => (
                <i key={index} style={{ '--a': `${(index / sparks) * 360 + 11}deg`, '--l': `${60 + (index % 3) * 26}px` } as CSSProperties} />
              ))}
            </span>
            <svg className={styles.cracks} data-level={side.destroyed ? 3 : side.damage >= 3 ? 2 : 1} viewBox="0 0 100 140" aria-hidden="true">
              <path d="M52 40 L44 58 L56 70 L46 92" />
              <path d="M44 58 L26 62 L18 78" data-level="2" />
              <path d="M56 70 L76 76 L84 96" data-level="2" />
              <path d="M46 92 L38 118 M46 92 L62 112 L66 132" data-level="3" />
              <path d="M52 40 L64 22 L78 16" data-level="3" />
            </svg>
          </>
        )}
        {shatter && (
          <span className={styles.shards} aria-hidden="true">
            {SHARDS.map((shard, index) => (
              <i
                key={index}
                style={{
                  clipPath: shard.clip,
                  backgroundImage: `url("${withBase(card.art.webp)}")`,
                  '--dx': `${shard.dx}px`, '--dy': `${shard.dy}px`, '--r': `${shard.r}deg`,
                } as CSSProperties}
              />
            ))}
          </span>
        )}
      </div>
      <div className={styles.outcome} aria-label={`Resultado de ${side.name}`}>
        {side.absorbed > 0 && <span className={styles.absorbed}>⬡ {side.absorbed} absorbidos</span>}
        {hit && <span key={side.damage} className={styles.damage}>−{side.damage}</span>}
        {hit && !side.nexus && side.health && <span className={styles.lifeChange}>{card?.type === 'structure' ? 'Resistencia' : 'Vida'} {side.health.before} → {side.health.after}</span>}
        {role === 'attacker' && side.countered && <span key={`c${side.damage}`} className={styles.counterTag}>¡Contraataque!</span>}
        {hit && side.nexus && side.health && <span className={styles.lifeChange}>Vida {side.health.before} → {nexusHealth[side.owner]}</span>}
        {side.excess !== undefined && <span className={styles.lifeChange}>Perforar · {side.excess} al Nexo</span>}
        {side.destroyed && <span className={styles.stamp} data-renacer={side.renacer !== undefined || undefined}>
          {side.renacer !== undefined ? `Renacer · a la mano +${side.renacer}/+${side.renacer}` : side.nexus ? 'Nexo derribado' : 'Destruida'}
        </span>}
      </div>
      {traits.length > 0 && (
        <ul className={styles.traits}>
          {traits.map((trait) => (
            <li key={trait.id}>
              <BattlePlate label={trait.label} detail={trait.detail} keyword={TRAIT_GLOSSARY[trait.id]}
                faction={faction} active={trait.active} compact />
            </li>
          ))}
        </ul>
      )}
      {role === 'attacker' && holding && <span className={styles.skip}>Clic para golpear ya</span>}
    </div>
  )
}

/**
 * Duelo de combate: las dos cartas que chocan, grandes y a los lados del
 * tablero para no tapar la embestida. Sustituye a un rótulo de retratos
 * diminutos donde los nombres salían cortados y no se veía qué carta era ni
 * qué habilidades entraban en juego.
 *
 * El golpe tiene tres tiempos (carga, impacto y reacción) porque el
 * propietario lo encontraba soso: dos cartas que se acercaban y un «−3».
 * Ahora la atacante se echa atrás antes de embestir, el impacto congela la
 * imagen un instante con destello y sacudida proporcional al daño, la
 * golpeada se agrieta y, si cae, estalla en fragmentos. La rareza de quien
 * golpea cambia el color del tajo y la cantidad de chispas.
 */
export function CombatDuel({ exchange, me, commanderIds, nexusHealth, nexusMaxHealth, holding, onSkip, combo, reducedMotion }: CombatDuelProps) {
  const { attacker, defender } = exchange

  useEffect(() => {
    if (!holding) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter' && event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onSkip()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [holding, onSkip])

  const rarityOf = (side: CombatSide) => (side.cardId ? CARD_BY_ID[side.cardId]?.rarity : undefined) ?? 'common'
  const attackCard = attacker.cardId ? CARD_BY_ID[attacker.cardId] : undefined
  const defendCard = defender.cardId ? CARD_BY_ID[defender.cardId] : undefined
  const totalDamage = attacker.damage + defender.damage
  const summary = `${attacker.name} ataca a ${defender.name}${defender.damage ? `, ${defender.damage} de daño` : ''}${defender.destroyed ? ', cae' : ''}${attacker.damage ? `; recibe ${attacker.damage}` : ''}${attacker.destroyed ? ' y cae' : ''}.`
  return (
    <div
      key={exchange.key}
      className={styles.duel}
      data-phase={exchange.phase}
      data-holding={holding || undefined}
      data-struck={totalDamage > 0 || undefined}
      data-attacker-rarity={rarityOf(attacker)}
      data-attack-gesture={attackKindFor(attackCard, (attackCard?.range ?? 1) <= 1)}
      data-static={reducedMotion || undefined}
      data-finisher={exchange.finisher || undefined}
      data-counter={attacker.countered || undefined}
      style={{ '--shake': `${Math.min(18, 3 + totalDamage * 2 + (combo ?? 0) * 1.5)}px`, '--combo': combo ?? 0 } as CSSProperties}
      onClick={holding ? onSkip : undefined}
      data-testid="combat-duel"
    >
      <p className={styles.srOnly} role="status" aria-live="polite">{summary}</p>
      {/* Sin emblema central: arriba en el centro está el Nexo rival, que es
          justo lo que hay que ver cuando es el objetivo. El destello del
          choque cruza la pantalla sin quedarse. */}
      {exchange.phase === 'clash' && attackCard && (
        <div className={styles.crossing}>
          <FactionBattleArt faction={attackCard.faction} kind="strike" attack={attackKindFor(attackCard, (attackCard.range ?? 1) <= 1)} reducedMotion={reducedMotion} />
          {attacker.countered && defendCard && <span className={styles.returnStrike}>
            <FactionBattleArt faction={defendCard.faction} kind="strike" attack={attackKindFor(defendCard, (defendCard.range ?? 1) <= 1)} reverse reducedMotion={reducedMotion} />
          </span>}
        </div>
      )}
      {/* Golpe decisivo: la viñeta enmarca el tablero; el CSS ralentiza el choque. */}
      {exchange.finisher && <span className={styles.finisherVignette} aria-hidden="true" />}
      {exchange.finisher && exchange.phase === 'clash' && totalDamage === 0 && <span className={styles.finisherTitle} aria-hidden="true">{defender.nexus ? '¡Golpe al corazón!' : '¡Golpe final!'}</span>}
      {exchange.attackAbility === 'desafio' && <span className={styles.duelAbility}>Desafío · condición cumplida</span>}
      {combo && combo >= 2 && (
        <span key={`combo${combo}`} className={styles.combo} data-level={Math.min(combo, 5)} aria-hidden="true">
          Combo <strong>×{combo}</strong>
        </span>
      )}
        <Fighter side={attacker} role="attacker" me={me} commanderIds={commanderIds} nexusHealth={nexusHealth} nexusMaxHealth={nexusMaxHealth} phase={exchange.phase} holding={holding} foeFaction={defendCard?.faction} foeRarity={rarityOf(defender)} reducedMotion={reducedMotion} />
        <Fighter side={defender} role="defender" me={me} commanderIds={commanderIds} nexusHealth={nexusHealth} nexusMaxHealth={nexusMaxHealth} phase={exchange.phase} holding={holding} foeFaction={attackCard?.faction} foeRarity={rarityOf(attacker)} reducedMotion={reducedMotion} />
    </div>
  )
}
