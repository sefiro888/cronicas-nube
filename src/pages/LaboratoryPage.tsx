import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { CardInspector } from '../components/CardInspector'
import { FACTION_LABELS } from '../components/FactionSigil'
import {
  applyAction,
  clearAnimationQueue,
  decisionOptions,
  getValidMoves,
  getValidAttacks,
  handCardCost,
} from '../game/engine'
import { BOARD_SIZE } from '../game/board'
import { CARD_BY_ID } from '../game/cards'
import { COMMANDER_BY_ID, STARTER_DECKS } from '../game/decks'
import { terrainAt } from '../game/terrain'
import { runoAttackBonus } from '../game/kalevala'
import { formationAttackBonus } from '../game/tercios'
import {
  FACTION_IDS,
  type CardDefinition,
  type FactionId,
  type GameAction,
  type Position,
  type SpellTarget,
} from '../game/types'
import {
  addLaboratoryCard,
  addLaboratoryResource,
  createLaboratoryMatch,
  rechargeLaboratoryResources,
} from '../game/adventureLaboratory'
import { usePreferences } from '../store/preferences'
import { withBase } from '../utils/assets'
import styles from './LaboratoryPage.module.css'

export function LaboratoryPage() {
  const preferred = usePreferences((state) => state.selectedDeckId)
  const reducedMotion = usePreferences((state) => state.reducedMotion)
  const [playerDeckId, setPlayerDeckId] = useState(preferred)
  const [enemyDeckId, setEnemyDeckId] = useState(
    STARTER_DECKS.find((deck) => deck.id !== preferred)?.id ?? STARTER_DECKS[1]!.id,
  )
  const [match, setMatch] = useState(() => createLaboratoryMatch(playerDeckId, enemyDeckId))
  const [handId, setHandId] = useState<string>()
  const [pieceId, setPieceId] = useState<string>()
  const [power, setPower] = useState(false)
  const [offering, setOffering] = useState(false)
  const [sparkFace, setSparkFace] = useState<'cara' | 'cruz'>('cara')
  const [message, setMessage] = useState(
    'Sin IA. Tú controlas ambos bandos; las jugadas usan las reglas reales del juego.',
  )
  const [log, setLog] = useState<readonly string[]>([])
  const [search, setSearch] = useState('')
  const [cardId, setCardId] = useState('')
  const [resourceFaction, setResourceFaction] = useState<FactionId>('fury')
  const [inspected, setInspected] = useState<CardDefinition | null>(null)
  const [inspectedCost, setInspectedCost] = useState<ReturnType<typeof handCardCost>>()
  const owner = match.activePlayer
  const active = match.players[owner]
  const selectedHand = active.hand.find((entry) => entry.instanceId === handId)
  const selectedCard = selectedHand ? CARD_BY_ID[selectedHand.cardId] : undefined
  const selectedPiece = match.board.find((entry) => entry.instanceId === pieceId)
  const validMoves = pieceId ? getValidMoves(match, pieceId) : []
  const validAttacks = pieceId ? getValidAttacks(match, pieceId) : undefined
  const choices = match.pendingDecisions?.[0]
  const currentFace = match.pendingSpark?.faces.includes(sparkFace) ? sparkFace : match.pendingSpark?.faces[0] ?? sparkFace
  const options = choices ? decisionOptions(match, choices) : []
  const catalogue = useMemo(
    () =>
      Object.values(CARD_BY_ID)
        .filter(
          (card) =>
            card.unlocked !== false &&
            `${card.name} ${FACTION_LABELS[card.faction]}`
              .toLocaleLowerCase('es')
              .includes(search.toLocaleLowerCase('es')),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [search],
  )
  const chosenCardId = catalogue.some((card) => card.id === cardId)
    ? cardId
    : (catalogue[0]?.id ?? '')

  const dispatch = (action: GameAction) => {
    const result = applyAction(match, action)
    if (!result.ok) {
      setMessage(result.error?.message ?? 'Esa acción no es válida.')
      return
    }
    setMatch(clearAnimationQueue(result.state))
    setMessage(
      result.state.winner
        ? `Ha vencido el bando ${result.state.winner === 'player' ? 'del jugador' : 'de pruebas'}. Puedes reiniciar el laboratorio.`
        : `Acción resuelta: ${action.type}.`,
    )
    setLog((current) =>
      [
        ...current,
        ...result.state.animations.map(
          (event) =>
            `${event.type}${event.cardId ? ` · ${CARD_BY_ID[event.cardId]?.name ?? event.cardId}` : ''}${event.amount !== undefined ? ` · ${event.amount}` : ''}`,
        ),
      ].slice(-12),
    )
    setHandId(undefined)
    setPieceId(undefined)
    setPower(false)
  }
  const target = (value: SpellTarget) => {
    if (match.pendingSpark) {
      dispatch({
        type: 'choose-spark',
        playerId: match.pendingSpark.owner,
        face: currentFace,
        target: value,
      })
      return
    }
    if (power) {
      dispatch({ type: 'commander-power', playerId: owner, target: value })
      return
    }
    if (selectedHand)
      dispatch({
        type: 'play-card',
        playerId: owner,
        cardInstanceId: selectedHand.instanceId,
        target: value,
        offering,
      })
  }
  const cell = (position: Position) => {
    const piece = match.board.find(
      (entry) => entry.position.x === position.x && entry.position.y === position.y,
    )
    if (piece) {
      if (selectedHand || power || match.pendingSpark) {
        target({ kind: 'piece', pieceId: piece.instanceId })
        return
      }
      if (selectedPiece && piece.owner !== owner) {
        dispatch({
          type: 'attack-piece',
          playerId: owner,
          attackerId: selectedPiece.instanceId,
          defenderId: piece.instanceId,
        })
        return
      }
      if (piece.owner === owner) {
        setPieceId(piece.instanceId)
        setHandId(undefined)
        setPower(false)
        setMessage('Elige una casilla resaltada para mover o un objetivo alcanzable para atacar.')
      } else setInspected(CARD_BY_ID[piece.cardId] ?? null)
      return
    }
    if (selectedHand) {
      dispatch({
        type: 'play-card',
        playerId: owner,
        cardInstanceId: selectedHand.instanceId,
        position,
        target: { kind: 'none' },
        offering,
      })
      return
    }
    if (selectedPiece)
      dispatch({ type: 'move', playerId: owner, pieceId: selectedPiece.instanceId, to: position })
  }
  const restart = () => {
    setMatch(createLaboratoryMatch(playerDeckId, enemyDeckId))
    setHandId(undefined)
    setPieceId(undefined)
    setPower(false)
    setLog([])
    setMessage(
      'Laboratorio reiniciado. Ambos bandos tienen seis fuentes y una mano inicial reproducible.',
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>Preparar · Probar · Comprender</span>
          <h1>Laboratorio del Nexo</h1>
          <p>No hay rival automático, recompensas ni cambios en tus partidas guardadas.</p>
        </div>
        <Link to="/adventures">← Volver a las crónicas</Link>
      </header>
      <details className={styles.preparation}>
        <summary>Preparar otro enfrentamiento</summary>
        <div>
          <label>
            Mazo del jugador
            <select value={playerDeckId} onChange={(event) => setPlayerDeckId(event.target.value)}>
              {STARTER_DECKS.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mazo de pruebas
            <select value={enemyDeckId} onChange={(event) => setEnemyDeckId(event.target.value)}>
              {STARTER_DECKS.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={restart}>Reiniciar con estos mazos</button>
        </div>
      </details>
      <section className={styles.controls} aria-label="Controles de entrenamiento">
        <strong>
          Turno {match.turn} · Controlas {owner === 'player' ? 'al jugador' : 'al bando de pruebas'}
        </strong>
        <button
          disabled={Boolean(match.winner)}
          onClick={() => dispatch({ type: 'end-turn', playerId: owner })}
        >
          Terminar turno y controlar al otro bando
        </button>
        <button
          onClick={() => {
            setHandId(undefined)
            setPieceId(undefined)
            setPower(false)
            setMessage('Selección cancelada.')
          }}
        >
          Cancelar selección
        </button>
        <button onClick={restart}>Reiniciar</button>
      </section>
      <p className={styles.message} role="status">
        {message}
      </p>
      {choices && (
        <section className={styles.decision}>
          <strong>
            Elección pendiente · {CARD_BY_ID[choices.sourceCardId]?.name ?? choices.kind}
          </strong>
          <div>
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() =>
                  dispatch({
                    type: 'resolve-choice',
                    playerId: choices.owner,
                    decisionId: choices.id,
                    ...option,
                  })
                }
              >
                {option.pieceId
                  ? CARD_BY_ID[
                      match.board.find((piece) => piece.instanceId === option.pieceId)!.cardId
                    ]?.name
                  : option.axis === 'row'
                    ? 'Fila'
                    : 'Columna'}{' '}
                {option.to
                  ? `→ ${option.to.x + 1},${option.to.y + 1}`
                  : option.index !== undefined
                    ? option.index + 1
                    : ''}
              </button>
            ))}
            {choices.optional && (
              <button
                onClick={() =>
                  dispatch({
                    type: 'resolve-choice',
                    playerId: choices.owner,
                    decisionId: choices.id,
                    skip: true,
                  })
                }
              >
                Continuar sin elegir
              </button>
            )}
          </div>
        </section>
      )}
      {match.pendingSpark && (
        <section className={styles.decision}>
          <strong>Chispa pendiente</strong>
          <label>
            Elige el resultado que ofrezca la tirada
            <select
              value={currentFace}
              onChange={(event) => setSparkFace(event.target.value as 'cara' | 'cruz')}
            >
              {[...new Set(match.pendingSpark.faces)].map((face) => <option key={face} value={face}>{face === 'cara' ? 'Cara' : 'Cruz'}</option>)}
            </select>
          </label>
          <p>
            Después pulsa el objetivo o «Resolver sin objetivo». El motor valida la tirada y el
            alcance.
          </p>
        </section>
      )}
      <div className={styles.workspace}>
        <section className={styles.table} aria-label="Tablero del laboratorio">
          {(['ai', 'player'] as const).map((id) => {
            const commander = COMMANDER_BY_ID[match.players[id].commanderId]!
            return (
              <button
                key={id}
                className={`${styles.nexus} ${id === 'ai' ? styles.enemyNexus : styles.playerNexus}`}
                onClick={() => {
                  if (selectedPiece && id !== owner)
                    dispatch({
                      type: 'attack-nexus',
                      playerId: owner,
                      attackerId: selectedPiece.instanceId,
                    })
                  else target({ kind: 'nexus', playerId: id })
                }}
              >
                <img src={withBase(commander.art.webp)} alt="" />
                <span>
                  {id === 'player' ? 'Jugador' : 'Pruebas'} · {commander.name}
                </span>
                <strong>♥ {match.players[id].nexusHealth}</strong>
              </button>
            )
          })}
          <div className={styles.board} role="group" aria-label="Casillas de prueba">
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
              const position = { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) }
              const piece = match.board.find(
                (entry) => entry.position.x === position.x && entry.position.y === position.y,
              )
              const card = piece ? CARD_BY_ID[piece.cardId] : undefined
              const terrain = terrainAt(match, position)
              const move = validMoves.some(
                (entry) => entry.x === position.x && entry.y === position.y,
              )
              const attack = piece && validAttacks?.pieceIds.includes(piece.instanceId)
              return (
                <button
                  key={index}
                  className={styles.cell}
                  data-terrain={terrain}
                  data-owner={piece?.owner}
                    data-selected={Boolean(piece && piece.instanceId === pieceId) || undefined}
                  data-available={move || attack || undefined}
                  aria-label={`Casilla ${position.x + 1},${position.y + 1}${card ? `, ${card.name}, Vida ${piece!.currentHealth}` : terrain === 'rubble' ? ', escombros' : terrain === 'cover' ? ', cobertura' : ', vacía'}`}
                  onClick={() => cell(position)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    if (card) setInspected(card)
                  }}
                >
                  {card && piece ? (
                    <>
                      <img src={withBase(card.art.webp)} alt="" />
                      <span className={styles.pieceName}>{card.name}</span>
                      <strong>
                        {card.attack !== undefined
                          ? `⚔ ${Math.max(0, card.attack + piece.attackModifier + (card.type === 'unit' ? runoAttackBonus(match.players[piece.owner].runo ?? 0) : 0) + formationAttackBonus(match, piece))} · `
                          : ''}
                        ♥ {piece.currentHealth}
                      </strong>
                    </>
                  ) : (
                    <span>{terrain === 'rubble' ? '▰' : terrain === 'cover' ? '◇' : ''}</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
        <aside className={styles.tools}>
          <h2>Preparación manual</h2>
          <p>
            Estos controles añaden material de prueba únicamente al bando activo. Las acciones del
            tablero mantienen sus costes y reglas.
          </p>
          <label>
            Buscar carta
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o facción"
            />
          </label>
          <label>
            Carta
            <select value={chosenCardId} onChange={(event) => setCardId(event.target.value)}>
              {catalogue.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} · {FACTION_LABELS[card.faction]}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!chosenCardId || active.hand.length >= 24}
            onClick={() => {
              setMatch(addLaboratoryCard(match, owner, chosenCardId))
              setMessage('Carta de prueba añadida a la mano del bando activo.')
            }}
          >
            Añadir a la mano
          </button>
          <label>
            Esencia de facción
            <select
              value={resourceFaction}
              onChange={(event) => setResourceFaction(event.target.value as FactionId)}
            >
              {FACTION_IDS.map((faction) => (
                <option key={faction} value={faction}>
                  {FACTION_LABELS[faction]}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={active.resources.length >= 30}
            onClick={() => setMatch(addLaboratoryResource(match, owner, resourceFaction))}
          >
            Añadir fuente disponible
          </button>
          <button onClick={() => setMatch(rechargeLaboratoryResources(match, owner))}>
            Recargar fuentes de prueba
          </button>
          <p>
            <strong>Reserva:</strong> {active.resources.filter((entry) => !entry.exhausted).length}{' '}
            / {active.resources.length} · Mano {active.hand.length}/24
          </p>
          <button
            disabled={active.commanderPowerUsed || Boolean(match.winner)}
            onClick={() => {
              setPower(true)
              setHandId(undefined)
              setPieceId(undefined)
              setMessage('Poder seleccionado. Elige un objetivo o resuelve sin objetivo.')
            }}
          >
            Preparar poder del comandante
          </button>
          <button
            disabled={!power && !selectedHand && !match.pendingSpark}
            onClick={() => target({ kind: 'none' })}
          >
            Resolver sin objetivo
          </button>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={offering}
              onChange={(event) => setOffering(event.target.checked)}
            />{' '}
            Pagar Ofrenda si la carta la admite
          </label>
          {selectedCard && (
            <p className={styles.selection}>
              Seleccionada: <strong>{selectedCard.name}</strong>. Pulsa su casilla o su objetivo.
            </p>
          )}
          {(selectedCard || selectedPiece) && <button onClick={() => setInspected(selectedCard ?? CARD_BY_ID[selectedPiece!.cardId] ?? null)}>Inspeccionar selección</button>}
        </aside>
      </div>
      <section className={styles.hand} aria-label="Mano del bando activo">
        <h2>Mano de {owner === 'player' ? 'jugador' : 'pruebas'}</h2>
        <p>
          Pulsa una carta para seleccionarla; las fuentes se juegan al pulsarlas. Clic derecho o
          inspección permite leer todos sus detalles.
        </p>
        <div>
          {active.hand.map((instance) => {
            const card = CARD_BY_ID[instance.cardId]
            return card ? (
              <Card
                key={instance.instanceId}
                card={card}
                size="hand"
                reducedMotion={reducedMotion}
                selected={instance.instanceId === handId}
                cost={handCardCost(match, owner, card, instance)}
                onSelect={() => {
                  if (card.type === 'mana')
                    dispatch({
                      type: 'play-resource',
                      playerId: owner,
                      cardInstanceId: instance.instanceId,
                    })
                  else {
                    setHandId(instance.instanceId)
                    setPieceId(undefined)
                    setPower(false)
                    setMessage(
                      `${card.name}: elige casilla u objetivo. Para hechizos sin objetivo usa el botón correspondiente.`,
                    )
                  }
                }}
                onInspect={() => { setInspected(card); setInspectedCost(handCardCost(match, owner, card, instance)) }}
              />
            ) : null
          })}
        </div>
      </section>
      <details className={styles.events}>
        <summary>Últimos efectos resueltos</summary>
        {log.length ? (
          <ol>
            {log.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ol>
        ) : (
          <p>Todavía no hay acciones.</p>
        )}
      </details>
      <CardInspector card={inspected} cost={inspectedCost} onClose={() => { setInspected(null); setInspectedCost(undefined) }} />
    </div>
  )
}
