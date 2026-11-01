import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { CARD_BY_ID, FACTION_BY_ID, PLAYABLE_FACTIONS, STARTER_DECKS } from '../game'
import { FactionSigil } from '../components/FactionSigil'
import { WorldAtmosphere } from '../components/WorldAtmosphere'
import { evaluateAchievements } from '../store/achievements'
import { evaluateDailyChallenge } from '../store/dailyChallenge'
import { useMatchStore } from '../store/match'
import { usePreferences } from '../store/preferences'
import { useRecords } from '../store/records'
import { TOWER_FLOORS } from '../store/tower'
import { withBase } from '../utils/assets'
import { gameFacts, resumableMatch, summarizeForHome } from './home/homeSummary'
import { WORLD_CHAPTERS, WORLD_CREATURES } from './home/worldAtlas'
import styles from './HomePage.module.css'

function SceneImage({ name, eager = false, className }: { name: string; eager?: boolean; className: string | undefined }) {
  return <img className={className} src={withBase(`/assets/interface/${name}.webp`)}
    srcSet={`${withBase(`/assets/interface/${name}-small.webp`)} 800w, ${withBase(`/assets/interface/${name}.webp`)} 1680w`}
    sizes="(max-width: 720px) 1400px, 100vw" alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
}

export function HomePage() {
  const records = useRecords((state) => state.records)
  const match = useMatchStore((state) => state.match)
  const setSelectedDeck = usePreferences((state) => state.setSelectedDeck)
  const resume = useMemo(() => resumableMatch(match), [match])
  const me = useMemo(() => summarizeForHome(records), [records])
  const daily = useMemo(() => evaluateDailyChallenge(records), [records])
  const achievements = useMemo(() => evaluateAchievements(records), [records])
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length
  const facts = useMemo(() => gameFacts(), [])

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <SceneImage name="nexo-convergencia-v1" eager className={styles.heroArt} />
        <div className={styles.heroShade} aria-hidden="true" />
        <WorldAtmosphere />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}><span aria-hidden="true">✦</span> Un mundo. {PLAYABLE_FACTIONS.length} destinos.</span>
          <h1 id="home-title" className={styles.title} aria-label="CRÓNICAS DEL NEXO">CRÓNICAS <span>DEL NEXO</span></h1>
          <p className={styles.lead}>Los mundos convergen.<br />Tu voluntad decide qué permanece.</p>
          <p className={styles.heroDescription}>Canaliza la Esencia, despliega tus cartas sobre un tablero vivo y quiebra el Nexo de tu rival.</p>
          <div className={styles.buttons}>
            {resume && <Link className={styles.primary} to="/battle">Continuar partida <span aria-hidden="true">↗</span></Link>}
            <Link className={resume ? styles.secondary : styles.primary} to="/play">{resume ? 'Nueva escaramuza' : 'Iniciar partida'} <span aria-hidden="true">↗</span></Link>
            <Link className={styles.secondary} to="/gallery">Explorar cartas</Link>
          </div>
          {resume && <p className={styles.resume}>Turno {resume.turn} contra {resume.rivalCommanderName} · tu Nexo {resume.myNexus} — el suyo {resume.rivalNexus}{resume.myTurn ? ' · te toca mover' : ' · mueve el rival'}</p>}
        </div>
        <a className={styles.scrollHint} href="#territorios"><span aria-hidden="true">↓</span> Explora los territorios</a>
        <div className={styles.heroCaption} aria-hidden="true"><span>EL NEXO</span>Todos los caminos se encuentran aquí.</div>
      </section>

      <div className={styles.featureStrip} aria-label="Características del prototipo">
        <div><strong>{facts.board}</strong><span>El campo de batalla</span></div>
        <div><strong>{facts.cards}</strong><span>Cartas originales</span></div>
        <div><strong>{PLAYABLE_FACTIONS.length}</strong><span>Facciones sin límites</span></div>
        <div><strong>{facts.cardsPerDeck}</strong><span>Cartas en tu mazo</span></div>
      </div>

      {me.hasHistory && (
        <section className={styles.you} aria-label="Tu progreso">
          <div className={styles.youStats}>
            <span><strong>{me.played}</strong><small>Escaramuzas</small></span>
            <span><strong>{me.won}</strong><small>Victorias</small></span>
            <span><strong>{me.winRate}%</strong><small>Acierto</small></span>
            <span data-streak={me.streak > 0 ? 'win' : me.streak < 0 ? 'loss' : undefined}><strong>{me.streak === 0 ? '—' : `${me.streak > 0 ? '+' : ''}${me.streak}`}</strong><small>{me.streak >= 0 ? 'Racha' : 'Racha adversa'}</small></span>
            <span><strong>{unlocked}/{achievements.length}</strong><small>Logros</small></span>
          </div>
          <div className={styles.youAside}>
            <div className={styles.dailyCard} data-done={daily.done}><small>Reto de hoy{daily.done ? ' · completado' : ''}</small><strong>{daily.title}</strong><span>{daily.description}</span></div>
            {me.lastDeckName && <p className={styles.lastDeck}>Última partida con <strong>{me.lastDeckName}</strong></p>}
          </div>
        </section>
      )}

      <section id="territorios" className={styles.atlas} aria-labelledby="atlas-title">
        <header className={styles.sectionHeader}>
          <div><span className={styles.eyebrow}>El atlas del Nexo</span><h2 id="atlas-title">Elige a quién perteneces.</h2></div>
          <p>{PLAYABLE_FACTIONS.length} facciones. Todas abiertas desde el primer día.<br />Cada una, otra forma de conquistar el tablero.</p>
        </header>
        {WORLD_CHAPTERS.map((chapter, index) => (
          <section key={chapter.id} id={`territorio-${chapter.id}`} className={styles.realm} style={{ '--realm-color': chapter.color } as CSSProperties} aria-labelledby={`chapter-${chapter.id}`}>
            <SceneImage name={chapter.image} className={styles.realmArt} />
            <div className={styles.realmShade} aria-hidden="true" />
            <div className={styles.realmIntro}>
              <span className={styles.chapterNumber} aria-hidden="true">0{index + 1}</span>
              <span className={styles.eyebrow}>{chapter.label}</span>
              <h3 id={`chapter-${chapter.id}`}>{chapter.title}</h3><p>{chapter.description}</p>
            </div>
            <ul className={styles.factions} style={{ '--faction-count': chapter.factions.length } as CSSProperties}>
              {chapter.factions.map((id) => {
                const faction = FACTION_BY_ID[id]
                const creature = CARD_BY_ID[WORLD_CREATURES[id]]
                const deck = STARTER_DECKS.find((candidate) => candidate.faction === id)
                return <li key={id}>
                  <Link className={styles.faction} data-faction={id} to="/play" onClick={() => { if (deck) setSelectedDeck(deck.id) }} aria-label={`Elegir ${faction.name}`}>
                    <img src={withBase(creature?.art.webp ?? '')} alt="" loading="lazy" decoding="async" />
                    <span className={styles.factionText}><FactionSigil faction={id} size="small" decorative /><strong>{faction.name}</strong><span className={styles.factionArrow} aria-hidden="true">↗</span><small>{faction.themes.join(' · ')}</small></span>
                  </Link>
                </li>
              })}
            </ul>
          </section>
        ))}
      </section>

      <section className={styles.towerCallout} aria-labelledby="tower-callout-title">
        <SceneImage name="torre-asedio-v1" className={styles.towerArt} />
        <div className={styles.calloutShade} aria-hidden="true" />
        <WorldAtmosphere tower />
        <div className={styles.calloutContent}><span className={styles.eyebrow}>El desafío de los conquistadores</span><h2 id="tower-callout-title">Una cima.<br />{TOWER_FLOORS} razones para caer.</h2><p>Tu Nexo conserva las heridas. Tus decisiones, las consecuencias. Asciende hasta enfrentarte a ti mismo.</p><Link className={styles.primary} to="/tower">Descubrir la Torre <span aria-hidden="true">↗</span></Link></div>
        <span className={styles.calloutSeal} aria-hidden="true">{TOWER_FLOORS}<span>LA ASCENSIÓN</span></span>
      </section>
      <div className={styles.closing}><span aria-hidden="true">✦</span><p>La próxima crónica empieza con una decisión.</p><Link className={styles.secondary} to="/play">Elige tu comandante <span aria-hidden="true">→</span></Link></div>
    </div>
  )
}
