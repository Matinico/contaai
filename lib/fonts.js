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

export const FONT = 'Arial, sans-serif'
export const SYNE = 'Arial, sans-serif'
