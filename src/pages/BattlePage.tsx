import { factionStageMusic, isFactionStage } from '../battle/scenarios/factionStages'
import { cardFrameFor } from '../presentation/cardFrames'
import { effectiveAttack } from '../game/fimbul'
import { FactionPowers } from './battle/FactionPowers'
import { tidePhase } from '../game/marea'
import { EssenceSeal } from './battle/EssenceSeal'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CARD_BY_ID,
  applyAction,
  createMatch,
  canTakeMulligan,
  COMMANDER_BY_ID,
  FACTION_BY_ID,
  canPlayHandCard,
  handCardCost,
  handCardBlockReason,
  handCardCostDetails,
  getValidAttacks,
  getValidDeploymentPositions,
  getValidMoves,
  mulliganOpeningHand,
  planManaPayment,
  previewAttackNexus,
  previewAttackPiece,
  reorderTopCards,
  STARTER_DECKS,
  commanderForDeck,
  summarizeMana,
  validSpellTargets,
  type GameAction,
  type FactionId,
  type MatchState,
  type PlayerId,
  type Position,
} from '../game'
import { Board3D } from '../battle/Board3D'
import { previewMovementHazard, type MovementHazard } from '../game/movementHazard'
import { MovementHazardWarning } from './battle/MovementHazardWarning'
import { useAiTurn } from '../battle/hooks/useAiTurn'
import { useCardDrag } from '../battle/hooks/useCardDrag'
import { useBoardCursor } from '../battle/hooks/useBoardCursor'
import { useEventDirector } from '../battle/hooks/useEventDirector'
import { eventDuration } from '../battle/eventTiming'
import { useMatchRecorder } from '../battle/hooks/useMatchRecorder'
import { downloadMatchLog } from '../battle/matchLog'
import { HandFan } from '../battle/ui/HandFan'
import { HistoryLog } from '../battle/ui/HistoryLog'
import { HowToPlay, hasSeenHowTo, markHowToSeen } from '../battle/ui/HowToPlay'
import { GuidedTutorial } from '../battle/ui/GuidedTutorial'
import { GlossaryPanel } from '../components/GlossaryPanel'
import { actionHintFor, attackNexusPreviewLines, attackNexusVerdicts, attackPieceVerdicts, attackPiecePreviewLines, cardStatLine, isBoardCard, pieceStatLine, requiresPieceTarget } from '../battle/ui/battleHints'
import { describePendingActions, pendingTurnActions } from '../battle/ui/pendingTurnActions'
import { CardInspector, FactionSigil, formatManaCost } from '../components'
import { GameIcon } from '../components/GameIcon'
import { inspectionStatuses } from '../battle/inspectionStatuses'
import { useNetworkSync } from '../multiplayer/useNetworkSync'
import { useBattleTension, useSoundtrack } from '../services/useAudioMix'
import { REPLAY_MARK } from '../store/match'
import { threatLinks } from '../battle/threats'
import { TRAIT_FX_MS, type TraitFx } from '../battle/TraitFlourish'
import { gridToWorldX, gridToWorldZ, nexusWorldZ } from '../battle/grid/gridCoordinates'
import { battleStrain } from '../battle/scenarios/BattleClimate'
import { useMatchStore } from '../store/match'
import { canPayOffering, offeringCost, offeringOf } from '../game/duna'
import { resolveScenario } from '../battle/scenarioForFaction'
import { useNetworkStore } from '../store/network'
import { rejoinRoom } from '../multiplayer/room'
import { clearTicket, readTicket } from '../multiplayer/ticket'
import { usePreferences } from '../store/preferences'
import { opponentForFloor, towerBattleSetup, prepareTowerMatch, towerCanEnter, towerMatchIsPrepared, useTower } from '../store/tower'
import { useAdventure } from '../store/adventure'
import { AdventureBattlePanel } from './AdventurePage'
import { summarizeRecords, useRecords } from '../store/records'
import { evaluateDailyChallenge } from '../store/dailyChallenge'
import { withBase } from '../utils/assets'
import { AI_GAP_SCALE, PACE_LABELS, PRESENTATION_PACES } from '../battle/presentation'
import { TYPE_LABELS } from '../utils/cardLabels'
import { BattlePlate } from './battle/BattlePlate'
import { CastSpotlight } from './battle/CastSpotlight'
import { NEXUS_DANGER_RATIO } from '../battle/NexusCrown'
import { CombatDuel } from './battle/CombatDuel'
import { DevPanel } from './battle/DevPanel'
import { DragGhost } from './battle/DragGhost'
import { EnemyPanel } from './battle/EnemyPanel'
import { ESSENCE_LABELS, PHASE_LABELS } from './battle/labels'
import { MatchResultDialog } from './battle/MatchResultDialog'
import { MulliganDialog } from './battle/MulliganDialog'
import { BattleIntro } from './battle/BattleIntro'
import { CommanderQuote } from './battle/CommanderQuote'
import { FinishingBlow } from './battle/FinishingBlow'
import { useProfile } from '../components/useProfile'
import { StreakEmblem } from '../components/ProfileBadges'
import { ScryDialog } from './battle/ScryDialog'
import { SparkDialog } from './battle/SparkDialog'
import { TacticalDialog } from './battle/TacticalDialog'
import { TurnBanner } from './battle/TurnBanner'
import { RecentPlays } from './battle/RecentPlays'
import { EffectChronicle } from './battle/EffectChronicle'
import { SelectionPanel } from './battle/SelectionPanel'
import styles from './BattlePage.module.css'

export function BattlePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preferences = usePreferences()
  const store = useMatchStore()
  const profile = useProfile()
  const room = useNetworkStore((state) => state.room)
  const role = useNetworkStore((state) => state.role)
  // En solitario y para el anfitrión, «yo» soy el bando 'player' del motor;
  // el invitado ocupa siempre el bando 'ai' (así el motor no cambia nada).
  const ME: PlayerId = role === 'guest' ? 'ai' : 'player'
  const RIVAL: PlayerId = ME === 'player' ? 'ai' : 'player'
  /**
   * Billete de vuelta leído UNA sola vez, antes del primer render.
   *
   * Tiene que ser síncrono: si esperásemos a un efecto, durante ese primer
   * render `room` valdría `undefined` y esta pantalla trataría la partida como
   * individual — arrancaría una partida nueva encima de la de red y pondría a
   * la IA a jugar el bando del rival humano.
   */
  const [ticket] = useState(() => (room ? undefined : readTicket()))
  /** Hay billete pero aún no hay sala: la partida es de red, solo que a medio volver. */
  const rejoining = Boolean(ticket) && !room

  useEffect(() => {
    // La sala se consulta al store, no a la variable del render: así el
    // segundo pase de StrictMode (y cualquier re-ejecución del efecto) no
    // abre un canal duplicado.
    if (!ticket || useNetworkStore.getState().room) return
    const back = rejoinRoom(ticket.code, ticket.role)
    useNetworkStore.getState().setRoom(back, back.role)
  }, [ticket])

  const { sendIntent, link, peerLeft, requestRematch, rematchSelf, rematchPeer } = useNetworkSync(
    room,
    role,
    preferences.selectedDeckId,
    preferences.commanderByDeck[preferences.selectedDeckId],
  )
  // «?seed=N» reproduce una partida concreta; sin él cada escaramuza es distinta.
  /** «?tower=1»: esta partida es un piso de la Torre del Nexo. */
  const isTowerMatch = searchParams.get('tower') === '1'
  const isAdventureMatch = searchParams.get('adventure') === '1'
  const forcedSeed = useMemo(() => {
    const raw = searchParams.get('seed')
    if (raw === null) return undefined
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed >>> 0 : undefined
  }, [searchParams])
  const [mulliganIds, setMulliganIds] = useState<readonly string[]>([])
  /** Modo foto: cámara libre para admirar el tablero, sin clics de juego mientras está activo. */
  const [photoMode, setPhotoMode] = useState(false)
  /** Cartas de la mano fijadas al principio del abanico: solo orden visual, no afecta a la partida. */
  const [favoriteHandIds, setFavoriteHandIds] = useState<ReadonlySet<string>>(new Set())
  const toggleFavoriteHand = useCallback((instanceId: string) => {
    setFavoriteHandIds((current) => {
      const next = new Set(current)
      if (next.has(instanceId)) next.delete(instanceId)
      else next.add(instanceId)
      return next
    })
  }, [])
  const [devOpen, setDevOpen] = useState(false)
  const [howToOpen, setHowToOpen] = useState(() => !hasSeenHowTo())
  /** Coach interactivo de la primera partida: arranca solo tras cerrar la guía la primerísima vez. */
  const [tutorialActive, setTutorialActive] = useState(false)
  const handBarRef = useRef<HTMLElement>(null)
  const endTurnRef = useRef<HTMLButtonElement>(null)
  /** Mano recogida: despeja el tablero; al soltar el botón vuelve a subir. */
  const [handTucked, setHandTucked] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  /** Panel de datos del rival: vida, esencia, mazo y descarte — plegado por defecto para no robarle sitio al tablero. */
  const [enemyPanelOpen, setEnemyPanelOpen] = useState(false)
  /** Panel propio (comandante/mazo/descarte/reto) en móvil: su vida y esencia ya se ven
      en el tablero y en la píldora inferior, así que se oculta por defecto para dejar
      sitio al tablero. En PC siempre está visible, este estado no se usa ahí. */
  const [ownPanelOpenMobile, setOwnPanelOpenMobile] = useState(false)
  /** Aviso breve tras cambiar el ritmo desde la propia partida. */
  // Semilla de la partida cuya presentación ya se vio (o se saltó).
  const [introSeed, setIntroSeed] = useState<number>()
  const finishIntro = useCallback(() => setIntroSeed(useMatchStore.getState().match?.seed), [])
  const [paceHint, setPaceHint] = useState<string>()
  // Con temporizador y no con el fin de la animación: con movimiento reducido
  // no hay animación y el aviso se quedaba para siempre.
  useEffect(() => {
    if (!paceHint) return
    const timer = window.setTimeout(() => setPaceHint(undefined), 2600)
    return () => window.clearTimeout(timer)
  }, [paceHint])

  const match = store.match
  const currentEvent = store.currentEvent
  const cue = currentEvent?.id.split(REPLAY_MARK)[0]
  const resolvedPlates = cue ? store.resolvedEffects.filter(({ id, cueId }) => id === cue || cueId === cue) : []
  const resolvedImpact = resolvedPlates[0]
  const visualEvent = useMemo(() => currentEvent ? {
    ...currentEvent, durationMs: eventDuration(currentEvent, {
      animationSpeed: preferences.animationSpeed, reducedMotion: preferences.reducedMotion,
      presentationPace: preferences.presentationPace,
    }),
  } : undefined, [currentEvent, preferences.animationSpeed, preferences.reducedMotion, preferences.presentationPace])
  const pendingCount = store.pendingAnimations.length
  const queueBusy = Boolean(currentEvent) || pendingCount > 0

  // ── Arrastrar una carta de la mano hasta su casilla ───────────────────────
  // La casilla bajo el cursor se guarda además en un ref porque la consultan
  // manejadores de evento (soltar) que no deben depender de un render nuevo;
  // el estado solo se actualiza mientras se arrastra, para no re-renderizar la
  // pantalla entera cada vez que el ratón cruza una casilla.
  const hoveredCellRef = useRef<Position | undefined>(undefined)
  const draggingRef = useRef(false)
  const [hoveredCell, setHoveredCell] = useState<Position>()
  const playDraggedRef = useRef<((instanceId: string, position: Position) => void) | undefined>(undefined)
  const onCellHover = useCallback((position?: Position) => {
    hoveredCellRef.current = position
    setHoveredCell((previous) => previous?.x === position?.x && previous?.y === position?.y ? previous : position)
  }, [])
  const drag = useCardDrag({
    onDrop: useCallback((instanceId: string) => {
      const cell = hoveredCellRef.current
      if (cell) playDraggedRef.current?.(instanceId, cell)
    }, []),
    onDragStart: useCallback(() => { draggingRef.current = true }, []),
    onDragEnd: useCallback(() => { draggingRef.current = false; setHoveredCell(undefined) }, []),
  })

  // Reproducción de la cola de animaciones, avisos y canales laterales
  // (escrutinio, revelaciones): todo eso vive en su propio hook.
  const director = useEventDirector(ME, preferences)
  // Mientras el duelo enseña las dos cartas, el tablero señala qué fichas son
  // con los mismos anillos de selección y objetivo del juego: sin esto las
  // cartas de los costados no se asociaban a ninguna pieza concreta. Solo
  // durante la pausa, cuando el propio duelo intercepta los clics y un
  // objetivo falso no puede provocar una jugada.
  // El motor ya ha restado el golpe cuando el duelo se presenta: se suman
  // los daños al Nexo que aún esperan en la cola para que la cifra baje
  // cuando el golpe se ve caer, no antes.
  const displayedNexusHealth = useMemo(() => {
    const pending = (owner: PlayerId) => store.pendingAnimations
      .filter((event) => event.targetId === `${owner}-nexus` && !event.id.includes(REPLAY_MARK))
      .reduce((total, event) => {
        const amount = event.amount ?? 0
        if (event.type === 'nexus-damage') return total + amount
        if (event.effectId === 'nexo-curacion' || event.effectId === 'vinculo-vital') return total - amount
        return total
      }, 0)
    return {
      player: (store.match?.players.player.nexusHealth ?? 0) + pending('player'),
      ai: (store.match?.players.ai.nexusHealth ?? 0) + pending('ai'),
    }
  }, [store.match, store.pendingAnimations])
  const nexusMaxHealth = {
    player: Math.max(COMMANDER_BY_ID[match?.players.player.commanderId ?? '']?.nexusHealth ?? 35, store.healthHistory[0]?.player ?? 0, displayedNexusHealth.player),
    ai: Math.max(COMMANDER_BY_ID[match?.players.ai.commanderId ?? '']?.nexusHealth ?? 35, store.healthHistory[0]?.ai ?? 0, displayedNexusHealth.ai),
  }
  const duelOnBoard = director.duelHolding && director.exchange
    ? { attacker: director.exchange.attacker.id, defender: director.exchange.defender.id }
    : undefined
  // Lo mismo para el objetivo de una carta lanzada mientras su efecto llega
  // al tablero: la carta grande ya se ha cerrado y el anillo dice dónde mirar.
  const castTargetOnBoard = store.currentEvent?.cast && store.currentEvent.targetId && store.currentEvent.cast.kind !== 'power'
    ? store.currentEvent.targetId
    : undefined
  const scryOpen = director.scryAmount > 0

  // Escenario efectivo: con «Según tu facción» lo decide el mazo con el que
  // juegas, y si no, manda la elección manual. Se lee del propio MatchState y
  // no del jugador, que se deriva más abajo.
  const scenario = resolveScenario(
    preferences.scenario,
    match ? COMMANDER_BY_ID[match.players[ME].commanderId]?.faction : undefined,
  )
  // Capa ambiental generativa del escenario activo (se apaga sola al salir).
  useSoundtrack(isFactionStage(scenario) ? factionStageMusic[scenario] : scenario === 'solar-court' ? 'duna' : scenario === 'bestiary-ravine' ? 'grove' : scenario, Boolean(match))
  // La música se intensifica con la partida: misma tensión que la luz y el clima.
  const musicTension = match ? Math.round(battleStrain(match.turn, (['player', 'ai'] as const).map((id) => ({
    health: match.players[id].nexusHealth, maxHealth: COMMANDER_BY_ID[match.players[id].commanderId]?.nexusHealth ?? 35,
  }))) * 20) / 20 : 0
  useBattleTension(musicTension, Boolean(match) && !match?.winner)

  /**
   * Resultado del piso de Torre. Se apunta una sola vez por partida: el
   * `matchKey` es el estado en el que se detectó el ganador, así que una
   * revancha o una partida nueva vuelven a permitirlo.
   */
  const towerReported = useRef<MatchState | undefined>(undefined)
  useEffect(() => {
    if (!isTowerMatch || !match?.winner) return
    const run = useTower.getState().run
    if (!run || !towerCanEnter(run) || !towerMatchIsPrepared(match, run)) return
    if (towerReported.current === match) return
    towerReported.current = match
    useTower.getState().finishFloor(match.winner === ME, match.players[ME].nexusHealth)
  }, [isTowerMatch, match, ME])

  const recorder = useMatchRecorder({
    me: ME,
    rival: RIVAL,
    fallbackDeckId: preferences.selectedDeckId,
    isPvp: Boolean(room),
    peerLeft,
    queueBusy,
  })

  const ai = useAiTurn({
    // En multijugador el bando 'ai' del motor es un humano de verdad (el
    // invitado): este bot nunca debe jugar por él.
    enabled: !room && !rejoining,
    difficulty: preferences.aiDifficulty,
    // En ritmo cinemático la IA respira entre jugadas: si encadena una carta
    // detrás de otra, la segunda tapa el resultado de la primera.
    delayMs: preferences.aiDelayMs * AI_GAP_SCALE[preferences.presentationPace],
    blocked: queueBusy || scryOpen || Boolean(director.spotlight),
  })

  useEffect(() => {
    // En multijugador la partida la siembra el anfitrión vía useNetworkSync,
    // no este efecto: aquí no hay mazo de IA que elegir ni semilla que forzar.
    if (room || rejoining) return
    if (isAdventureMatch) {
      const current = useMatchStore.getState()
      const run = useAdventure.getState().run
      if (!current.match || current.mode !== 'adventure' || run?.battleSeed !== current.match.seed) navigate('/adventures', { replace: true })
      return
    }
    // Crea partida nueva si no hay ninguna o si la que persiste en el store no
    // corresponde al mazo elegido. Sin la segunda condición, la primera facción
    // con la que se juega quedaba fija al volver a entrar con otra distinta.
    const selectedDeck = STARTER_DECKS.find((deck) => deck.id === preferences.selectedDeckId)
    // La Torre manda sobre los ajustes normales: fija rival, Vida de entrada y
    // castigo del rival según la bendición elegida en el piso anterior.
    const towerRun = isTowerMatch ? useTower.getState().run : undefined
    if (isTowerMatch && (!towerRun || !towerCanEnter(towerRun))) {
      if (!store.match?.winner) navigate('/tower', { replace: true })
      return
    }
    const towerOpponentId = towerRun ? opponentForFloor(towerRun, towerRun.floor) : undefined
    // Además del mazo propio, cuenta el rival elegido: si se cambia de rival
    // en «Jugar» y la partida guardada era contra otro, hay que empezar una
    // nueva o el ajuste no tendría ningún efecto hasta terminar la anterior.
    const chosenOpponent = towerOpponentId
      ? STARTER_DECKS.find((deck) => deck.id === towerOpponentId)
      : preferences.opponentDeckId === 'random'
        ? undefined
        : STARTER_DECKS.find((deck) => deck.id === preferences.opponentDeckId)
    // Cada facción tiene dos comandantes: hay que comparar con el elegido, no
    // con el de la baraja, o cambiar de líder no empezaría partida nueva.
    const deckIdEnJuego = towerRun?.deckId ?? preferences.selectedDeckId
    const commanderElegido = selectedDeck
      ? commanderForDeck(selectedDeck, preferences.commanderByDeck[deckIdEnJuego]).id
      : undefined
    const matchesSelection = Boolean(
      store.match
      && selectedDeck
      && !('towerPreparation' in store.match)
      && store.match.players.player.commanderId === commanderElegido
      && (!chosenOpponent || store.match.players.ai.commanderId === chosenOpponent.commanderId),
    )
    if (towerRun) {
      if (!store.match || !towerMatchIsPrepared(store.match, towerRun)) {
        const playerDeck = STARTER_DECKS.find((deck) => deck.id === towerRun.deckId)
        if (!playerDeck || !chosenOpponent) { navigate('/tower', { replace: true }); return }
        const prepared = createMatch(playerDeck, chosenOpponent, forcedSeed ?? towerRun.seed + towerRun.floor, towerBattleSetup(towerRun, preferences.commanderByDeck[towerRun.deckId]))
        useMatchStore.getState().startFromMatch(prepareTowerMatch(prepared, towerRun))
      }
      return
    }
    if (!matchesSelection || store.mode === 'adventure') {
      useMatchStore.getState().startMatch(
        deckIdEnJuego,
        forcedSeed,
        chosenOpponent?.id,
        { playerCommanderId: preferences.commanderByDeck[deckIdEnJuego] },
      )
    }
  }, [preferences.selectedDeckId, preferences.opponentDeckId, preferences.commanderByDeck, store.match, store.mode, forcedSeed, room, rejoining, isTowerMatch, isAdventureMatch, navigate])

  // Los avisos de acción inválida se disuelven solos para no exigir un clic.
  useEffect(() => {
    if (!store.message) return
    const timer = window.setTimeout(() => useMatchStore.getState().setMessage(undefined), 3600)
    return () => window.clearTimeout(timer)
  }, [store.message])

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (import.meta.env.DEV && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setDevOpen((open) => !open)
        return
      }
      if (event.key === 'Escape') {
        store.selectHand(undefined)
        store.selectPiece(undefined)
        store.inspect(undefined)
      }
      if (event.key.toLowerCase() === 'i') {
        if (store.inspectedCardId) return
        const current = store.match
        const hand = current?.players[ME].hand.find((card) => card.instanceId === store.selectedHandId)
        const piece = current?.board.find((card) => card.instanceId === store.selectedPieceId)
        store.inspect(hand?.cardId ?? piece?.cardId, hand ? undefined : piece?.instanceId)
      }
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [store, ME])

  // Captura errores de JS mientras dura la partida para el registro exportable
  // (botón "Descargar registro" en la pantalla de resultado): son la señal más
  // directa de un bug real, y sin esto solo quedarían en la consola del
  // navegador del jugador, invisibles para cualquiera que no sea él.
  useEffect(() => {
    const onError = (event: ErrorEvent) => useMatchStore.getState().logError(event.message)
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
      useMatchStore.getState().logError(reason)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  const player = match?.players[ME]
  const rival = match?.players[RIVAL]
  // La carta «activa» es la que se está arrastrando o, si no hay ninguna en
  // vuelo, la seleccionada con un clic: así las casillas válidas se iluminan
  // igual con las dos formas de jugar.
  const activeHandId = drag.draggingId ?? store.selectedHandId
  const selectedInstance = player?.hand.find((instance) => instance.instanceId === activeHandId)
  const selectedCard = selectedInstance ? CARD_BY_ID[selectedInstance.cardId] : undefined
  const selectedPiece = match?.board.find((piece) => piece.instanceId === store.selectedPieceId)
  const selectedBoardCard = selectedPiece ? CARD_BY_ID[selectedPiece.cardId] : undefined
  // Ficha "consultada" con un clic normal, propia o rival: solo para verla,
  // no implica poder actuar con ella (eso sigue siendo selectedPiece).
  const viewedPiece = match?.board.find((piece) => piece.instanceId === store.viewedPieceId)
  const viewedBoardCard = viewedPiece ? CARD_BY_ID[viewedPiece.cardId] : undefined
  const moves = useMemo(
    () => (match && selectedPiece ? getValidMoves(match, selectedPiece.instanceId) : []),
    [match, selectedPiece],
  )
  const attacks = useMemo(
    () => (match && selectedPiece
      ? getValidAttacks(match, selectedPiece.instanceId)
      : { pieceIds: [] as readonly string[], canAttackNexus: false }),
    [match, selectedPiece],
  )
  const deployCells = useMemo<Position[]>(() => {
    if (!match || !selectedInstance || !selectedCard || !isBoardCard(selectedCard)) return []
    if (!canPlayHandCard(match, ME, selectedCard, selectedInstance)) return []
    return [...getValidDeploymentPositions(match, ME)]
  }, [match, selectedCard, selectedInstance, ME])
  const validCells = selectedCard ? deployCells : moves
  const movementHazards = useMemo<ReadonlyMap<string, MovementHazard>>(() => {
    const hazards = new Map<string, MovementHazard>()
    if (!match || !selectedPiece || selectedCard || match.activePlayer !== ME || match.winner) return hazards
    for (const position of moves) {
      const hazard = previewMovementHazard(match, ME, selectedPiece.instanceId, position)
      if (hazard) hazards.set(`${position.x},${position.y}`, hazard)
    }
    return hazards
  }, [match, selectedPiece, selectedCard, ME, moves])
  const mana = summarizeMana(player?.resources ?? [])
  const rivalMana = summarizeMana(rival?.resources ?? [])
  const selectedCost = match && selectedCard && selectedInstance
    ? handCardCost(match, ME, selectedCard, selectedInstance) : undefined
  const selectedPlayable = match && selectedCard && selectedInstance
    ? canPlayHandCard(match, ME, selectedCard, selectedInstance) : undefined
  const payment = selectedCost
    ? planManaPayment(player?.resources ?? [], selectedCost)
    : undefined
  /**
   * Duna — Ofrenda: si el jugador ha decidido pagar Vida por el efecto
   * mejorado de la carta que tiene elegida. Se guarda por id de carta y no
   * como un simple booleano para que cambiar de carta no arrastre la decisión
   * tomada sobre la anterior.
   */
  const [offeringFor, setOfferingFor] = useState<string>()
  const offeringBase = selectedCard ? offeringOf(selectedCard) : undefined
  const offeringAffordable = Boolean(
    match && offeringBase !== undefined && canPayOffering(match, ME, offeringBase),
  )
  const offeringToll = match && offeringBase !== undefined ? offeringCost(match, ME, offeringBase) : 0
  const hybrisClosingLoss = useMemo(() => {
    if (!match || match.activePlayer !== ME || match.winner || !(match.players[ME].hybris || match.board.some(
      (piece) => piece.owner === ME && CARD_BY_ID[piece.cardId]?.effects.some(
        (effect) => effect.kind === 'passive' && effect.id === 'upkeep-gain-hybris',
      ),
    ))) return undefined
    const result = applyAction({ ...match, animations: [] }, { type: 'end-turn', playerId: ME })
    if (!result.ok) return undefined
    return result.state.animations.find((event) => event.effectId === 'olimpo-hybris-backlash' && event.targetId === `${ME}-nexus`)?.amount
  }, [match, ME])
  const offering = Boolean(selectedInstance && offeringFor === selectedInstance.instanceId && offeringAffordable)
  const commander = player ? COMMANDER_BY_ID[player.commanderId] : undefined
  const rivalCommander = rival ? COMMANDER_BY_ID[rival.commanderId] : undefined
  const inspected = store.inspectedCardId ? CARD_BY_ID[store.inspectedCardId] : undefined
  const [inspectedHandId, setInspectedHandId] = useState<string>()
  const inspectedHand = player?.hand.find(({ instanceId }) => instanceId === inspectedHandId)
  const inspectedCost = match && inspected && inspectedHand && inspectedHand.cardId === inspected.id
    ? handCardCost(match, ME, inspected, inspectedHand) : undefined
  const inspectedCostExplanation = match && inspected && inspectedHand && inspectedHand.cardId === inspected.id
    ? handCardCostDetails(match, ME, inspected, inspectedHand).reasons.join(' · ') : undefined
  const inspectedPiece = match?.board.find((piece) => piece.instanceId === store.inspectedPieceId)
  const inspectedStats = inspected && cardFrameFor(inspected.faction) && inspectedPiece && match ? {
    maxHealth: Math.max(1, (inspected.health ?? inspected.resistance ?? 1) + (inspectedPiece.formationHealthApplied ?? 0) + (inspectedPiece.permanentHealthBonus ?? 0) - (inspectedPiece.permanentHealthPenalty ?? 0)),
    attack: inspected.attack === undefined ? undefined : effectiveAttack(inspectedPiece, inspected, match),
    health: inspected.health === undefined ? undefined : inspectedPiece.currentHealth,
    resistance: inspected.resistance === undefined ? undefined : inspectedPiece.currentHealth,
  } : undefined
  const storedRecords = useRecords((state) => state.records)
  const tally = useMemo(() => summarizeRecords(storedRecords), [storedRecords])
  const daily = useMemo(() => evaluateDailyChallenge(storedRecords), [storedRecords])
  // Antes esto reimplementaba a mano las reglas de objetivo (enemigo, propio,
  // solo unidades...) y se desincronizó del motor en dos cartas reales:
  // Maldición Sombra resaltaba también las fichas propias, y Juicio Divino
  // resaltaba cualquier enemigo en vez de solo los de 2 Vida o menos —
  // clicar una ficha "válida" así fallaba igual que una que no lo fuera, sin
  // explicación. `validSpellTargets` es la misma comprobación que usa el
  // motor para aceptar o rechazar la jugada, así que nunca puede
  // desincronizarse de ella.
  const spellTargets = useMemo(() => {
    if (!match || !selectedCard) return []
    return validSpellTargets(match, ME, selectedCard).map((piece) => piece.instanceId)
  }, [match, selectedCard, ME])

  const boardTargets = useMemo(() => {
    const base = selectedCard ? spellTargets : attacks.pieceIds
    return attacks.canAttackNexus && !selectedCard ? [...base, `${RIVAL}-nexus`] : base
  }, [selectedCard, spellTargets, attacks, RIVAL])

  // ── Vista previa de daño: qué pasaría si se confirma el ataque ────────────
  // Solo tiene sentido con una ficha propia seleccionada (modo ataque, no
  // despliegue) y el cursor sobre uno de sus objetivos válidos.
  const [hoveredTargetId, setHoveredTargetId] = useState<string>()
  const onHoverPiece = useCallback((pieceId?: string) => setHoveredTargetId(pieceId), [])
  const onHoverNexus = useCallback((playerId?: PlayerId) => setHoveredTargetId(playerId ? `${playerId}-nexus` : undefined), [])
  // La casilla de un objetivo cuenta como el objetivo: desde la cámara, la
  // carta rival que está justo detrás de la propia puede quedar tapada del
  // todo, pero su losa casi siempre asoma.
  const hoveredOccupantId = useMemo(() => {
    if (!match || !hoveredCell) return undefined
    return match.board.find((piece) => piece.position.x === hoveredCell.x && piece.position.y === hoveredCell.y)?.instanceId
  }, [match, hoveredCell])
  const aimedTargetId = hoveredTargetId ?? hoveredOccupantId
  const attackPreview = useMemo(() => {
    const hoveredTargetId = aimedTargetId
    if (!match || !selectedPiece || selectedCard || !hoveredTargetId) return undefined
    if (hoveredTargetId === `${RIVAL}-nexus` && attacks.canAttackNexus) {
      const preview = previewAttackNexus(match, selectedPiece.instanceId)
      return preview ? {
        targetId: hoveredTargetId, attackerId: selectedPiece.instanceId, lines: attackNexusPreviewLines(preview),
        target: attackNexusVerdicts(preview), attacker: [{ tone: 'safe' as const, title: 'Sin contragolpe' }],
      } : undefined
    }
    if (attacks.pieceIds.includes(hoveredTargetId)) {
      const preview = previewAttackPiece(match, selectedPiece.instanceId, hoveredTargetId)
      if (!preview) return undefined
      const verdicts = attackPieceVerdicts(preview)
      return { targetId: hoveredTargetId, attackerId: selectedPiece.instanceId, lines: attackPiecePreviewLines(preview), ...verdicts }
    }
    return undefined
  }, [match, selectedPiece, selectedCard, aimedTargetId, attacks, RIVAL])

  // Golpe de gracia: la unidad propia que puede derribar el Nexo rival ya,
  // con el golpe más fuerte. Usa la misma previsión del motor que el sello
  // «¡Golpe letal!», así que el botón solo sale si el remate es seguro.
  const finisher = useMemo(() => {
    if (!match || match.winner || match.activePlayer !== ME || queueBusy) return undefined
    let best: { readonly pieceId: string; readonly damage: number } | undefined
    for (const piece of match.board) {
      if (piece.owner !== ME || !getValidAttacks(match, piece.instanceId).canAttackNexus) continue
      const preview = previewAttackNexus(match, piece.instanceId)
      if (preview?.lethal && (!best || preview.damage > best.damage)) best = { pieceId: piece.instanceId, damage: preview.damage }
    }
    return best
  }, [match, ME, queueBusy])
  const [finishing, setFinishing] = useState<string>()

  // Habilidades que «hablan»: cada palabra clave que actúa en el duelo lanza
  // su animación sobre el tablero una sola vez (ver TraitFlourish).
  const [traitFx, setTraitFx] = useState<readonly TraitFx[]>([])
  const seenTraitFx = useRef(new Set<string>())
  useEffect(() => {
    const exchange = director.exchange
    if (!exchange || exchange.phase !== 'clash') return
    const at = (position?: Position): readonly [number, number] | undefined => position && [gridToWorldX(position.x), gridToWorldZ(position.y)]
    const defenderAt = at(exchange.defender.piece?.position)
    const attackerAt = at(exchange.attacker.piece?.position)
    const found: TraitFx[] = []
    const add = (kind: TraitFx['kind'], where?: readonly [number, number], to?: readonly [number, number]) => {
      const id = `${exchange.key}-${kind}`
      if (!where || seenTraitFx.current.has(id)) return
      seenTraitFx.current.add(id)
      found.push({ id, kind, at: where, to })
    }
    const triggered = exchange.attacker.triggered
    if (triggered.includes('pierce') && defenderAt) add('pierce', defenderAt, [defenderAt[0], nexusWorldZ(exchange.defender.owner)])
    if (triggered.includes('lifelink') && defenderAt && attackerAt) add('lifelink', defenderAt, [attackerAt[0], nexusWorldZ(exchange.attacker.owner)])
    if (triggered.includes('stun')) add('stun', defenderAt)
    if (exchange.defender.triggered.includes('shield')) add('shield', defenderAt)
    if (exchange.attacker.triggered.includes('shield')) add('shield', attackerAt)
    const defenderCard = exchange.defender.cardId ? CARD_BY_ID[exchange.defender.cardId] : undefined
    if (defenderCard?.keywords.includes('guard') || exchange.defender.piece?.grantedKeywords?.includes('guard')) add('guard', defenderAt)
    if (found.length === 0) return
    const show = window.setTimeout(() => setTraitFx((list) => [...list, ...found]), 0)
    const hide = window.setTimeout(() => setTraitFx((list) => list.filter((fx) => !found.includes(fx))), TRAIT_FX_MS + 200)
    return () => { window.clearTimeout(show); window.clearTimeout(hide) }
  }, [director.exchange])

  // Flechas de amenaza: la unidad seleccionada o, si no hay, la señalada con
  // el cursor (propia o rival). Sin carta en la mano elegida, que entonces el
  // tablero habla de despliegue.
  const threatFocus = useMemo(() => {
    if (!match || selectedCard || match.winner) return undefined
    const pieceId = selectedPiece?.instanceId ?? (hoveredTargetId && !hoveredTargetId.endsWith('-nexus') ? hoveredTargetId : undefined)
    if (!pieceId) return undefined
    const links = threatLinks(match, pieceId)
    if (links.targets.length === 0 && links.attackers.length === 0 && !links.hitsNexus) return undefined
    return { pieceId, ...links }
  }, [match, selectedPiece, selectedCard, hoveredTargetId])


  // Unidades propias que aún pueden mover o atacar: reciben un anillo de
  // disponibilidad en el tablero. Se recalcula solo cuando cambia la partida.
  const readyPieceIds = useMemo(() => {
    const ready = new Set<string>()
    if (!match || match.activePlayer !== ME || match.winner) return ready
    for (const piece of match.board) {
      if (piece.owner !== ME) continue
      if (CARD_BY_ID[piece.cardId]?.type !== 'unit') continue
      if (getValidMoves(match, piece.instanceId).length > 0) {
        ready.add(piece.instanceId)
        continue
      }
      const options = getValidAttacks(match, piece.instanceId)
      if (options.pieceIds.length > 0 || options.canAttackNexus) ready.add(piece.instanceId)
    }
    return ready
  }, [match, ME])

  // Handlers estables (useCallback): permiten memoizar las celdas y cartas del
  // tablero 3D para que la reproducción de eventos no re-renderice el canvas.
  // El invitado nunca es la autoridad de la partida: en vez de aplicar la
  // acción localmente, se la envía al anfitrión y confía en que la
  // retransmisión de estado (useNetworkSync) la refleje enseguida.
  /**
   * Deshacer: solo el último MOVIMIENTO, y solo mientras no se haya
   * confirmado nada más después. No ataques ni cartas jugadas —esas cambian
   * el estado del rival o consumen recursos de forma más difícil de
   * explicar al deshacerla— y no en multijugador: el invitado no tiene
   * autoridad sobre la partida, y para el anfitrión deshacer en local
   * dejaría su estado desincronizado del que ya vio el rival.
   */
  const [undoState, setUndoState] = useState<{ snapshot: MatchState; pieceId: string }>()
  const doAction = useCallback((action: GameAction) => {
    if (role === 'guest') {
      sendIntent({ kind: 'action', action })
      return true
    }
    const before = useMatchStore.getState().match
    const ok = useMatchStore.getState().dispatch(action)
    setUndoState(ok && action.type === 'move' && before ? { snapshot: before, pieceId: action.pieceId } : undefined)
    return ok
  }, [role, sendIntent])
  const undoLastMove = useCallback(() => {
    if (!undoState || room) return
    useMatchStore.getState().replaceMatch(undoState.snapshot, 'Deshaces tu último movimiento.')
    setUndoState(undefined)
  }, [undoState, room])
  const finishSelection = useCallback(() => {
    const state = useMatchStore.getState()
    state.selectHand(undefined)
    state.selectPiece(undefined)
  }, [])
  // Al acabar la escena del golpe de gracia se lanza el ataque al Nexo de verdad.
  const launchFinisher = useCallback(() => {
    const pieceId = finishing
    setFinishing(undefined)
    if (pieceId && doAction({ type: 'attack-nexus', playerId: ME, attackerId: pieceId })) finishSelection()
  }, [finishing, doAction, finishSelection, ME])

  // Soltar una carta sobre una casilla la juega ahí directamente. Se mantiene
  // en un ref porque quien lo dispara es el hook de arrastre, montado antes de
  // que existan `doAction` y compañía.
  useEffect(() => {
    playDraggedRef.current = (instanceId, position) => {
      const instance = player?.hand.find((candidate) => candidate.instanceId === instanceId)
      const card = instance ? CARD_BY_ID[instance.cardId] : undefined
      if (!card || !match || match.activePlayer !== ME || match.winner) return
      // Las fuentes no ocupan casilla: soltarlas en cualquier punto del tablero
      // las juega, que es lo que espera quien las arrastra.
      if (card.type === 'mana') {
        if (doAction({ type: 'play-resource', playerId: ME, cardInstanceId: instanceId })) finishSelection()
        return
      }
      // Los hechizos con objetivo siguen pidiendo clic sobre la ficha: una
      // casilla vacía no les dice a quién apuntar.
      if (!isBoardCard(card)) return
      if (doAction({ type: 'play-card', playerId: ME, cardInstanceId: instanceId, position, target: { kind: 'none' }, offering })) {
        finishSelection()
      }
    }
    // `offering` entra en las dependencias a propósito: sin él, marcar la
    // Ofrenda y soltar la carta arrastrándola la jugaría sin pagarla, en
    // silencio y sin que el jugador se enterase.
  }, [player, match, ME, doAction, finishSelection, offering])

  const consumeDragged = drag.consumeDragged
  const onHandSelect = useCallback((instanceId: string) => {
    // Al soltar tras un arrastre el navegador dispara además un clic; sin esto
    // ese clic alternaría la selección de la carta recién jugada.
    if (consumeDragged()) return
    if (!match || !player) return
    // Elegir carta es solo interfaz: se permite aunque haya una animación en
    // curso. Antes se ignoraba en silencio y, con animaciones largas, el
    // jugador pulsaba una carta y no pasaba nada.
    if (match.activePlayer !== ME || match.winner) return
    const instance = player.hand.find((candidate) => candidate.instanceId === instanceId)
    const card = instance ? CARD_BY_ID[instance.cardId] : undefined
    if (!instance || !card) return
    if (card.type === 'mana') {
      if (doAction({ type: 'play-resource', playerId: ME, cardInstanceId: instanceId })) finishSelection()
      return
    }
    useMatchStore.getState().selectHand(store.selectedHandId === instanceId ? undefined : instanceId)
  }, [match, player, store.selectedHandId, doAction, finishSelection, ME, consumeDragged])

  const inspectCard = useCallback((cardId?: string, pieceId?: string) => {
    setInspectedHandId(undefined)
    useMatchStore.getState().inspect(cardId, pieceId)
  }, [])
  const inspectHandCard = useCallback((cardId: string, instanceId: string) => {
    setInspectedHandId(instanceId)
    useMatchStore.getState().inspect(cardId)
  }, [])
  const closeInspection = useCallback(() => inspectCard(), [inspectCard])

  /**
   * Poder del comandante. Los que piden objetivo entran en un modo de
   * señalamiento: el siguiente clic sobre una unidad enemiga lo lanza. Así no
   * hace falta una interfaz aparte para elegir, se reutiliza el tablero.
   */
  const [aimingPower, setAimingPower] = useState(false)
  const power = commander?.power
  const powerPayment = useMemo(
    () => (power && match ? planManaPayment(match.players[ME].resources, power.cost) : undefined),
    [power, match, ME],
  )
  const powerUsed = match?.players[ME].commanderPowerUsed ?? false
  const canUsePower = Boolean(
    power && !powerUsed && match && !match.winner && match.activePlayer === ME && !queueBusy && powerPayment?.payable,
  )
  // Sin memoizar a propósito: solo la usa el botón del panel, que se
  // re-renderiza con la partida de todas formas. El disparo con objetivo va
  // por `onPiece`, que sí está memoizado porque lo consume el tablero 3D.
  const castPower = (target?: { kind: 'piece'; pieceId: string }) => {
    if (!power) return
    if (power.needsEnemyTarget && !target) {
      setAimingPower(true)
      useMatchStore.getState().setMessage(`${power.name}: señala una unidad enemiga.`)
      return
    }
    setAimingPower(false)
    if (doAction({ type: 'commander-power', playerId: ME, target })) finishSelection()
  }

  const onCell = useCallback((position: Position) => {
    if (photoMode) return
    // Pulsar la losa de un objetivo es pulsar el objetivo (ver hoveredOccupantId).
    const occupant = match?.board.find((piece) => piece.position.x === position.x && piece.position.y === position.y)
    if (occupant && match?.activePlayer === ME) {
      if (selectedInstance && selectedCard && !isBoardCard(selectedCard)) {
        if (doAction({ type: 'play-card', playerId: ME, cardInstanceId: selectedInstance.instanceId, target: { kind: 'piece', pieceId: occupant.instanceId }, offering })) finishSelection()
        return
      }
      if (selectedPiece && attacks.pieceIds.includes(occupant.instanceId)) {
        if (doAction({ type: 'attack-piece', playerId: ME, attackerId: selectedPiece.instanceId, defenderId: occupant.instanceId })) finishSelection()
        return
      }
    }
    if (selectedInstance && selectedCard && isBoardCard(selectedCard)) {
      if (doAction({ type: 'play-card', playerId: ME, cardInstanceId: selectedInstance.instanceId, position, target: { kind: 'none' }, offering })) finishSelection()
      return
    }
    if (selectedPiece && moves.some((cell) => cell.x === position.x && cell.y === position.y)) {
      if (doAction({ type: 'move', playerId: ME, pieceId: selectedPiece.instanceId, to: position })) finishSelection()
      return
    }
    // Pulsar una casilla que no sirve ya no es silencioso: se dice por qué.
    if (selectedPiece && selectedPiece.owner === ME && match?.activePlayer === ME) {
      useMatchStore.setState({ message: moves.length > 0 ? 'No puede ir ahí: elige una de las casillas resaltadas.' : 'Esta unidad ya no puede moverse este turno.' })
    }
  }, [photoMode, selectedInstance, selectedCard, selectedPiece, moves, attacks, doAction, finishSelection, ME, offering, match])

  const onPiece = useCallback((pieceId: string) => {
    if (photoMode || !match) return
    const piece = match.board.find((candidate) => candidate.instanceId === pieceId)
    if (!piece) return
    if (match.activePlayer === ME) {
      if (selectedInstance && selectedCard && !isBoardCard(selectedCard)) {
        if (doAction({ type: 'play-card', playerId: ME, cardInstanceId: selectedInstance.instanceId, target: { kind: 'piece', pieceId }, offering })) finishSelection()
        return
      }
      if (selectedPiece && attacks.pieceIds.includes(pieceId)) {
        if (doAction({ type: 'attack-piece', playerId: ME, attackerId: selectedPiece.instanceId, defenderId: pieceId })) finishSelection()
        return
      }
      if (piece.owner === ME) {
        useMatchStore.getState().selectPiece(store.selectedPieceId === pieceId ? undefined : pieceId)
        return
      }
    }
    // Consultar información completa de cualquier ficha (propia o rival) con
    // un clic normal, sin desencadenar ninguna acción — también fuera de tu
    // turno, para poder planear mientras observas la jugada del rival.
    const state = useMatchStore.getState()
    state.viewPiece(state.viewedPieceId === pieceId ? undefined : pieceId)
  }, [photoMode, match, selectedInstance, selectedCard, selectedPiece, attacks, doAction, finishSelection, ME, store.selectedPieceId, offering])

  const onNexus = useCallback((playerId: PlayerId) => {
    if (photoMode) return
    if (playerId === RIVAL && selectedPiece && attacks.canAttackNexus) {
      if (doAction({ type: 'attack-nexus', playerId: ME, attackerId: selectedPiece.instanceId })) finishSelection()
    }
  }, [photoMode, selectedPiece, attacks, doAction, finishSelection, ME, RIVAL])

  // ── Cursor de teclado sobre el tablero ────────────────────────────────────
  // Se apaga solo mientras haya un modal por encima (mulligan, escrutinio,
  // guía) o en modo foto: ahí las flechas pertenecen a esa otra interfaz.
  const cursorEnabled = Boolean(match) && !match?.pendingSpark && !match?.pendingDecisions?.length && !match?.winner && !photoMode && !scryOpen && !howToOpen && !inspected
    && !(match && canTakeMulligan(match, ME))
  const cursorHome = useMemo(() => {
    const own = match?.board.filter((piece) => piece.owner === ME) ?? []
    return own[0]?.position
  }, [match?.board, ME])
  const boardCursor = useBoardCursor({
    enabled: cursorEnabled,
    me: ME,
    board: match?.board ?? [],
    home: cursorHome,
    onCell,
    onPiece,
    onNexus,
  })

  /**
   * Aviso de acciones sin usar. Ceder el turno con una unidad parada, con
   * Esencia de sobra o sin haber jugado la fuente del turno es el despiste más
   * caro del juego (la fuente no se recupera: solo se puede jugar una por
   * turno). La primera pulsación avisa y la segunda cede igualmente; el aviso
   * se arma de nuevo en cuanto cambia la partida, para que no arrastre un
   * permiso concedido hace tres jugadas.
   */
  // El permiso se ata al ESTADO exacto de la partida en el que se avisó, en
  // vez de a un booleano que haya que reiniciar por efecto: cualquier jugada
  // posterior crea un estado nuevo y el aviso vuelve a armarse solo.
  const [warnedFor, setWarnedFor] = useState<MatchState>()
  const endTurn = useCallback(() => {
    if (preferences.confirmEndTurn && match && warnedFor !== match) {
      const pending = pendingTurnActions(match, ME)
      if (pending.anything) {
        setWarnedFor(match)
        useMatchStore.getState().setMessage(describePendingActions(pending))
        return
      }
    }
    if (doAction({ type: 'end-turn', playerId: ME })) finishSelection()
  }, [doAction, finishSelection, ME, match, preferences.confirmEndTurn, warnedFor])

  // Atajos de teclado adicionales a Esc/I (ver el otro efecto de teclado):
  // van aparte porque necesitan `endTurn`, definido después de aquel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (inspected) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const key = event.key.toLowerCase()
      if (key === 'e' && match?.activePlayer === ME && !match.winner && !queueBusy) {
        event.preventDefault()
        endTurn()
        return
      }
      if (key === 'h') {
        event.preventDefault()
        setHandTucked((current) => !current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [match?.activePlayer, match?.winner, queueBusy, ME, endTurn, inspected])

  const closeHowTo = useCallback(() => {
    const firstTime = !hasSeenHowTo()
    markHowToSeen()
    setHowToOpen(false)
    // El coach interactivo solo arranca la primerísima vez, justo tras la
    // guía de bienvenida; reabrir la guía luego con el botón de ayuda no lo repite.
    if (firstTime) setTutorialActive(true)
  }, [])

  const leaveToHome = useCallback((to: string) => {
    room?.leave()
    clearTicket()
    useNetworkStore.getState().clear()
    useMatchStore.getState().reset()
    navigate(to)
  }, [room, navigate])

  if (!match || !player || !rival) {
    return (
      <div className={styles.battle} data-motion={preferences.reducedMotion ? 'reduced' : 'full'}>
        {(room || rejoining) && (
          <div className={styles.resultBackdrop}>
            <section className={styles.result}>
              <small>Multijugador</small>
              <h2>{rejoining ? 'Volviendo a la sala…' : 'Preparando la partida…'}</h2>
            </section>
          </div>
        )}
      </div>
    )
  }

  const playSelectedWithoutTarget = () => {
    if (!selectedInstance || !selectedCard) return
    if (doAction({ type: 'play-card', playerId: ME, cardInstanceId: selectedInstance.instanceId, target: { kind: 'none' } , offering })) finishSelection()
  }

  const abandonMatch = () => {
    recorder.recordAbandon(match)
    setConfirmAbandon(false)
    leaveToHome('/play')
  }

  const repeat = () => {
    store.reset()
    setMulliganIds([])
    setFavoriteHandIds(new Set())
    setUndoState(undefined)
    setPhotoMode(false)
    ai.reset()
    recorder.reset()
    director.resetBanners()
    // La revancha respeta el rival elegido igual que la primera partida.
    store.startMatch(
      preferences.selectedDeckId,
      forcedSeed,
      preferences.opponentDeckId === 'random' ? undefined : preferences.opponentDeckId,
    )
  }

  const confirmMulligan = () => {
    // El invitado no tiene autoridad sobre la partida: pide el mulligan al
    // anfitrión y espera a que la retransmisión de estado lo refleje.
    if (role === 'guest') {
      sendIntent({ kind: 'mulligan', ids: mulliganIds })
      setMulliganIds([])
      return
    }
    const result = mulliganOpeningHand(match, ME, mulliganIds)
    if (!result.ok) {
      store.setMessage(result.error?.message ?? 'No se pudo completar el mulligan.')
      return
    }
    store.replaceMatch(result.state, mulliganIds.length > 0 ? `Cambias ${mulliganIds.length} cartas de la mano inicial.` : 'Conservas tu mano inicial.')
    setMulliganIds([])
  }

  const confirmScry = () => {
    if (role === 'guest') {
      sendIntent({ kind: 'scry', order: director.scryOrder })
      director.setScryAmount(0)
      director.setScryOrder([])
      return
    }
    const result = reorderTopCards(match, ME, director.scryOrder)
    if (result.ok) {
      store.replaceMatch(result.state, 'Ordenas la parte superior de tu mazo.')
    }
    director.setScryAmount(0)
    director.setScryOrder([])
  }

  const moveScryCard = (instanceId: string, direction: -1 | 1) => {
    director.setScryOrder((current) => {
      const index = current.indexOf(instanceId)
      const swap = index + direction
      if (index < 0 || swap < 0 || swap >= current.length) return current
      const next = [...current]
      next[index] = next[swap]!
      next[swap] = instanceId
      return next
    })
  }

  const devApply = (mutate: (current: MatchState) => MatchState) => {
    store.replaceMatch(mutate(match))
  }

  // La ficha "consultada" manda sobre la propia seleccionada: así se puede
  // asomarse a una pieza rival (o repasar la propia) sin perder la selección
  // de acción que ya tenías en marcha por debajo.
  const activeInfo = viewedBoardCard ?? selectedCard ?? selectedBoardCard
  const readyHandCount = player.hand.filter((instance) => {
    const card = CARD_BY_ID[instance.cardId]
    return card && canPlayHandCard(match, ME, card, instance)
  }).length
  const viewingForeign = Boolean(viewedPiece && viewedPiece.owner !== ME)
  const canCastDirectly = Boolean(!viewedBoardCard && selectedCard && !isBoardCard(selectedCard) && !requiresPieceTarget(selectedCard))
  const revealedCard = director.revealedCardId ? CARD_BY_ID[director.revealedCardId] : undefined

  /** Estado visual del botón de turno: listo, resolviendo, turno rival o fin. */
  const turnState = match.winner ? 'over' : match.activePlayer !== ME ? 'enemy' : queueBusy ? 'busy' : 'ready'

  const contextStats = viewedPiece && viewedBoardCard
    ? pieceStatLine(viewedPiece, viewedBoardCard)
    : selectedPiece && selectedBoardCard
      ? pieceStatLine(selectedPiece, selectedBoardCard)
      : selectedCard
        ? cardStatLine(selectedCard)
        : undefined

  const tide = tidePhase(match)
  const sunDamage = selectedCard?.effects.find((effect) => effect.kind === 'damage-all-enemies-by-sun-count')
  const sunCount = player.sunCount ?? 0
  let factionHint: string | undefined
  if (!viewedBoardCard) {
    if (attackPreview) factionHint = attackPreview.lines.join(' · ')
    else if (selectedCard?.effects.some((effect) => effect.kind === 'tide')) {
      factionHint = `Se resuelve en ${tide === 'high' ? 'Pleamar' : 'Bajamar'}. Consulta esa rama en la carta.`
    } else if (selectedCard?.id === 'dragon-del-rio-amarillo') {
      factionHint = match.mandate === ME
        ? 'Con Mandato · al entrar intenta congelar 2 turnos a la unidad enemiga con más Ataque.'
        : 'Sin Mandato · el Dragón entra sin congelar.'
    } else if (selectedCard?.effects.some((effect) => effect.kind === 'mandate')) {
      factionHint = `Rama de Mandato ${match.mandate === ME ? 'activa' : 'inactiva'} con el estado actual.`
    } else if (sunDamage && !selectedCard?.effects.some((effect) => effect.kind === 'sacrifice')) {
      const amount = Math.min(sunCount, sunDamage.cap ?? sunCount)
      factionHint = `Cuenta del Sol · ${sunCount}. Inflige ${amount} de daño a cada unidad rival, antes de protecciones.`
    }
  }

  const actionHint = actionHintFor({
    finished: Boolean(match.winner),
    isMyTurn: match.activePlayer === ME,
    viewedPiece,
    viewingForeign,
    selectedCard,
    canPaySelectedCard: payment?.payable !== false,
    canPlaySelectedCard: selectedPlayable,
    selectedBlockReason: selectedCard && selectedInstance ? handCardBlockReason(match, ME, selectedCard, selectedInstance) : undefined,
    selectedPiece,
    moveCount: moves.length,
    canAttackPiece: attacks.pieceIds.length > 0,
    canAttackNexus: attacks.canAttackNexus,
  })

  return (
    <div className={styles.battle} data-motion={preferences.reducedMotion ? 'reduced' : 'full'}
      data-hand-collapsed={handTucked || player.hand.length === 0 || undefined}
      style={{ '--battle-accent': FACTION_BY_ID[commander?.faction ?? 'fury'].accentColor } as CSSProperties}>
      <header className={styles.topbar}>
        {!photoMode && <FactionPowers match={match} me={ME} ownFaction={commander?.faction} rivalFaction={rivalCommander?.faction} />}
        <button
          className={styles.exit}
          onClick={() => {
            if (!match.winner) { setConfirmAbandon(true); return }
            room?.leave()
            clearTicket()
            useNetworkStore.getState().clear()
            navigate('/play')
          }}
        >
          {/* Dos rótulos: el largo se recorta a «ABANDONA…» en móvil, que no
              dice nada. Ahí se usa el corto entero en vez de un texto a medias. */}
          <span className={styles.exitLong}>← Abandonar batalla</span>
          <span className={styles.exitShort}>← Salir</span>
        </button>
        <div className={styles.turn} data-testid="battle-turn">
          <strong>{match.activePlayer === ME ? 'Tu turno' : 'Turno rival'}</strong>
          <span>Turno {match.turn} · {PHASE_LABELS[match.phase] ?? match.phase}</span>
        </div>
        <div className={styles.headerRight}>
        <button
          type="button"
          className={styles.enemySummary}
          onClick={() => setEnemyPanelOpen((open) => !open)}
          aria-expanded={enemyPanelOpen}
          title="Ver los datos del rival: vida, esencia, mazo y descarte"
        >
          <div className={styles.enemyStats}>
            <div className={styles.enemyName}>
              {rivalCommander && <FactionSigil faction={rivalCommander.faction} size="small" decorative />}
              <strong>{rivalCommander?.name}</strong>
            </div>
            <div className={styles.enemyChips}>
              <span className={styles.enemyChip} data-kind="mana" title="Esencia disponible del rival">
                <GameIcon name="mana" /> {rivalMana.available}/{rivalMana.total}
              </span>
              <span className={styles.enemyChip} data-kind="hand" title="Cartas en la mano del rival">
                <GameIcon name="hand" /> {rival.hand.length}
              </span>
              <span className={styles.enemyChip} data-kind="deck" title="Cartas en el mazo del rival">
                <GameIcon name="deck" /> {rival.deck.length}
              </span>
            </div>
          </div>
          <div className={styles.nexusOrb} title="Vida del Nexo rival"><GameIcon name="health" />{displayedNexusHealth[RIVAL]}</div>
        </button>
          <div className={styles.battleTools}>
      <button
        className={styles.photoModeButton}
        type="button"
        data-active={photoMode || undefined}
        onClick={() => setPhotoMode((current) => !current)}
        aria-pressed={photoMode}
        aria-label={photoMode ? 'Salir del modo foto' : 'Modo foto: cámara libre para admirar el tablero'}
        title={photoMode ? 'Salir del modo foto' : 'Modo foto: cámara libre para admirar el tablero, sin poder jugar mientras está activo'}
      >
        📷
      </button>


      <button
        className={styles.helpButton}
        type="button"
        onClick={() => setHowToOpen(true)}
        aria-label="Cómo jugar"
        title="Cómo jugar"
      >
        ?
      </button>

      <button
        className={styles.glossaryButton}
        type="button"
        onClick={() => setGlossaryOpen(true)}
        aria-label="Glosario de términos"
        title="Glosario de términos"
      >
        §
      </button>

          </div>
        </div>
      </header>

      {isAdventureMatch && <AdventureBattlePanel match={match} queueBusy={queueBusy} />}
      {enemyPanelOpen && <EnemyPanel rival={rival} onClose={() => setEnemyPanelOpen(false)} />}
      {director.spotlight && !photoMode && (
        <CastSpotlight
          key={director.spotlight.eventId}
          spotlight={director.spotlight}
          me={ME}
          reducedMotion={preferences.reducedMotion}
          onDismiss={director.dismissSpotlight}
        />
      )}

      {/* Fase de peligro: con tu Nexo a un cuarto de Vida o menos, los bordes
          de la pantalla laten en rojo. La corona 3D del Nexo late a la vez. */}
      {match && !photoMode && preferences.nexusWarning !== 'off' && displayedNexusHealth[ME] > 0
        && displayedNexusHealth[ME] <= nexusMaxHealth[ME] * NEXUS_DANGER_RATIO
        && <div className={styles.dangerVignette} data-warning-style={preferences.nexusWarning ?? 'subtle'} data-reduced-motion={preferences.reducedMotion || undefined} aria-hidden="true" />}
      <div className={styles.arena}>
        <div
          className={styles.boardFrame}
          data-impact={!preferences.reducedMotion && director.impact ? director.impact.strength : undefined}
          data-impact-key={director.impact?.key}
        >
          <Board3D
            state={match}
            nexusMaxHealth={nexusMaxHealth}
            localPlayerId={ME}
            selectedPieceId={duelOnBoard?.attacker ?? store.selectedPieceId}
            validCells={validCells}
            movementHazards={movementHazards}
            focusedHazard={hoveredCell ?? boardCursor.cell}
            cellIntent={selectedCard ? 'deploy' : 'move'}
            colorblindMode={preferences.colorblindMode}
            boardTextScale={preferences.boardTextScale}
            validTargets={duelOnBoard ? [duelOnBoard.defender] : castTargetOnBoard ? [castTargetOnBoard] : boardTargets}
            readyPieceIds={readyPieceIds}
            onCell={onCell}
            onPiece={onPiece}
            onInspectPiece={inspectCard}
            onNexus={onNexus}
            onCellHover={onCellHover}
            dragging={Boolean(drag.draggingId)}
            onHoverPiece={onHoverPiece}
            onHoverNexus={onHoverNexus}
            attackPreview={attackPreview}
            photoMode={photoMode}
            reducedMotion={preferences.reducedMotion}
            renderPaused={Boolean(inspected || scryOpen || howToOpen || glossaryOpen || confirmAbandon || match.pendingSpark || match.pendingDecisions?.length || canTakeMulligan(match, ME))}
            quality={preferences.graphicsQuality}
            scenario={scenario}
            activeEvent={visualEvent}
            castImpact={visualEvent ? store.castImpacts[visualEvent.id] : undefined}
            threatFocus={queueBusy ? undefined : threatFocus}
            traitFx={traitFx}
            pendingEvents={store.pendingAnimations}
            cursorCell={boardCursor.cell}
          />
          {/* Voz del cursor de teclado para lectores de pantalla: el tablero 3D
              es un lienzo WebGL, así que su contenido no existe como texto. */}
          <p className={styles.srOnly} role="status" aria-live="polite">{boardCursor.announcement}</p>
          {!photoMode && !queueBusy && !inspected && <MovementHazardWarning hazards={movementHazards} focused={hoveredCell ?? boardCursor.cell} />}
          {director.banner && !photoMode && (
            <TurnBanner
              key={`${match.turn}-${director.banner}`}
              text={director.banner}
              mine={director.banner === 'Tu turno'}
              commander={director.banner === 'Tu turno' ? commander : rivalCommander}
              turn={match.turn}
              reducedMotion={preferences.reducedMotion}
            />
          )}
          {/* Ritmo a mano, sin salir a Ajustes: cinco segundos por carta se
              disfrutan en una partida tranquila y pesan en una de cincuenta
              turnos; el jugador decide en el momento. */}
          <button
            className={styles.paceButton}
            type="button"
            data-pace={preferences.presentationPace}
            onClick={() => {
              const next = PRESENTATION_PACES[(PRESENTATION_PACES.indexOf(preferences.presentationPace) + 1) % PRESENTATION_PACES.length]!
              preferences.setPresentationPace(next)
              setPaceHint(`Ritmo ${PACE_LABELS[next].name.toLowerCase()}: ${PACE_LABELS[next].hint}`)
            }}
            aria-label={`Ritmo de la partida: ${PACE_LABELS[preferences.presentationPace].name}. Pulsa para cambiarlo`}
            title={`Ritmo: ${PACE_LABELS[preferences.presentationPace].name}. ${PACE_LABELS[preferences.presentationPace].hint}`}
          >
            {preferences.presentationPace === 'cinematic' ? '🎬' : preferences.presentationPace === 'normal' ? '▶' : '⏩'}
          </button>
          {/* Rematar: sale cuando una unidad propia puede derribar el Nexo
              rival este turno; lanza la escena del comandante y luego el golpe. */}
          {finisher && !finishing && !photoMode && (
            <button type="button" className={styles.finishButton} onClick={() => setFinishing(finisher.pieceId)}>
              <span aria-hidden="true">⚔</span> Rematar
              <small>Golpe de gracia al Nexo rival</small>
            </button>
          )}
          {/* Repetir la última jugada a cámara lenta: el estado no cambia, solo
              se vuelven a reproducir sus eventos con el ritmo cinemático. */}
          {store.lastPlay && !photoMode && (
            <button
              className={`${styles.paceButton} ${styles.replayButton}`}
              type="button"
              disabled={queueBusy}
              onClick={() => store.replayLastPlay()}
              aria-label="Repetir la última jugada"
              title="Repetir la última jugada"
            >
              ↺
            </button>
          )}
          {paceHint && !photoMode && (
            <div key={paceHint} className={styles.paceHint} role="status">
              {paceHint}
            </div>
          )}
          {!photoMode && <><RecentPlays plays={director.recentPlays} me={ME} onInspect={inspectCard} /><EffectChronicle effects={store.resolvedEffects} /></>}
          {/* El comandante habla: poder, golpe fuerte a su Nexo o victoria. */}
          {director.quote && !photoMode && COMMANDER_BY_ID[match.players[director.quote.owner].commanderId] && (
            <CommanderQuote
              key={`frase-${director.quote.key}`}
              commander={COMMANDER_BY_ID[match.players[director.quote.owner].commanderId]!}
              text={director.quote.text}
              duel={Boolean(director.exchange)}
              mine={director.quote.owner === ME}
            />
          )}
          {/* Respuesta: sello lateral con el tipo de reacción. */}
          {director.reaction && !director.exchange && !photoMode && (
            <div key={`reaccion-${director.reaction.key}`} className={styles.reaction} data-kind={director.reaction.kind} role="status">
              <small>Respuesta</small>
              <strong>{director.reaction.title}</strong>
              <span>{director.reaction.detail}</span>
            </div>
          )}
          {/* Reacción en cadena: crece y se calienta con cada muerte encadenada. */}
          {director.chain && !photoMode && (
            <div key={`cadena-${director.chain.key}`} className={styles.chain} data-level={Math.min(director.chain.count, 5)} role="status">
              <span>¡Reacción en cadena!</span>
              <strong>×{director.chain.count}</strong>
            </div>
          )}
          {director.exchange && !photoMode && (
            <CombatDuel
              exchange={director.exchange}
              me={ME}
              commanderIds={{ player: match.players.player.commanderId, ai: match.players.ai.commanderId }}
              nexusHealth={displayedNexusHealth}
              reducedMotion={preferences.reducedMotion}
              nexusMaxHealth={nexusMaxHealth}
              holding={director.duelHolding}
              onSkip={director.dismissDuel}
              combo={director.combo?.key === director.exchange.key ? director.combo.count : undefined}
            />
          )}
          {resolvedImpact && !photoMode && !director.spotlight && (
            <div className={styles.liveEffect} data-duel={Boolean(director.exchange) || undefined} role="status" aria-live="polite">
              {resolvedPlates.slice(0, 2).map((effect) => (
                <BattlePlate key={`${currentEvent?.id}-${effect.id}`} label={effect.label ?? effect.text}
                  detail={`${effect.source} · ${effect.target}${effect.label && effect.label !== effect.text ? ` · ${effect.text}` : ''}`}
                  metric={effect.metric} keyword={effect.keyword} faction={effect.faction} active />
              ))}
            </div>
          )}
          {!resolvedImpact && director.eventBanner && !director.exchange && !photoMode && (
            <div key={director.eventBanner} className={styles.eventBanner} data-kind={director.eventBannerKind} role="status">{director.eventBanner}</div>
          )}
          {director.nexusFlash && <div className={styles.nexusFlash} data-who={director.nexusFlash} aria-hidden="true" />}
          {queueBusy && pendingCount >= 2 && (
            <button className={styles.skipQueue} onClick={() => { director.dismissSpotlight(); director.dismissDuel(); store.skipAnimations() }}>
              Saltar animaciones ({pendingCount})
            </button>
          )}

        </div>
        <aside className={styles.leftPanel} data-mobile-open={ownPanelOpenMobile || undefined}>
          <section className={styles.panelSection}>
            <span className={styles.panelLabel}>Comandante</span>
            <div className={`${styles.commander} ${styles.ownCommander}`}>
              <div className={styles.portraitFrame} data-profile-frame={profile.frame.id}>
                <img className={styles.portrait} src={commander ? withBase(commander.art.webp) : undefined} alt="" />
                {commander && <FactionSigil faction={commander.faction} size="large" decorative className={styles.commanderSigil} />}
              </div>
              <div className={styles.commanderIdentity}><strong>{commander?.name}</strong><small>{commander?.title}</small></div>
            </div>
            {/* Tu perfil: el título elegido y la racha, ganados con logros y victorias. */}
            <div className={styles.profileStrip}>
              <span className={styles.profileTitle}>{profile.title.label}</span>
              <StreakEmblem streak={profile.streak} compact />
            </div>
            {commander && <p className={styles.commanderRules}>{commander.rules}</p>}
            {player.runo !== undefined && <p className={styles.commanderBoon}>Runo: {player.runo} · +{Math.floor(player.runo / 3)} Ataque a tus unidades</p>}
            {player.unitDiscountPending && <p className={styles.commanderBoon}>Pasiva activa: tu siguiente unidad cuesta 1 menos.</p>}
            {/* Poder del comandante: una vez por partida, y la única jugada
                del juego que no sale de una carta. */}
            {power && (
              <button
                type="button"
                className={styles.commanderPower}
                data-aiming={aimingPower || undefined}
                data-used={powerUsed || undefined}
                onClick={() => (aimingPower ? setAimingPower(false) : castPower())}
                disabled={!canUsePower && !aimingPower}
                title={powerUsed ? 'Ya usado en esta partida' : power.description}
              >
                <span className={styles.powerCaption}>Poder único · {powerUsed ? 'Usado' : '1 uso'}</span>
                <span className={styles.powerHead}>
                  <strong>{power.name}</strong>
                  <span className={styles.powerCost}>
                    {power.cost.generic > 0 && <span>{power.cost.generic}</span>}
                    {Object.entries(power.cost.colored).map(([faction, amount]) => (
                      <span key={faction} data-faction={faction}
                        style={{ '--resource-color': FACTION_BY_ID[faction as FactionId].accentColor } as CSSProperties}>{amount}</span>
                    ))}
                  </span>
                </span>
                <small>
                  {powerUsed
                    ? 'Ya lo has usado en esta partida.'
                    : aimingPower
                      ? 'Elige el objetivo abajo · pulsa para cancelar'
                      : power.description}
                </small>
              </button>
            )}
            {/* Objetivos del poder: se eligen aquí en vez de interceptando el
                clic del tablero, que obligaría a leer estado dentro del
                manejador memoizado que consume la escena 3D. */}
            {aimingPower && power && (
              <div className={styles.powerTargets}>
                {match.board.filter((piece) => piece.owner === RIVAL).map((piece) => (
                  <button
                    key={piece.instanceId}
                    type="button"
                    onClick={() => castPower({ kind: 'piece', pieceId: piece.instanceId })}
                  >
                    {CARD_BY_ID[piece.cardId]?.name ?? 'Unidad'}
                  </button>
                ))}
                {match.board.every((piece) => piece.owner !== RIVAL) && (
                  <p>No hay unidades enemigas a las que apuntar.</p>
                )}
              </div>
            )}
          </section>
          <section className={styles.panelSection}>
            <div className={styles.lifeRow}>
              <span>Vida del Nexo</span>
              <span key={displayedNexusHealth[ME]} className={styles.life}><GameIcon name="health" /> {displayedNexusHealth[ME]}</span>
            </div>
            <div className={styles.deckCounters}>
              <div className={styles.counter}><strong key={player.deck.length}>{player.deck.length}</strong><span>Mazo</span></div>
              <div className={styles.counter}><strong key={player.discard.length}>{player.discard.length}</strong><span>Descarte</span></div>
            </div>
            <p className={styles.essenceNote} title={ESSENCE_LABELS[commander?.faction ?? 'fury']}>
              Esencia: <strong>{mana.available} / {mana.total}</strong>{mana.exhausted > 0 ? ` · ${mana.exhausted} agotadas` : ''}
            </p>
          </section>
          <section className={styles.panelSection}>
            <div className={styles.dailyBattleNote} data-done={daily.done}>
              <span className={styles.dailyBattleBadge}>{daily.done ? '✓' : '◆'}</span>
              <div>
                <small>Reto de hoy</small>
                <strong>{daily.title}</strong>
              </div>
            </div>
          </section>
        </aside>
        {/* `data-context-empty` es para el CSS de móvil: sin nada seleccionado,
            el panel se reduce a su línea de guía en vez de ocupar media
            pantalla para decir «selecciona una carta». */}
        <aside className={styles.rightPanel} data-context-empty={!activeInfo || undefined}>
          <SelectionPanel
            card={activeInfo}
            cost={viewedBoardCard ? undefined : selectedCost}
            heading={viewedBoardCard ? (viewingForeign ? 'Ficha rival' : 'Consulta') : activeInfo ? 'Selección' : 'Contexto'}
            stats={contextStats}
            hint={actionHint}
            canCast={canCastDirectly && selectedPlayable === true}
            onCast={playSelectedWithoutTarget}
            factionHint={factionHint}
            offering={offeringBase === undefined ? undefined : {
              cost: offeringToll,
              health: player.nexusHealth,
              rivalHealth: rival.nexusHealth,
              checksJudgement: Boolean(selectedCard?.effects.some((effect) => effect.kind === 'judgement')),
              paying: offering,
              affordable: offeringAffordable,
              onToggle: () => setOfferingFor(
                offering ? undefined : selectedInstance?.instanceId,
              ),
            }}
          />
          {/* En móvil se oculta: el aviso central de eventos ya anuncia cada
              acción, así que este registro es redundante ahí y solo le quita
              sitio al tablero. En PC se conserva, plegado por defecto. */}
          <div className={styles.historyLogWrap}>
            <HistoryLog entries={store.history} />
          </div>
          <div className={styles.turnDock}>
            {hybrisClosingLoss !== undefined && <p className={styles.hybrisNotice}>Hybris · perderías {hybrisClosingLoss} de Vida al cerrar el turno</p>}
            {undoState && !room && turnState === 'ready' && (
              <button
                className={styles.undoMove}
                onClick={undoLastMove}
                title="Deshace tu último movimiento. Deja de estar disponible en cuanto haces cualquier otra cosa."
              >
                ↺ Deshacer movimiento
              </button>
            )}
            <button
              ref={endTurnRef}
              className={styles.endTurn}
              data-state={turnState}
              onClick={endTurn}
              disabled={turnState !== 'ready'}
              aria-label="Finalizar turno"
              title={
                turnState === 'enemy' ? 'Espera: la IA está jugando su turno.'
                  : turnState === 'busy' ? 'Espera a que terminen las animaciones en curso.'
                  : turnState === 'over' ? 'La partida ha terminado.'
                  : 'Cede el turno al rival (tecla E). Tus fuentes se recargan al empezar tu próximo turno.'
              }
            >
              {turnState === 'enemy' ? 'Turno rival…' : turnState === 'busy' ? 'Resolviendo…' : turnState === 'over' ? 'Crónica concluida' : 'Finalizar turno'}
            </button>
          </div>
        </aside>
      </div>

      <footer ref={handBarRef} className={styles.handBar} data-tucked={handTucked || player.hand.length === 0 || undefined}>
        <button
          className={styles.handToggle}
          type="button"
          onClick={() => setHandTucked((current) => !current)}
          aria-pressed={handTucked || player.hand.length === 0}
          disabled={player.hand.length === 0}
          aria-label={player.hand.length === 0 ? 'Sin cartas en mano' : handTucked ? 'Mostrar la mano' : 'Recoger la mano'}
          title={player.hand.length === 0 ? 'Tu mano está vacía.' : handTucked ? 'Mostrar la mano (tecla H)' : 'Recoger la mano para despejar el tablero (tecla H)'}
        >
          {player.hand.length === 0 ? 'Sin cartas en mano' : handTucked ? '▲ Mano' : '▼ Recoger'}
        </button>
        <section className={styles.handLedger} aria-label="Tu reserva de Esencia">
          <span className={styles.ledgerWatermark} aria-hidden="true"><EssenceSeal /><FactionSigil faction={commander?.faction ?? 'fury'} decorative size="large" /></span>
          <span className={styles.ledgerTitle}>Reserva de Esencia</span>
          <div className={styles.essencePill} data-empty={mana.available === 0 || undefined}
            style={{ '--essence-charge': `${mana.total ? mana.available / mana.total * 100 : 0}%`,
              '--reserve-source-count': Math.max(1, Math.min(12, player.resources.length)) } as CSSProperties}
            aria-label={`Esencia disponible: ${mana.available} de ${mana.total}`}>
            <span className={styles.essenceSigil} aria-hidden="true"><EssenceSeal /><FactionSigil faction={commander?.faction ?? 'fury'} decorative size="large" /></span>
            <div className={styles.reserveReadout}>
              <small>Esencia disponible</small>
              <strong key={`${mana.available}/${mana.total}`} className={styles.essenceCount}>{mana.available} / {mana.total}</strong>
              <span>{mana.total === 0 ? 'Invoca tus fuentes' : mana.available === 0 ? 'Reserva agotada' : `Agotadas · ${mana.total - mana.available}`}</span>
            </div>
            <span className={styles.essencePips} aria-hidden="true">
              {player.resources.slice(0, 12).map((resource) => (
                <span
                  key={resource.instanceId}
                  data-faction={resource.faction}
                  style={{ '--resource-color': FACTION_BY_ID[resource.faction].accentColor } as CSSProperties}
                  data-exhausted={resource.exhausted}
                  data-spend={(payment?.payable && payment.resourceIds.includes(resource.instanceId)) || undefined}
                ><FactionSigil faction={resource.faction} decorative size="small" /></span>
              ))}
            </span>
            <span className={styles.essenceChannel} aria-hidden="true"><i /></span>
          </div>
          <small className={styles.sourceStatus} data-used={player.resourcePlayedThisTurn || undefined}>
            {player.resourcePlayedThisTurn ? 'Fuente del turno utilizada' : player.hand.some(({ cardId }) => CARD_BY_ID[cardId]?.type === 'mana') ? 'Puedes jugar una fuente' : 'Sin fuentes en la mano'}
          </small>
        </section>
        <HandFan
          reducedMotion={preferences.reducedMotion}
          match={match}
          localPlayerId={ME}
          selectedHandId={store.selectedHandId}
          onSelect={onHandSelect}
          onInspect={inspectHandCard}
          onDragStart={drag.start}
          draggingId={drag.draggingId}
          favoriteIds={favoriteHandIds}
          onToggleFavorite={toggleFavoriteHand}
        />
        <section className={styles.handContext} aria-label="Información de la mano">
          <span className={styles.ledgerTitle}>{selectedCard ? 'Carta elegida' : selectedPiece || viewedPiece ? 'Ficha consultada' : 'Tu mano'}</span>
          <strong>{selectedCard?.name ?? selectedBoardCard?.name ?? viewedBoardCard?.name ?? `${player.hand.length} cartas`}</strong>
          <p>{selectedCard && selectedInstance
            ? handCardBlockReason(match, ME, selectedCard, selectedInstance) ?? (selectedCard.type === 'mana' ? 'Puedes incorporar esta fuente a tu reserva.' : selectedCard.type === 'instant' ? 'Lista: elige un objetivo si la carta lo requiere.' : 'Lista: elige una casilla iluminada para desplegar.')
            : selectedPiece && selectedBoardCard ? pieceStatLine(selectedPiece, selectedBoardCard)
            : viewedPiece && viewedBoardCard ? pieceStatLine(viewedPiece, viewedBoardCard)
            : match.activePlayer === ME ? `${readyHandCount} cartas listas · ${mana.available} de ${mana.total} Esencia. Selecciona una carta para ver sus opciones.` : 'El rival está jugando su turno. Puedes inspeccionar cartas y consultar tus recursos.'}</p>
          {selectedCard && selectedInstance && <small className={styles.costContext}>Coste efectivo: {formatManaCost(selectedCost ?? selectedCard.cost)}{handCardCostDetails(match, ME, selectedCard, selectedInstance).reasons.length > 0 && ` · ${handCardCostDetails(match, ME, selectedCard, selectedInstance).reasons.join(' · ')}`}</small>}
          <dl className={styles.handFacts}>
            <div data-ready={readyHandCount > 0 || undefined}><dt>Listas</dt><dd aria-label="Cartas que puedes jugar">{readyHandCount}</dd></div>
            <div><dt>En mesa</dt><dd>{match.board.filter(({ owner }) => owner === ME).length}</dd></div>
            <div><dt>Mazo</dt><dd>{player.deck.length}</dd></div>
            <div><dt>Descarte</dt><dd>{player.discard.length}</dd></div>
          </dl>
        </section>
        <div className={styles.hints} aria-hidden="true">
          Clic — jugar · Clic derecho o I — inspeccionar · Esc — cancelar · E — fin de turno · H — recoger mano
        </div>
      </footer>

      {drag.draggingId && drag.pointer && selectedCard && (
        <DragGhost
          card={selectedCard}
          pointer={drag.pointer}
          overValidCell={Boolean(hoveredCell && validCells.some((cell) => cell.x === hoveredCell.x && cell.y === hoveredCell.y))}
        />
      )}

      {store.message && <button className={styles.message} onClick={() => store.setMessage(undefined)}>{store.message}</button>}

      {revealedCard && (
        <div className={styles.revealToast} role="status">
          <small>Observas la primera carta de tu mazo</small>
          <strong>{revealedCard.name}</strong>
          <span>{TYPE_LABELS[revealedCard.type]}{revealedCard.subtype ? ` — ${revealedCard.subtype}` : ''}</span>
        </div>
      )}

      {scryOpen && (
        <ScryDialog
          order={director.scryOrder}
          deck={player.deck}
          onMove={moveScryCard}
          onConfirm={confirmScry}
        />
      )}

      {/* Solo visible en móvil (CSS): tu vida y esencia ya se ven en el tablero y
          la píldora inferior, así que el panel propio queda oculto por defecto. */}
      <button
        className={styles.ownPanelToggle}
        type="button"
        onClick={() => setOwnPanelOpenMobile((open) => !open)}
        aria-pressed={ownPanelOpenMobile}
        aria-label={ownPanelOpenMobile ? 'Ocultar tus datos' : 'Ver tus datos: comandante, mazo, descarte y reto de hoy'}
        title={ownPanelOpenMobile ? 'Ocultar tus datos' : 'Ver tus datos: comandante, mazo, descarte y reto de hoy'}
      >
        ⛨
      </button>

      {photoMode && (
        <div className={styles.photoModeHint} role="status">
          Modo foto: mueve la cámara libremente. Pulsa 📷 para volver a jugar.
        </div>
      )}

      {glossaryOpen && <GlossaryPanel onClose={() => setGlossaryOpen(false)} />}

      {howToOpen && <HowToPlay onClose={closeHowTo} />}

      {confirmAbandon && (
        <div className={styles.resultBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmAbandon(false) }}>
          <section className={styles.abandonDialog} role="alertdialog" aria-modal="true" aria-labelledby="abandon-title">
            <small>Antes de irte</small>
            <h2 id="abandon-title">¿Abandonar esta crónica?</h2>
            <p>Contará como una derrota en tu historial. La partida no se puede retomar después.</p>
            <div className={styles.abandonActions}>
              <button className={styles.abandonCancel} onClick={() => setConfirmAbandon(false)}>Seguir jugando</button>
              <button className={styles.abandonConfirm} onClick={abandonMatch}>Abandonar</button>
            </div>
          </section>
        </div>
      )}

      {/* Dos avisos, no uno: antes cualquier parpadeo de la conexión daba la
          partida por muerta sin margen para volver. Ahora primero se reintenta
          durante un minuto y solo después se ofrece la salida. */}
      {link === 'reconnecting' && (
        <div className={styles.resultBackdrop}>
          <section className={styles.result} role="status">
            <small>Multijugador</small>
            <h2>Reconectando…</h2>
            <p>Se ha perdido el contacto con tu rival. La partida sigue guardada: si vuelve en menos de un minuto, continuaréis donde lo dejasteis.</p>
            <div className={styles.resultActions}>
              <button onClick={() => leaveToHome('/')}>Volver al inicio</button>
            </div>
          </section>
        </div>
      )}

      {peerLeft && (
        <div className={styles.resultBackdrop}>
          <section className={styles.result}>
            <small>Multijugador</small>
            <h2>Tu rival se ha desconectado</h2>
            <p>Ha pasado más de un minuto sin señal suya. La partida no se puede continuar sin él.</p>
            <div className={styles.resultActions}>
              <button onClick={() => leaveToHome('/')}>Volver al inicio</button>
            </div>
          </section>
        </div>
      )}

      {!room && tutorialActive && player.mulliganTaken && !match.winner && (
        <GuidedTutorial
          match={match}
          handBarRef={handBarRef}
          endTurnRef={endTurnRef}
          onFinish={() => setTutorialActive(false)}
          suspended={photoMode || Boolean(match.pendingSpark) || Boolean(match.pendingDecisions?.length)}
        />
      )}

      {match.pendingSpark?.owner === ME && <SparkDialog key={match.pendingSpark.cardInstanceId} match={match} onChoose={doAction} />}
      {match.pendingDecisions?.[0]?.owner === ME && !scryOpen && <TacticalDialog key={`${match.pendingDecisions[0].id}-${match.pendingDecisions[0].remaining}`} match={match} onChoose={doAction} />}
      {canTakeMulligan(match, ME) && !match.pendingSpark && !match.pendingDecisions?.length && !match.winner && !howToOpen && (
        <MulliganDialog
          ownCommander={commander}
          rivalCommander={rivalCommander}
          scenario={scenario}
          reducedMotion={preferences.reducedMotion}
          hand={player.hand}
          selectedIds={mulliganIds}
          onToggle={(instanceId) => setMulliganIds((current) =>
            current.includes(instanceId) ? current.filter((id) => id !== instanceId) : [...current, instanceId],
          )}
          onConfirm={confirmMulligan}
        />
      )}

      {finishing && COMMANDER_BY_ID[match.players[ME].commanderId] && (
        <FinishingBlow
          commander={COMMANDER_BY_ID[match.players[ME].commanderId]!}
          attackerName={CARD_BY_ID[match.board.find((piece) => piece.instanceId === finishing)?.cardId ?? '']?.name ?? 'Tu unidad'}
          onDone={launchFinisher}
        />
      )}
      {/* Cara a cara al empezar: una vez por partida, antes del mulligan. */}
      {match.turn <= 1 && introSeed !== match.seed && !photoMode && COMMANDER_BY_ID[match.players[ME].commanderId] && COMMANDER_BY_ID[match.players[ME === 'player' ? 'ai' : 'player'].commanderId] && (
        <BattleIntro
          own={COMMANDER_BY_ID[match.players[ME].commanderId]!}
          ownTitle={profile.title.label}
          rival={COMMANDER_BY_ID[match.players[ME === 'player' ? 'ai' : 'player'].commanderId]!}
          onDone={finishIntro}
        />
      )}
      {inspected && <CardInspector card={inspected} statusEffects={inspectionStatuses(inspectedPiece)} combatStats={inspectedStats} cost={inspectedCost} costExplanation={inspectedCostExplanation} onClose={closeInspection} />}

      {match.winner && !queueBusy && !isAdventureMatch && (
        <MatchResultDialog
          match={match}
          me={ME}
          reducedMotion={preferences.reducedMotion}
          stats={player.stats}
          elapsedSeconds={store.elapsedSeconds}
          tally={tally}
          daily={daily}
          achievements={recorder.achievements}
          healthHistory={store.healthHistory}
          bestPlay={store.bestPlay}
          isPvp={Boolean(room)}
          isTower={isTowerMatch}
          onTower={() => { store.reset(); navigate('/tower') }}
          rematchSelf={rematchSelf}
          rematchPeer={rematchPeer}
          onRematch={requestRematch}
          onRepeat={repeat}
          onReplay={store.lastPlay ? () => store.replayLastPlay() : undefined}
          onHome={() => leaveToHome('/')}
          onDownloadLog={() => downloadMatchLog({
            match,
            me: ME,
            rival: RIVAL,
            preferences,
            isPvp: Boolean(room),
            dailyChallengeId: daily.done ? daily.id : undefined,
            elapsedSeconds: store.elapsedSeconds,
            log: store.matchLog,
          })}
        />
      )}

      {import.meta.env.DEV && devOpen && !room && (
        <DevPanel
          match={match}
          faction={commander?.faction ?? 'fury'}
          onApply={devApply}
          onForceEndTurn={() => doAction({ type: 'end-turn', playerId: match.activePlayer })}
          onRestart={repeat}
        />
      )}
    </div>
  )
}
