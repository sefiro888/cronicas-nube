import { useId } from 'react'
import type { NexusForm } from '../../battle/nexusForms'

/** Relieve frontal del relicario. La base permanece quieta mientras el núcleo
 * y la corona reaccionan al golpe, de modo que el Nexo pesa en el encuadre. */
export function NexusReliquary({ className, integrity = 1, form }: { className?: string; integrity?: number; form?: NexusForm }) {
  const id = useId()
  const paint = (name: string) => `url(#${id}-${name})`
  return <svg className={className} viewBox="0 0 240 302" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x2=".8" y2="1">
        <stop stopColor="#f7e9bd" /><stop offset=".25" stopColor="var(--accent)" />
        <stop offset=".55" stopColor="#383137" /><stop offset=".78" stopColor="var(--accent)" />
        <stop offset="1" stopColor="#201b20" />
      </linearGradient>
      <linearGradient id={`${id}-stone`} x2="1" y2=".65">
        <stop stopColor="#716874" /><stop offset=".38" stopColor="#292731" />
        <stop offset=".7" stopColor="#171821" /><stop offset="1" stopColor="#4c444a" />
      </linearGradient>
      <radialGradient id={`${id}-glass`} cx=".34" cy=".25" r=".8">
        <stop stopColor="#fcf5df" stopOpacity={.4 + integrity * .6} /><stop offset=".24" stopColor={integrity < .25 ? '#a94338' : 'var(--accent)'} />
        <stop offset=".62" stopColor="#29243b" /><stop offset="1" stopColor="#090b18" />
      </radialGradient>
    </defs>
    <ellipse cx="120" cy="282" rx="111" ry="16" fill="#080810" opacity=".8" />
    <path d="M13 268 49 250H191L227 268 213 289H27Z" fill={paint('stone')} stroke={paint('metal')} strokeWidth="2.4" />
    <path d="M13 268H227L205 278H35Z" fill={paint('metal')} opacity=".8" />
    <path d="M36 252 58 229H182L204 252 188 266H52Z" fill={paint('stone')} stroke={paint('metal')} strokeWidth="2" />
    <path d="M58 235 69 213H171L182 235 164 247H76Z" fill={paint('stone')} stroke={paint('metal')} strokeWidth="2" />
    <path d="M42 231 29 204 45 169 51 110 72 72 89 67 63 113 62 174 72 208Z" fill={paint('stone')} stroke={paint('metal')} strokeWidth="2.5" />
    <path d="M198 231 211 204 195 169 189 110 168 72 151 67 177 113 178 174 168 208Z" fill={paint('stone')} stroke={paint('metal')} strokeWidth="2.5" />
    <path d="M49 220 41 203 54 172 57 113 77 78M191 220 199 203 186 172 183 113 163 78" fill="none" stroke="var(--accent)" strokeWidth="2" opacity=".85" />
    {form ? <g transform="translate(120 116) scale(65 -87)">
      <polygon points={form.outline} fill={form.metal} stroke={paint('metal')} strokeWidth=".05" />
      <polygon points={form.outline} transform="scale(.83)" fill={paint('glass')} stroke={form.tint} strokeWidth=".026" />
      <polygon points={form.outline} transform="scale(.66)" fill="none" stroke="#fff3da" strokeWidth=".014" opacity={.45} />
      {form.hole && <circle r={form.hole} fill="#11131e" stroke={form.tint} strokeWidth=".045" />}
    </g> : <>
    <path d="M120 13 174 82 168 159 147 203 120 220 93 203 72 159 66 82Z" fill={paint('glass')} stroke={paint('metal')} strokeWidth="2.5" />
    <path d="M120 13 96 81 88 154 120 220 66 82Z" fill="#f2e7fe" opacity=".13" />
    <path d="M120 13 144 81 152 154 120 220 174 82Z" fill="#0a0920" opacity=".38" />
    <path d="M120 19 96 81 88 154 120 215 152 154 144 81Z" fill="none" stroke="#fff6e5" strokeWidth="1.3" opacity=".48" />
    <path d="M66 82 96 81 120 59 144 81 174 82M72 159 88 154 120 168 152 154 168 159" fill="none" stroke="#fff3dd" opacity=".65" />
    </>}
    {[42, 198].map((x) => <g key={x}>
      <path d={`M${x} 137l11 21-11 20-11-20Z`} fill={paint('glass')} stroke={paint('metal')} />
      <path d={`M${x} 141v31`} stroke="#fff3de" opacity=".65" />
    </g>)}
    <path d="M72 229H168L184 241 168 254H72L56 241Z" fill="#141522" stroke={paint('metal')} strokeWidth="1.6" />
    {integrity < .55 && <path d="M50 214l10 9-5 13 12 8m126-36-12 13 4 17-9 9" fill="none" stroke="#ffd6a4" strokeWidth="1.8" opacity={.4 + (1 - integrity) * .5} />}
    {integrity < .25 && <path d="M72 252l8 8-5 8 18 8m64-27 12 10-6 11 15 8" fill="none" stroke="#ff946a" strokeWidth="2" />}
  </svg>
}
