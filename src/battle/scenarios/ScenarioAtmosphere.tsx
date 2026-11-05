import type { ScenarioId } from '../../store/preferences'

interface Atmosphere {
  readonly background: string
  readonly fog: readonly [string, number, number]
}

const ATMOSPHERE: Readonly<Record<Exclude<ScenarioId, 'auto'>, Atmosphere>> = {
  'aether-citadel': { background: '#7c8da8', fog: ['#90a1b5', 16, 48] },
  caldera: { background: '#20242d', fog: ['#35343c', 18, 49] },
  sanctuary: { background: '#121e28', fog: ['#253742', 20, 52] },
  duna: { background: '#d8c5a8', fog: ['#d4bd97', 22, 60] },
  fimbul: { background: '#17232e', fog: ['#263b4a', 21, 57] },
  grove: { background: '#20291d', fog: ['#46513e', 20, 52] },
  shore: { background: '#34464f', fog: ['#7b9094', 22, 65] },
  foundry: { background: '#25292c', fog: ['#4d5151', 20, 55] },
  'jade-court': { background: '#647b87', fog: ['#8dabad', 22, 60] },
  'wheel-ghat': { background: '#344966', fog: ['#6e87a3', 22, 60] },
  'solar-court': { background: '#b5b9ae', fog: ['#c5c6b6', 24, 63] },
  'bestiary-ravine': { background: '#49574f', fog: ['#83958b', 22, 58] },
  'bastion-alba': { background: '#7d8a9c', fog: ['#a19e99', 18, 55] },
  'acropolis-olimpo': { background: '#7d9eb5', fog: ['#9caeb9', 18, 55] },
  'baluarte-tercios': { background: '#80878d', fog: ['#9e9b8f', 18, 55] },
  'umbral-vacio': { background: '#211338', fog: ['#392359', 18, 55] },
  'cripta-plaga': { background: '#253633', fog: ['#4a5a48', 18, 55] },
  'desguace-goblin': { background: '#383940', fog: ['#555351', 18, 55] },
  'lago-kalevala': { background: '#344c67', fog: ['#58778e', 18, 55] },
}

/** Debe ser hijo directo de Scene, fuera del grupo que gira para el invitado.
 * Un attach dentro de ese grupo creaba Group.background/Group.fog: Three no
 * los lee, dejaba el fondo negro y no aplicaba ninguna niebla de escenario. */
export function ScenarioAtmosphere({ scenario }: { readonly scenario: ScenarioId }) {
  const profile = ATMOSPHERE[scenario === 'auto' ? 'sanctuary' : scenario]
  return <>
    <color attach="background" args={[profile.background]} />
    <fog attach="fog" args={[...profile.fog]} />
  </>
}
