import { useCollection } from '../store/collection'
import { PROFILE_FRAMES, PROFILE_TITLES, achievementName, unlockedFrames, unlockedTitles } from '../store/profile'
import { withBase } from '../utils/assets'
import { FramedPortrait, StreakEmblem } from './ProfileBadges'
import { useProfile } from './useProfile'
import styles from './ProfileShowcase.module.css'

/**
 * Tu perfil: el comandante de tu mazo con el marco elegido, tu título y tu
 * racha. Debajo, todos los títulos y marcos; los bloqueados dicen qué logro
 * los desbloquea.
 */
export function ProfileShowcase() {
  const { commander, title, frame, streak, achievements } = useProfile()
  const setTitle = useCollection((state) => state.setTitle)
  const setFrame = useCollection((state) => state.setFrame)
  const titles = new Set(unlockedTitles(achievements).map((entry) => entry.id))
  const frames = new Set(unlockedFrames(achievements).map((entry) => entry.id))
  return (
    <section className={styles.profile} aria-label="Tu perfil">
      <div className={styles.identity}>
        <FramedPortrait src={commander ? withBase(commander.art.webp) : undefined} frameId={frame.id} size={92} />
        <div>
          <small>Tu perfil</small>
          <strong>{commander?.name ?? 'Comandante'}</strong>
          <span className={styles.title}>{title.label}</span>
          <StreakEmblem streak={streak} />
        </div>
      </div>
      <div className={styles.pickers}>
        <div>
          <h2>Títulos <small>{titles.size}/{PROFILE_TITLES.length}</small></h2>
          <ul className={styles.titles}>
            {PROFILE_TITLES.map((entry) => {
              const unlocked = titles.has(entry.id)
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    data-active={entry.id === title.id || undefined}
                    onClick={() => setTitle(entry.id)}
                    title={unlocked ? entry.label : `Se desbloquea con el logro «${achievementName(entry.achievementId, achievements)}»`}
                  >
                    {unlocked ? entry.label : `🔒 ${entry.label}`}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          <h2>Marcos <small>{frames.size}/{PROFILE_FRAMES.length}</small></h2>
          <ul className={styles.frames}>
            {PROFILE_FRAMES.map((entry) => {
              const unlocked = frames.has(entry.id)
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    data-active={entry.id === frame.id || undefined}
                    onClick={() => setFrame(entry.id)}
                    title={unlocked ? entry.label : `Se desbloquea con el logro «${achievementName(entry.achievementId, achievements)}»`}
                    aria-label={`Marco ${entry.label}${unlocked ? '' : ', bloqueado'}`}
                  >
                    <FramedPortrait src={commander ? withBase(commander.art.webp) : undefined} frameId={entry.id} size={46} />
                    <span>{unlocked ? entry.label : '🔒'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
