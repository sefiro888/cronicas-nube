import type { ReactNode } from 'react'

type IconName = 'attack' | 'health' | 'shield' | 'mana' | 'hand' | 'deck'
const paths: Record<IconName, ReactNode> = {
  shield: <><path d="M12 2 21 6l-2 9-7 7-7-7-2-9Z" /><path d="M12 5v13M7 8l5-2 5 2" /></>,
  attack: <><path d="m5 19 3-3m-3-3 6 6M9 15 17 3l4-1-1 4-12 9M4 20l1 1" /><path d="m10 10 4 4" /></>,
  health: <path d="M12 21 3.6 12.5C-2 6.5 6.2.2 12 6c5.8-5.8 14 .5 8.4 6.5Z" />,
  mana: <><path d="m12 2 8 7-3 11H7L4 9Z" /><path d="m4 9 8 3 8-3M12 2v10l5 8M12 12 7 20" /></>,
  hand: <><path d="m2 7 5-2M2 7l3 13 4-1M7 4l5-1m-5 1 2 15 4-1" /><rect x="12" y="3" width="9" height="17" rx="1" /><path d="m16.5 8 2 3-2 3-2-3Z" /></>,
  deck: <><path d="m3 8 9-5 9 5-9 5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
}

/** Trazo propio y monocromo: las cifras no deben cambiar de estilo según
 * el juego de emojis o las fuentes instaladas en el dispositivo. */
export function GameIcon({ name }: { readonly name: IconName }) {
  return <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    style={{ flexShrink: 0, display: 'inline-block', verticalAlign: '-0.12em' }}>{paths[name]}</svg>
}
