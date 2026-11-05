import type { ThreeElements } from '@react-three/fiber'
import { MOOD_LIGHT, useScenarioLight } from '../../store/scenarioMood'

/** Se conservan los valores nativos por escenario: las variantes los modulan,
 * sin sumar otra clave que lave las texturas o cambie el estado de las casillas. */
export function ScenarioAmbientLight(props: ThreeElements['ambientLight']) {
  const light = useScenarioLight()
  return <ambientLight {...props} intensity={light.ambient(props.intensity ?? 1)} />
}
export function ScenarioHemisphereLight(props: ThreeElements['hemisphereLight']) {
  const light = useScenarioLight()
  const tint = MOOD_LIGHT[light.mood].fillColor
  return <hemisphereLight {...props} intensity={light.fill(props.intensity ?? 1)} color={tint ?? props.color} />
}
export function ScenarioDirectionalLight(props: ThreeElements['directionalLight']) {
  const light = useScenarioLight()
  const key = props.castShadow !== undefined
  const profile = MOOD_LIGHT[light.mood]
  return <directionalLight {...props} intensity={key ? light.key(props.intensity ?? 1) : light.fill(props.intensity ?? 1)} color={(key ? profile.keyColor : profile.fillColor) ?? props.color} />
}
