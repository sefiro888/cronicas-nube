import { useEffect } from 'react'
import { currentMusicTheme, resumeAudio, setAudioMix, setBattleTension, startAmbientMusic, stopAmbientMusic, stopBattleTension, type MusicTheme } from './audio'
import { usePreferences } from '../store/preferences'

/**
 * Mantiene los buses del motor de audio sincronizados con los deslizadores de
 * Ajustes. Se monta una sola vez (AppShell) porque el motor es un singleton:
 * mover «Volumen general» a mitad de partida cambia el nivel al instante, sin
 * cortar ni la música ni el efecto que esté sonando.
 *
 * También engancha el primer gesto del usuario para despertar el AudioContext:
 * los navegadores lo arrancan suspendido y, sin esto, el primer sonido de la
 * sesión se perdería en silencio.
 */
export const useAudioMix = (): void => {
  const masterVolume = usePreferences((state) => state.masterVolume)
  const musicVolume = usePreferences((state) => state.musicVolume)
  const effectsVolume = usePreferences((state) => state.effectsVolume)
  const muted = usePreferences((state) => state.muted)

  useEffect(() => {
    setAudioMix({ master: masterVolume, music: musicVolume, effects: effectsVolume, muted })
  }, [masterVolume, musicVolume, effectsVolume, muted])

  useEffect(() => {
    const wake = () => resumeAudio()
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])
}

/**
 * Capa ambiental de la batalla: arranca el tema del escenario activo, lo
 * silencia si el usuario baja la música a cero y lo corta al salir de la
 * pantalla o al ocultar la pestaña (nada peor que una música que sigue sonando
 * desde una pestaña de fondo).
 */
export const useSoundtrack = (theme: MusicTheme, enabled: boolean): void => {
  const musicVolume = usePreferences((state) => state.musicVolume)
  const masterVolume = usePreferences((state) => state.masterVolume)
  const muted = usePreferences((state) => state.muted)
  const audible = enabled && !muted && musicVolume > 0 && masterVolume > 0

  useEffect(() => {
    // Solo se apaga la música PROPIA: al entrar en batalla conviven un instante
    // dos usos de este hook (el de menús apagándose y el del escenario
    // arrancando), y los efectos de los hijos corren antes que los del padre,
    // así que un `stop` incondicional del padre mataría la música recién puesta.
    const stopMine = () => {
      if (currentMusicTheme() === theme) stopAmbientMusic()
    }
    if (!audible) {
      stopMine()
      return undefined
    }
    startAmbientMusic(theme)
    const onVisibility = () => {
      if (document.hidden) stopMine()
      else startAmbientMusic(theme)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stopMine()
    }
  }, [theme, audible])
}

/**
 * Sube o baja la capa de tensión de la música (ver setBattleTension) según la
 * tensión de la partida. Se apaga al salir de la batalla o al silenciar.
 */
export const useBattleTension = (level: number, enabled: boolean): void => {
  const musicVolume = usePreferences((state) => state.musicVolume)
  const muted = usePreferences((state) => state.muted)
  const audible = enabled && !muted && musicVolume > 0
  useEffect(() => {
    if (!audible) {
      stopBattleTension()
      return undefined
    }
    setBattleTension(level)
    return undefined
  }, [level, audible])
  useEffect(() => () => stopBattleTension(), [])
}
