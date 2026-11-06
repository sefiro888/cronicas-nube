import { createClient } from '@supabase/supabase-js'

/**
 * URL y clave "publicable" (anon) del proyecto de Supabase. A diferencia de
 * la llave secreta, esta está pensada por diseño para vivir en el bundle del
 * navegador (Supabase la protege con Row Level Security, no con secretismo),
 * así que puede quedarse aquí como valor por defecto: el despliegue en GitHub
 * Pages no necesita secretos adicionales.
 *
 * Se pueden sobrescribir con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
 * (fichero `.env.local` o variables del entorno de build). Hace falta cuando
 * el proyecto cambia: los proyectos gratuitos de Supabase se PAUSAN por
 * inactividad y, pasado un tiempo, su dominio deja de existir — a partir de
 * ese momento el multijugador no puede conectar y hay que apuntar a uno nuevo
 * sin tener que tocar el código.
 */
// Proyecto independiente de cronicas-nube: no comparte salas con el juego original.
const DEFAULT_URL = 'https://cawihzwnibqxrplkhpbm.supabase.co'
const DEFAULT_ANON_KEY = 'sb_publishable_Kp0bGsixsk-w3UEX1rz3Tw__5e_rFCP'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
