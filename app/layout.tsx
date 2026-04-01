import type { Metadata, Viewport } from 'next'
import './globals.css'
import ConditionalLayout from '@/components/layout/ConditionalLayout'

export const metadata: Metadata = {
  title: 'Plani - Organizador Personal',
  description: 'Gestiona tus tareas universitarias, laborales y objetivos personales',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Plani',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
