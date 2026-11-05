import { useId } from 'react'

/** El sello conserva relieve incluso con la reserva agotada, cuando el color
 * de la energía deja de ayudar a distinguir sus detalles. */
export function EssenceSeal() {
  const id = useId()
  return <svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <linearGradient id={id} x2=".8" y2="1">
        <stop stopColor="#fff1bb" /><stop offset=".27" stopColor="#b48a43" />
        <stop offset=".52" stopColor="#3a2b20" /><stop offset=".76" stopColor="#dcc18a" /><stop offset="1" stopColor="#594026" />
      </linearGradient>
    </defs>
    <path d="M50 1 59 8 70 6 75 16 87 19 88 31 97 39 93 50 97 61 88 69 87 81 75 84 70 94 59 92 50 99 41 92 30 94 25 84 13 81 12 69 3 61 7 50 3 39 12 31 13 19 25 16 30 6 41 8Z"
      fill={`url(#${id})`} stroke="#e6d29c" strokeWidth=".7" />
    <circle cx="50" cy="50" r="40" fill="#121817" stroke="#261d15" strokeWidth="3" />
    <circle cx="50" cy="50" r="36" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
    <circle cx="50" cy="50" r="43" fill="none" stroke="#f9e1a1" strokeWidth="1.4" strokeDasharray="1 5.75" />
    {[0, 1, 2, 3].map((index) => <path key={index} transform={`rotate(${index * 90} 50 50)`}
      d="M50 6 54 14 50 21 46 14Z" fill="#f1d898" stroke="#6e4d27" strokeWidth=".8" />)}
  </svg>
}
