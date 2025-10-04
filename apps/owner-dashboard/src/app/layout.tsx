import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Owner Dashboard',
    template: '%s | Owner Dashboard'
  },
  description: 'Dashboard administrasi untuk pemilik cafe - kelola menu, pesanan, karyawan, dan analytics',
  keywords: ['dashboard', 'cafe management', 'restaurant', 'admin panel'],
  authors: [{ name: 'Cafe Management System' }],
  robots: 'noindex, nofollow', // Dashboard should not be indexed
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
