import { PACE_LABELS, PRESENTATION_PACES, type PresentationPace } from '../battle/presentation'
import { SCENARIO_OPTIONS } from '../battle/scenarioCatalog'
import { playSynthCue, resumeAudio } from '../services/audio'
import { usePreferences, type AiDifficulty, type GraphicsQuality, type ScenarioId } from '../store/preferences'
import styles from './SettingsPage.module.css'

const DIFFICULTY_OPTIONS: readonly { value: AiDifficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Fácil', hint: 'El rival pelea en el tablero pero no remata tu Nexo. Ideal para aprender.' },
  { value: 'normal', label: 'Normal', hint: 'Ataca en cuanto tiene algo a tiro, ficha por ficha. Directo y previsible.' },
  { value: 'hard', label: 'Difícil', hint: 'Estudia el tablero entero antes de mover y escoge el cambio que más le conviene.' },
]


const QUALITY_OPTIONS: readonly { value: GraphicsQuality; label: string; hint: string }[] = [
  { value: 'low', label: 'Bajo', hint: 'Sin sombras ni partículas; máxima fluidez.' },
  { value: 'medium', label: 'Medio', hint: 'Equilibrio recomendado para equipos de gama media.' },
  { value: 'high', label: 'Alto', hint: 'Sombras, partículas y resolución completas.' },
]

const SPEED_OPTIONS = [
  { value: 1, label: 'Normal' },
  { value: 1.5, label: 'Rápida' },
  { value: 2, label: 'Muy rápida' },
] as const

const TEXT_SCALE_OPTIONS = [
  { value: 1, label: 'Normal' },
  { value: 1.2, label: 'Grande' },
  { value: 1.4, label: 'Muy grande' },
] as const

export function SettingsPage() {
  const settings = usePreferences()
  const volumes = [
    ['masterVolume', 'Volumen general'],
    ['musicVolume', 'Música'],
    ['effectsVolume', 'Efectos'],
  ] as const

  return (
    <div className={styles.page}>
      <header className={styles.header}><small>Preferencias locales</small><h1>Ajustes</h1><p>Los cambios se guardan automáticamente en este dispositivo.</p></header>
      <div className={styles.panel}>
        <section className={styles.section}>
          <h2>Sonido</h2><p>Todo el audio se sintetiza en el momento: los efectos de combate y el ambiente del lugar donde peleas —viento y campanillas en la Ciudadela, goteo en el Santuario, brasas en la Caldera—. «Música» controla solo ese fondo; a cero, silencio.</p>
          {volumes.map(([key, label]) => (
            <div className={styles.control} key={key}>
              <label htmlFor={key}>{label}</label>
              <input id={key} type="range" min="0" max="1" step="0.05" value={settings[key]} onChange={(event) => settings.setVolume(key, Number(event.target.value))} />
              <output>{Math.round(settings[key] * 100)}%</output>
            </div>
          ))}
          <div className={styles.control}>
            <label htmlFor="sound-test">Probar la mezcla</label>
            <button id="sound-test" type="button" className={styles.select} onClick={() => { resumeAudio(); playSynthCue('impact') }}>
              Reproducir un golpe
            </button>
            <output>Comprueba el nivel sin entrar en una partida.</output>
          </div>
          <div className={styles.toggleRow}><span><strong>Silenciar todo</strong><small>Conserva tus niveles de mezcla.</small></span><button className={styles.toggle} data-on={settings.muted} onClick={() => settings.setMuted(!settings.muted)} aria-label="Silenciar todo" aria-pressed={settings.muted} /></div>
        </section>
        <section className={styles.section}>
          <h2>Gráficos</h2><p>El campo de batalla se adapta a tu equipo sin perder legibilidad.</p>
          <div className={styles.control}>
            <label htmlFor="scenario">Escenario de batalla</label>
            <select
              id="scenario"
              className={styles.select}
              value={settings.scenario}
              onChange={(event) => settings.setScenario(event.target.value as ScenarioId)}
            >
              {SCENARIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <output>{SCENARIO_OPTIONS.find((option) => option.value === settings.scenario)?.hint}</output>
          </div>
          <div className={styles.control}>
            <label htmlFor="quality">Calidad visual</label>
            <select
              id="quality"
              className={styles.select}
              value={settings.graphicsQuality}
              onChange={(event) => settings.setGraphicsQuality(event.target.value as GraphicsQuality)}
            >
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <output>{QUALITY_OPTIONS.find((option) => option.value === settings.graphicsQuality)?.hint}</output>
          </div>
          <div className={styles.control}>
            <label htmlFor="animationSpeed">Velocidad de animaciones</label>
            <select
              id="animationSpeed"
              className={styles.select}
              value={settings.animationSpeed}
              onChange={(event) => settings.setAnimationSpeed(Number(event.target.value) as 1 | 1.5 | 2)}
            >
              {SPEED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <output>×{settings.animationSpeed}</output>
          </div>
          <div className={styles.control}>
            <label htmlFor="presentationPace">Ritmo de la partida</label>
            <select
              id="presentationPace"
              className={styles.select}
              value={settings.presentationPace}
              onChange={(event) => settings.setPresentationPace(event.target.value as PresentationPace)}
            >
              {PRESENTATION_PACES.map((pace) => (
                <option key={pace} value={pace}>{PACE_LABELS[pace].name}</option>
              ))}
            </select>
            <output>{PACE_LABELS[settings.presentationPace].hint}</output>
          </div>
        </section>
        <section className={styles.section}>
          <h2>Accesibilidad y ritmo</h2><p>Ajusta la presentación sin alterar las reglas.</p>
          <label className={styles.toggleRow}><span><strong>Aviso de Nexo en peligro</strong><small>Elige la intensidad del aviso cuando queda poca Vida.</small></span><select className={styles.select} value={settings.nexusWarning} onChange={(event) => settings.setNexusWarning(event.target.value as 'off' | 'subtle' | 'pulse')}><option value="off">Desactivado</option><option value="subtle">Sutil y fijo</option><option value="pulse">Pulso suave</option></select></label>
          <div className={styles.toggleRow}><span><strong>Reducir movimiento</strong><small>Acorta transiciones, golpes de cámara y partículas.</small></span><button className={styles.toggle} data-on={settings.reducedMotion} onClick={() => settings.setReducedMotion(!settings.reducedMotion)} aria-label="Reducir movimiento" aria-pressed={settings.reducedMotion} /></div>
          <div className={styles.toggleRow}><span><strong>Modo daltonismo</strong><small>Cambia el verde de "casilla de despliegue" por ámbar, para no confundirlo con el rojo de "casilla amenazada".</small></span><button className={styles.toggle} data-on={settings.colorblindMode} onClick={() => settings.setColorblindMode(!settings.colorblindMode)} aria-label="Modo daltonismo" aria-pressed={settings.colorblindMode} /></div>
          <div className={styles.toggleRow}><span><strong>Avisar al ceder el turno</strong><small>Si te quedan unidades sin actuar, cartas jugables o la fuente de Esencia del turno sin jugar, la primera pulsación avisa y la segunda cede igualmente.</small></span><button className={styles.toggle} data-on={settings.confirmEndTurn} onClick={() => settings.setConfirmEndTurn(!settings.confirmEndTurn)} aria-label="Avisar al ceder el turno" aria-pressed={settings.confirmEndTurn} /></div>
          <div className={styles.control}>
            <label htmlFor="boardTextScale">Tamaño del texto en el tablero</label>
            <select
              id="boardTextScale"
              className={styles.select}
              value={settings.boardTextScale}
              onChange={(event) => settings.setBoardTextScale(Number(event.target.value) as 1 | 1.2 | 1.4)}
            >
              {TEXT_SCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <output>Nombre, Ataque y Vida sobre las cartas del tablero.</output>
          </div>
          <div className={styles.control}>
            <label htmlFor="aiDifficulty">Dificultad del rival</label>
            <select
              id="aiDifficulty"
              className={styles.select}
              value={settings.aiDifficulty}
              onChange={(event) => settings.setAiDifficulty(event.target.value as AiDifficulty)}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <output>{DIFFICULTY_OPTIONS.find((option) => option.value === settings.aiDifficulty)?.hint}</output>
          </div>
          <div className={styles.control}>
            <label htmlFor="aiDelay">Pausa de la IA</label>
            <input id="aiDelay" type="range" min="150" max="1200" step="50" value={settings.aiDelayMs} onChange={(event) => settings.setAiDelay(Number(event.target.value))} />
            <output>{settings.aiDelayMs}ms</output>
          </div>
          <button className={styles.reset} onClick={settings.reset}>Restaurar valores</button>
        </section>
      </div>
    </div>
  )
}
