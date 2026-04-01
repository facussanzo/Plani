'use client'

import Link from 'next/link'
import { X, FileText, Bookmark, Clock, LogOut, GraduationCap, Briefcase, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { href: '/lists?tab=university', label: 'Universidad', icon: GraduationCap, color: 'text-blue-500 bg-blue-50' },
  { href: '/lists?tab=work',       label: 'Trabajo',     icon: Briefcase,     color: 'text-amber-500 bg-amber-50' },
  { href: '/lists?tab=personal',   label: 'Personal',    icon: User,          color: 'text-purple-500 bg-purple-50' },
  { href: '/draft',                label: 'Borrador',    icon: FileText,      color: 'text-gray-500 bg-gray-50' },
  { href: '/someday',              label: 'Someday',     icon: Bookmark,      color: 'text-gray-500 bg-gray-50' },
  { href: '/blocks',               label: 'Bloques',     icon: Clock,         color: 'text-gray-500 bg-gray-50' },
]

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, signOut } = useAuth()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Menú</p>
            {user?.email && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grid of links */}
        <div className="p-4 grid grid-cols-3 gap-3">
          {menuItems.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-center"
            >
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="px-4 pb-4">
          <button
            onClick={() => { signOut(); onClose() }}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>

        {/* Safe area */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </div>
  )
}
