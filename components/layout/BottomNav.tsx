'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Sun, Calendar, List, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import MobileMenu from './MobileMenu'

const tabs = [
  { href: '/',            label: 'Inicio',      icon: LayoutDashboard, exact: true },
  { href: '/day/today',   label: 'Hoy',         icon: Sun,             exact: false },
  { href: '/calendar',    label: 'Calendario',  icon: Calendar,        exact: false },
  { href: '/lists',       label: 'Listas',      icon: List,            exact: false },
]

export default function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-stretch lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0',
                active ? 'text-gray-900' : 'text-gray-400 active:text-gray-600'
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className={clsx(
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            menuOpen ? 'text-gray-900' : 'text-gray-400 active:text-gray-600'
          )}
        >
          <MoreHorizontal size={21} strokeWidth={1.8} />
          <span>Más</span>
        </button>
      </nav>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
