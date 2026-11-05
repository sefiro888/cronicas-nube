import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';

import type { CardDefinition, ManaCost } from '../game/types';
import { Card, CARD_TYPE_LABELS, formatManaCost } from './Card';
import type { CardStatus, CardStatValues } from './Card';
import { FactionSigil, FACTION_LABELS } from './FactionSigil';
import { GlossaryText } from './GlossaryText';
import { RarityGem, RARITY_LABELS } from './RarityGem';
import { KEYWORD_LABELS } from '../utils/cardLabels';
import { withBase } from '../utils/assets';
import { FACTION_BY_ID } from '../game/factions';
import { FullArtwork } from './FullArtwork';
import styles from './CardInspector.module.css';

export interface CardInspectorProps {
  readonly cost?: ManaCost;
  readonly combatStats?: CardStatValues;
  readonly card: CardDefinition | null;
  readonly open?: boolean;
  readonly isOpen?: boolean;
  readonly playable?: boolean;
  readonly statusEffects?: readonly CardStatus[];
  readonly className?: string;
  readonly onClose: () => void;
}


const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function MetaItem({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className={styles.metaItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function CardInspector({
  card,
  open,
  isOpen,
  playable,
  statusEffects = [],
  combatStats,
  cost,
  className,
  onClose,
}: CardInspectorProps) {
  const visible = (open ?? isOpen ?? true) && card !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [view, setView] = useState<'art' | 'card'>('art');

  useEffect(() => {
    if (!visible) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, visible]);

  if (!visible || card === null) return null;

  const typeLabel = card.subtype
    ? `${CARD_TYPE_LABELS[card.type]} — ${card.subtype}`
    : CARD_TYPE_LABELS[card.type];

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className={styles.backdrop} onMouseDown={closeFromBackdrop}
      style={{ '--inspection-accent': FACTION_BY_ID[card.faction].accentColor } as CSSProperties}>
      <div
        className={styles.artHaze}
        data-faction={card.faction}
        style={{ backgroundImage: `url(${withBase(card.art.webp)})` }}
        aria-hidden="true"
      />
      <div
        className={[styles.dialog, className].filter(Boolean).join(' ')}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={trapFocus}
      >
        <span className={styles.ambientGlow} data-faction={card.faction} aria-hidden="true" />
        <button className={styles.close} ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar inspección">
          <span aria-hidden="true">×</span>
        </button>

        <div className={styles.cardStage}>
          <div className={styles.viewControls} role="group" aria-label="Vista de la carta">
            <button type="button" aria-pressed={view === 'art'} onClick={() => setView('art')}>Ilustración</button>
            <button type="button" aria-pressed={view === 'card'} onClick={() => setView('card')}>Carta completa</button>
          </div>
          <div className={styles.exhibit} data-view={view}>
            {view === 'art' ? (
              <FullArtwork key={card.id} card={card} className={styles.fullArtwork} />
            ) : (
              <Card card={card} size="inspect" playable={playable} statusEffects={statusEffects} combatStats={combatStats} cost={cost} />
            )}
          </div>
          <p className={styles.shortcutHint}>Pulsa <kbd>Esc</kbd> para cerrar</p>
        </div>

        <section className={styles.details}>
          <header className={styles.heading}>
            <div className={styles.identity}>
              <FactionSigil faction={card.faction} size="large" />
              <div>
                <p className={styles.eyebrow}>{FACTION_LABELS[card.faction]} · {typeLabel}</p>
                <h2 id={titleId}>{card.name}</h2>
              </div>
            </div>
            <div className={styles.rarity}>
              <RarityGem rarity={card.rarity} />
              <span>{RARITY_LABELS[card.rarity]}</span>
            </div>
          </header>

          <p className={styles.srDescription} id={descriptionId}>
            Vista detallada de {card.name}. Los términos subrayados incluyen una definición contextual.
          </p>

          <div className={styles.rulesPanel}>
            <span className={styles.sectionLabel}>Texto de reglas</span>
            <p><GlossaryText text={card.rules} /></p>
          </div>

          <blockquote className={styles.flavor}>«{card.flavor}»</blockquote>

          <dl className={styles.metadata}>
            <MetaItem label="Coste" value={formatManaCost(cost ?? card.cost)} />
            {card.attack !== undefined && <MetaItem label="Ataque" value={combatStats?.attack ?? card.attack} />}
            {card.health !== undefined && <MetaItem label="Vida" value={combatStats?.health ?? card.health} />}
            {card.resistance !== undefined && <MetaItem label="Resistencia" value={combatStats?.resistance ?? card.resistance} />}
            {card.range !== undefined && <MetaItem label="Alcance" value={card.range} />}
            {card.movement !== undefined && <MetaItem label="Movimiento" value={card.movement} />}
            <MetaItem label="Colección" value={`${card.set} · ${String(card.collectorNumber).padStart(3, '0')}`} />
            <MetaItem label="Artista" value={card.artist} />
          </dl>

          {(card.unique || card.keywords.length > 0) && (
            <div className={styles.tags} aria-label="Palabras clave">
              {card.unique && <span className={styles.uniqueTag}>✦ Única</span>}
              {card.keywords.map((keyword) => <span key={keyword}>{KEYWORD_LABELS[keyword]}</span>)}
            </div>
          )}

          {statusEffects.length > 0 && (
            <p className={styles.stateNote}>
              Esta copia tiene {statusEffects.length} {statusEffects.length === 1 ? 'estado activo' : 'estados activos'}.
              {view === 'art' ? ' Abre «Carta completa» para consultarlos.' : ' Se muestran sobre la carta.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
