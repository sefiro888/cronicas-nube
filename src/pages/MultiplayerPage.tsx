import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMMANDERS, FACTION_BY_ID, STARTER_DECKS, commanderForDeck } from '../game'
import { createRoom, joinRoom, type Room, type RoomStatus } from '../multiplayer/room'
import { saveTicket } from '../multiplayer/ticket'
import { useMatchStore } from '../store/match'
import { useNetworkStore } from '../store/network'
import { usePreferences } from '../store/preferences'
import { SCENARIO_ATLAS } from '../battle/scenarioEnvironments'
import { resolveScenario } from '../battle/scenarioForFaction'
import { withBase } from '../utils/assets'
import { FactionSigil } from '../components/FactionSigil'
import styles from './MultiplayerPage.module.css'

type Mode = 'idle' | 'hosting' | 'joining'

export function MultiplayerPage() {
  const navigate = useNavigate()
  const preferences = usePreferences()
  const scenario = resolveScenario(preferences.scenario, STARTER_DECKS.find((deck) => deck.id === preferences.selectedDeckId)?.faction)
  const sharedScenario = useNetworkStore((state) => state.scenario)
  const [mode, setMode] = useState<Mode>('idle')
  const [room, setRoom] = useState<Room>()
  const [status, setStatus] = useState<RoomStatus>('waiting')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string>()
  const [copied, setCopied] = useState(false)
  const roomRef = useRef<Room>(undefined)

  useEffect(() => () => roomRef.current?.leave(), [])

  const attach = useCallback((next: Room) => {
    roomRef.current?.leave()
    roomRef.current = next
    setRoom(next)
    setStatus(next.getStatus())
    next.onStatusChange(setStatus)
  }, [])

  useEffect(() => {
    if (!room) return
    const announce = () => room.send('arena', { scenario })
    const offArena = room.onMessage('arena', (payload) => {
      if (room.role !== 'guest') return
      const value = (payload as { scenario?: string })?.scenario
      const scene = SCENARIO_ATLAS.find((entry) => entry.id === value)
      if (scene) useNetworkStore.getState().setScenario(scene.id)
    })
    const offReady = room.onMessage('arena-ready', () => { if (room.role === 'host') announce() })
    const offStatus = room.onStatusChange((status) => {
      if (status === 'connected') {
        if (room.role === 'host') announce()
        else room.send('arena-ready', {})
      }
    })
    if (room.role === 'host') announce()
    else room.send('arena-ready', {})
    return () => { offArena(); offReady(); offStatus() }
  }, [room, scenario])

  const handleCreate = () => {
    setError(undefined)
    useNetworkStore.getState().setScenario(scenario)
    setMode('hosting')
    attach(createRoom())
  }

  const handleJoin = () => {
    const code = joinCode.trim()
    if (code.length < 4) {
      setError('El código de sala tiene al menos 4 caracteres.')
      return
    }
    setError(undefined)
    setMode('joining')
    attach(joinRoom(code))
  }

  const handleLeave = () => {
    roomRef.current?.leave()
    roomRef.current = undefined
    setRoom(undefined)
    setMode('idle')
    setJoinCode('')
    setError(undefined)
  }

  const enterBattle = () => {
    if (!room) return
    // Sin este reset, una partida en solitario que quedara persistida de una
    // sesión anterior parecería ya en marcha (con su propio mulligan resuelto)
    // en vez de esperar a la partida en red recién sembrada por el anfitrión.
    useMatchStore.getState().reset()
    // Billete de vuelta: si la pestaña se recarga en mitad de la batalla,
    // BattlePage sabrá a qué sala y con qué papel tiene que reengancharse.
    saveTicket({ code: room.code, role: room.role })
    if (room.role === 'host') useNetworkStore.getState().setScenario(scenario)
    useNetworkStore.getState().setRoom(room, room.role)
    // La sala ya no es responsabilidad de esta pantalla: BattlePage se encarga
    // de salir de ella cuando la partida termine o se abandone.
    roomRef.current = undefined
    navigate('/battle')
  }

  const copyCode = async () => {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('No se pudo copiar. Copia el código a mano.')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <small>Multijugador · en pruebas</small>
        <h1>Juega contra un amigo</h1>
        <p>Crea una sala y comparte el código, o entra con el código que te han pasado.</p>
      </header>

      <section className={styles.deckPicker} aria-label="Elige tu mazo para esta escaramuza">
        <span className={styles.deckPickerLabel}>Tu mazo para esta partida</span>
        <div className={styles.deckOptions}>
          {STARTER_DECKS.map((deck) => {
            // El líder ELEGIDO, no el de la baraja: cada facción tiene dos y
            // es con el elegido con quien se juega también aquí.
            const commander = commanderForDeck(deck, preferences.commanderByDeck[deck.id])
            const selected = deck.id === preferences.selectedDeckId
            return (
              <button
                key={deck.id}
                className={`${styles.deckOption} ${styles.factionCard} ${styles[deck.faction]}`}
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => preferences.setSelectedDeck(deck.id)}
                title={deck.name}
                disabled={mode !== 'idle'}
              >
                {commander && <img src={withBase(commander.art.webp ?? commander.art.fallback)} alt="" loading="lazy" />}
                <span className={styles.factionTitle}><FactionSigil faction={deck.faction} size="small" decorative />{FACTION_BY_ID[deck.faction].name}</span>
                <strong>{commander?.name ?? deck.name}</strong>
                <span className={styles.factionDescription}>{FACTION_BY_ID[deck.faction].description}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Elegir líder también aquí: en multijugador se juega con el comandante
          elegido, y sin este control habría que salir a «Jugar» para cambiarlo. */}
      {mode === 'idle' && (() => {
        const deck = STARTER_DECKS.find((candidate) => candidate.id === preferences.selectedDeckId)
        if (!deck) return null
        const leaders = COMMANDERS.filter((option) => option.faction === deck.faction)
        const chosen = commanderForDeck(deck, preferences.commanderByDeck[deck.id])
        return (
          <section className={styles.leaderPicker} aria-label={`Comandante de ${deck.name}`}>
            <span className={styles.deckPickerLabel}>Al mando</span>
            <div className={styles.deckOptions}>
              {leaders.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.deckOption}
                  data-selected={option.id === chosen.id}
                  aria-pressed={option.id === chosen.id}
                  onClick={() => preferences.setCommander(deck.id, option.id)}
                  title={option.rules}
                >
                  {option.name}
                </button>
              ))}
            </div>
            <small className={styles.leaderRules}>{chosen.rules}</small>
            <p className={styles.leaderRules}><strong>{chosen.power.name}</strong> · {chosen.power.description}</p>
          </section>
        )
      })()}

      {mode !== 'joining' && <section className={styles.arenaPicker} aria-label="Escenario de la sala">
        <h2>Elige el campo de batalla</h2>
        <p>El anfitrión elige el escenario compartido por los dos jugadores.</p>
        <div className={styles.arenaGrid}>{SCENARIO_ATLAS.map((scene) => <button type="button" key={scene.id} aria-pressed={scenario === scene.id}
          onClick={() => { preferences.setScenario(scene.id); useNetworkStore.getState().setScenario(scene.id) }}>
          <img src={withBase(scene.panorama)} alt="" loading="lazy" /><strong>{scene.name}</strong><span>{scene.setting}</span>
        </button>)}</div>
      </section>}
      {mode === 'joining' && <p className={styles.note}>Campo elegido por el anfitrión · {SCENARIO_ATLAS.find((scene) => scene.id === sharedScenario)?.name ?? 'Esperando selección…'}</p>}

      {mode === 'idle' && (
        <div className={styles.choices}>
          <button className={styles.choice} onClick={handleCreate}>
            <strong>Crear sala</strong>
            <span>Genera un código nuevo y espera a que tu rival se una.</span>
          </button>
          <div className={styles.choice}>
            <strong>Unirse a sala</strong>
            <span>Introduce el código que te ha compartido tu rival.</span>
            <div className={styles.joinRow}>
              <input
                className={styles.codeInput}
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                maxLength={8}
                aria-label="Código de sala"
              />
              <button className={styles.joinButton} onClick={handleJoin}>Unirse</button>
            </div>
          </div>
        </div>
      )}

      {mode !== 'idle' && room && (
        <div className={styles.lobby}>
          <div className={styles.codeDisplay}>
            <small>Código de la sala</small>
            <div className={styles.codeRow}>
              <strong>{room.code}</strong>
              {mode === 'hosting' && (
                <button className={styles.copyButton} onClick={copyCode}>{copied ? '¡Copiado!' : 'Copiar'}</button>
              )}
            </div>
          </div>
          <div className={styles.status} data-connected={status === 'connected'} data-failed={status === 'error'}>
            {status === 'connected'
              ? '● Rival conectado'
              : status === 'error'
                ? '⚠ Sin conexión con el servidor de partidas'
                : '○ Esperando al rival…'}
          </div>
          {/* Un fallo del servidor se parecía exactamente a «el otro aún no ha
              entrado»: los dos jugadores esperaban indefinidamente sin saber
              que el problema no era el rival. */}
          {status === 'error' && (
            <div className={styles.connectionError} role="alert">
              <strong>No se ha podido conectar con el servidor de partidas.</strong>
              <span>{room.getError()}</span>
              <span>
                El multijugador usa un proyecto de Supabase en la nube. Si está pausado o
                borrado —los proyectos gratuitos se pausan solos por inactividad— hay que crear
                otro y apuntar el juego a él con <code>VITE_SUPABASE_URL</code> y{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>. Mientras tanto, las escaramuzas contra la IA
                funcionan con normalidad.
              </span>
            </div>
          )}
          {status === 'connected' && (
            <>
              <p className={styles.note}>Jugarás con el mazo elegido arriba. Los dos bandos compartirán el escenario elegido por el anfitrión.</p>
              <button className={styles.joinButton} onClick={enterBattle}>Entrar a la batalla</button>
            </>
          )}
          <button className={styles.leaveButton} onClick={handleLeave}>Salir de la sala</button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
