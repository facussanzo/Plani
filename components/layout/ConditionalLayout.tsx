'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth')

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: desktop only */}
      <div className="hidden lg:block">
        <Suspense><Sidebar /></Suspense>
      </div>

      {/* Main content: full width on mobile, offset by sidebar on desktop */}
      <main className="flex-1 lg:ml-60 h-screen overflow-y-auto overflow-x-hidden pb-safe-bottom lg:pb-0">
        {children}
      </main>

      {/* Bottom nav: mobile only */}
      <Suspense><BottomNav /></Suspense>
    </div>
  )
}
