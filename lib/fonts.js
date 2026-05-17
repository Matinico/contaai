import { Inter, Syne } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

export const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

// Usá estas constantes en inline styles React.
// var() resuelve al font cargado por next/font dentro del wrapper de _app.js,
// con fallback al nombre literal para SSR y elementos fuera del wrapper.
export const FONT = "var(--font-inter, 'Inter', 'Segoe UI', system-ui, sans-serif)"
export const SYNE = "var(--font-syne, 'Syne', 'Inter', system-ui, sans-serif)"
