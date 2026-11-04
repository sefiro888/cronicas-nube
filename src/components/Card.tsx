import { useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';

import type { CardDefinition, CardType, FactionId, ManaCost } from '../game/types';
import { withBase } from '../utils/assets';
import { FactionSigil, FACTION_LABELS } from './FactionSigil';
import { GlossaryText } from './GlossaryText';
import { RarityGem, RARITY_LABELS } from './RarityGem';
import styles from './Card.module.css';
import { FIMBUL_ART_CLIP, FIMBUL_FRAME, frameRuleSize } from '../presentation/cardFrames';

export type CardSize = 'thumbnail' | 'hand' | 'board' | 'gallery' | 'inspect';
export type CardStatusId =
  | 'frozen'
  | 'scorched'
  | 'shielded'
  | 'poisoned'
  | 'stunned'
  | 'exhausted';

export interface CardStatusEffect {
  readonly id: CardStatusId | (string & {});
  readonly label?: string;
  readonly icon?: string;
  readonly tone?: 'neutral' | 'positive' | 'negative';
}

export type CardStatus = CardStatusId | CardStatusEffect;

export type CardStatValues = Readonly<Pick<CardDefinition, 'attack' | 'health' | 'resistance'>>;

export interface CardProps {
  readonly combatStats?: CardStatValues;
  readonly card: CardDefinition;
  readonly size?: CardSize;
  readonly selected?: boolean;
  readonly playable?: boolean;
  readonly disabled?: boolean;
  readonly exhausted?: boolean;
  readonly reducedMotion?: boolean;
  readonly statusEffects?: readonly CardStatus[];
  readonly className?: string;
  readonly onSelect?: (card: CardDefinition) => void;
  readonly onInspect?: (card: CardDefinition) => void;
}

interface ResolvedStatus {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly tone: 'neutral' | 'positive' | 'negative';
}

export const CARD_TYPE_LABELS: Readonly<Record<CardType, string>> = {
  mana: 'Esencia',
  unit: 'Unidad',
  instant: 'Hechizo inmediato',
  structure: 'Estructura',
};

const STATUS_PRESETS: Readonly<Record<CardStatusId, ResolvedStatus>> = {
  frozen: { id: 'frozen', label: 'Congelada', icon: '❄', tone: 'negative' },
  scorched: { id: 'scorched', label: 'Abrasada', icon: '◇', tone: 'negative' },
  shielded: { id: 'shielded', label: 'Escudo', icon: '⬡', tone: 'positive' },
  poisoned: { id: 'poisoned', label: 'Veneno', icon: '⌁', tone: 'negative' },
  stunned: { id: 'stunned', label: 'Aturdida', icon: '✦', tone: 'negative' },
  exhausted: { id: 'exhausted', label: 'Agotada', icon: '◒', tone: 'neutral' },
};

const SIZE_CLASS: Readonly<Record<CardSize, string>> = {
  thumbnail: styles.thumbnail!,
  hand: styles.hand!,
  board: styles.board!,
  gallery: styles.gallery!,
  inspect: styles.inspect!,
};

/** Tamaños grandes donde la inclinación 3D y el parallax merecen la pena. */
const TILT_SIZES: ReadonlySet<CardSize> = new Set<CardSize>(['gallery', 'inspect', 'hand']);

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const FACTION_ORDER: readonly FactionId[] = [
  'fury',
  'arcane',
  'nature',
  'order',
  'shadow',
  'void',
];

const resolveStatus = (status: CardStatus): ResolvedStatus => {
  if (typeof status === 'string') {
    return STATUS_PRESETS[status];
  }
  const preset = STATUS_PRESETS[status.id as CardStatusId];
  return {
    id: status.id,
    label: status.label ?? preset?.label ?? status.id,
    icon: status.icon ?? preset?.icon ?? '•',
    tone: status.tone ?? preset?.tone ?? 'neutral',
  };
};

const buildPlaceholder = (card: CardDefinition): string => {
  const accent = card.faction === 'arcane' ? '#75dcff' : card.color;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560"><defs><radialGradient id="g"><stop stop-color="${accent}" stop-opacity=".62"/><stop offset="1" stop-color="#080a11"/></radialGradient></defs><rect width="800" height="560" fill="url(#g)"/><circle cx="400" cy="245" r="120" fill="none" stroke="${accent}" stroke-width="12" opacity=".8"/><path d="M80 480 270 250l90 110 80-90 280 210Z" fill="#090b12" opacity=".9"/><path d="m400 90 28 96 94 30-94 30-28 96-28-96-94-30 94-30Z" fill="${accent}" opacity=".72"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

function CardArtwork({ card, eager }: { readonly card: CardDefinition; readonly eager: boolean }) {
  const placeholder = useMemo(() => buildPlaceholder(card), [card]);
  const sources = useMemo(
    () => [withBase(card.art.webp), withBase(card.art.fallback), placeholder].filter((source, index, list) => list.indexOf(source) === index),
    [card.art.fallback, card.art.webp, placeholder],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  const source = sources[sourceIndex] ?? placeholder;
  return (
    <img
      className={styles.artImage}
      src={source}
      alt={card.art.alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setSourceIndex((current) => Math.min(current + 1, sources.length - 1))}
    />
  );
}

export function formatManaCost(cost: ManaCost): string {
  const parts: string[] = [];
  for (const faction of FACTION_ORDER) {
    const amount = cost.colored[faction];
    if (amount) parts.push(`${amount} ${FACTION_LABELS[faction]}`);
  }
  if (cost.generic) parts.push(`${cost.generic} genérico`);
  return parts.length > 0 ? parts.join(' y ') : 'sin coste';
}

function ManaCostBadge({ cost, affordable, framed }: { readonly cost: ManaCost; readonly affordable?: boolean; readonly framed?: boolean }) {
  const colored = FACTION_ORDER.flatMap((faction) => {
    const amount = cost.colored[faction];
    return amount ? [{ faction, amount }] : [];
  });

  const total = cost.generic + colored.reduce((sum, entry) => sum + entry.amount, 0);
  return (
    <div
      className={styles.cost}
      data-affordable={affordable === undefined ? undefined : String(affordable)}
      aria-label={`Coste: ${formatManaCost(cost)}${affordable === false ? '. No tienes Esencia suficiente.' : ''}`}
      title={`Coste: ${formatManaCost(cost)}`}
    >
      {framed && <strong className={styles.frameCostTotal}>{total}</strong>}
      <span className={framed ? styles.frameCostDetail : styles.costParts}>
      {colored.map(({ faction, amount }) => (
        <span className={styles.coloredCost} data-faction={faction} key={faction}>
          <strong>{amount}</strong>
        </span>
      ))}
      {(cost.generic > 0 || colored.length === 0) && (
        <span className={styles.genericCost} aria-label={`${cost.generic} genérico`}>
          {cost.generic}
        </span>
      )}
      </span>
    </div>
  );
}

function CardStats({ card, values }: { readonly card: CardDefinition; readonly values?: CardStatValues }) {
  const { attack, health, resistance } = { ...card, ...values };
  const hasCombatStats = attack !== undefined || health !== undefined;
  if (!hasCombatStats && resistance === undefined) return null;

  return (
    <div className={styles.stats} aria-label="Estadísticas">
      {attack !== undefined && (
        <span className={`${styles.stat} ${styles.attack}`} title={`Ataque ${attack}`}>
          <small>ATQ</small><strong>{attack}</strong>
        </span>
      )}
      {health !== undefined && (
        <span className={`${styles.stat} ${styles.health}`} title={`Vida ${health}`}>
          <small>VID</small><strong>{health}</strong>
        </span>
      )}
      {resistance !== undefined && (
        <span className={`${styles.stat} ${styles.resistance}`} title={`Resistencia ${resistance}`}>
          <small>RES</small><strong>{resistance}</strong>
        </span>
      )}
    </div>
  );
}

export function Card({
  card,
  size = 'gallery',
  selected = false,
  playable,
  disabled = false,
  exhausted = false,
  reducedMotion = false,
  statusEffects = [],
  combatStats,
  className,
  onSelect,
  onInspect,
}: CardProps) {
  const statuses = statusEffects.map(resolveStatus);
  const isExhausted = exhausted || statuses.some((status) => status.id === 'exhausted');
  const isInteractive = Boolean(onSelect || onInspect);
  const framed = card.faction === 'fimbul';
  const { x, y, width, height } = FIMBUL_FRAME.art;
  const cardStyle = { '--card-color': card.color, ...(framed && {
    '--frame-window': FIMBUL_ART_CLIP, '--frame-rule-size': `${frameRuleSize(card.rules.length)}cqw`,
    '--frame-art-x': `${x * 100}%`, '--frame-art-y': `${y * 100}%`,
    '--frame-art-width': `${width * 100}%`, '--frame-art-height': `${height * 100}%`,
  }) } as CSSProperties;
  const typeLine = card.subtype ? `${CARD_TYPE_LABELS[card.type]} — ${card.subtype}` : CARD_TYPE_LABELS[card.type];
  const stateDescription = [
    playable === true ? 'jugable' : playable === false ? 'no jugable' : '',
    disabled ? 'deshabilitada' : '',
    selected ? 'seleccionada' : '',
    ...statuses.map((status) => status.label),
  ].filter(Boolean).join(', ');
  const accessibleLabel = `${card.name}. ${typeLine}. Coste ${formatManaCost(card.cost)}. ${RARITY_LABELS[card.rarity]}${stateDescription ? `. ${stateDescription}` : ''}`;

  const tiltEnabled = isInteractive && TILT_SIZES.has(size) && !reducedMotion;

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!tiltEnabled || prefersReducedMotion()) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width; // 0 (izq) … 1 (der)
    const py = (event.clientY - rect.top) / rect.height; // 0 (arr) … 1 (abj)
    element.style.setProperty('--tilt-y', `${((px - 0.5) * 13).toFixed(2)}deg`);
    element.style.setProperty('--tilt-x', `${((0.5 - py) * 10).toFixed(2)}deg`);
    element.style.setProperty('--par-x', `${((0.5 - px) * 7).toFixed(1)}%`);
    element.style.setProperty('--par-y', `${((0.5 - py) * 7).toFixed(1)}%`);
    element.style.setProperty('--foil-x', `${(px * 100).toFixed(0)}%`);
    element.style.setProperty('--foil-y', `${(py * 100).toFixed(0)}%`);
  };

  const resetTilt = (event: PointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    for (const prop of ['--tilt-x', '--tilt-y', '--par-x', '--par-y', '--foil-x', '--foil-y']) {
      element.style.removeProperty(prop);
    }
  };

  const selectCard = () => {
    if (!disabled) onSelect?.(card);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() === 'i' && onInspect) {
      event.preventDefault();
      onInspect(card);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onSelect) selectCard();
      else onInspect?.(card);
    }
  };

  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!onInspect) return;
    event.preventDefault();
    onInspect(card);
  };

  return (
    <article
      className={[
        styles.card,
        SIZE_CLASS[size],
        isInteractive && styles.interactive,
        selected && styles.selected,
        playable === true && styles.playable,
        playable === false && styles.unplayable,
        disabled && styles.disabled,
        isExhausted && styles.exhausted,
        className,
      ].filter(Boolean).join(' ')}
      style={cardStyle}
      data-card-id={card.id}
      data-faction={card.faction}
      data-frame={framed ? 'fimbul-hielo' : undefined}
      data-frame-dense={framed && card.rules.length > 110 || undefined}
      data-rarity={card.rarity}
      data-reduced-motion={reducedMotion || undefined}
      data-frozen={statuses.some((status) => status.id === 'frozen') || undefined}
      data-scorched={statuses.some((status) => status.id === 'scorched') || undefined}
      role={isInteractive ? 'button' : 'group'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={accessibleLabel}
      aria-pressed={onSelect ? selected : undefined}
      aria-disabled={disabled || undefined}
      onClick={onSelect ? selectCard : undefined}
      onDoubleClick={onInspect ? () => onInspect(card) : undefined}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onPointerMove={tiltEnabled ? handlePointerMove : undefined}
      onPointerLeave={tiltEnabled ? resetTilt : undefined}
    >
      {framed && <img className={styles.factionFrame} src={withBase(FIMBUL_FRAME.asset)} alt="" aria-hidden="true" draggable={false} />}
      <span className={styles.frameFiligree} aria-hidden="true" />
      <span className={styles.foil} aria-hidden="true" />
      <ManaCostBadge cost={card.cost} affordable={playable} framed={framed} />
      <div className={styles.header}>
        <h3 className={styles.name}>{card.name}</h3>
        {card.unique && <span className={styles.unique} title="Carta única" aria-label="Carta única">✦</span>}
        <RarityGem rarity={card.rarity} compact={size === 'thumbnail' || size === 'board'} />
      </div>

      <div className={styles.artwork}>
        <CardArtwork
          key={`${card.id}-${card.art.webp}-${card.art.fallback}`}
          card={card}
          eager={size === 'hand' || size === 'board' || size === 'inspect'}
        />
        <span className={styles.artVignette} aria-hidden="true" />
        <span className={styles.factionSeal}>
          <FactionSigil faction={card.faction} size={size === 'inspect' ? 'large' : 'medium'} />
        </span>
      </div>

      <div className={styles.typeLine}>
        <span>{typeLine}</span>
        {card.range !== undefined && <span className={styles.microStat} title={`Alcance ${card.range}`}>ALC {card.range}</span>}
        {card.movement !== undefined && <span className={styles.microStat} title={`Movimiento ${card.movement}`}>MOV {card.movement}</span>}
      </div>

      <div className={styles.textBox}>
        <p className={styles.rules}>
          <GlossaryText text={card.rules} interactive={size === 'inspect'} />
        </p>
        <p className={styles.flavor}>«{card.flavor}»</p>
      </div>

      <div className={styles.footer}>
        <span className={styles.collection} title={`${card.set}, carta ${card.collectorNumber}`}>
          {card.set} · {String(card.collectorNumber).padStart(3, '0')}
        </span>
        <CardStats card={card} values={combatStats} />
      </div>

      {statuses.length > 0 && (
        <div className={styles.statuses} aria-label="Estados activos">
          {statuses.map((status, index) => (
            <span
              className={styles.status}
              data-tone={status.tone}
              title={status.label}
              key={`${status.id}-${index}`}
            >
              <span aria-hidden="true">{status.icon}</span>
              <span className={styles.statusLabel}>{status.label}</span>
            </span>
          ))}
        </div>
      )}

      {selected && <span className={styles.selectionMark} aria-hidden="true">SELECCIONADA</span>}
      {playable === true && <span className={styles.playableMark} aria-hidden="true">LISTA</span>}
      {isExhausted && <span className={styles.exhaustedVeil} aria-hidden="true" />}
    </article>
  );
}
