'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Sun,
  GraduationCap,
  Briefcase,
  User,
  FileText,
  Clock,
  Bookmark,
  Zap,
  LogOut,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  exact?: boolean
}

const sections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/',         label: 'Dashboard',  icon: LayoutDashboard, exact: true },
      { href: '/calendar', label: 'Calendario', icon: Calendar },
      { href: '/day/today', label: 'Hoy',       icon: Sun },
    ],
  },
  {
    title: 'Áreas',
    items: [
      { href: '/lists?tab=university', label: 'Universidad', icon: GraduationCap },
      { href: '/lists?tab=work',       label: 'Trabajo',     icon: Briefcase },
      { href: '/lists?tab=personal',   label: 'Personal',    icon: User },
    ],
  },
  {
    title: 'Captura',
    items: [
      { href: '/draft',    label: 'Borrador', icon: FileText },
      { href: '/someday',  label: 'Someday',  icon: Bookmark },
    ],
  },
  {
    items: [
      { href: '/blocks', label: 'Bloques', icon: Clock },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, signOut } = useAuth()

  const isActive = (href: string, exact?: boolean) => {
    const [path, query] = href.split('?')
    if (exact) return pathname === path
    if (path === '/lists' && query) {
      const tab = new URLSearchParams(query).get('tab')
      const currentTab = searchParams.get('tab')
      return pathname === '/lists' && currentTab === tab
    }
    return pathname.startsWith(path)
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Plani</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 ml-11">Tu planificador personal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest px-3 mb-1">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100',
                      active
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    )}
                  >
                    <Icon
                      size={16}
                      className={clsx(active ? 'text-gray-700' : 'text-gray-400')}
                    />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-50 space-y-2">
        {user && (
          <p className="text-xs text-gray-400 truncate" title={user.email}>{user.email}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-300 font-medium">Plani v0.2</p>
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={13} />
            Salir
          </button>
        </div>
      </div>
    </aside>
  )
}
