'use client'

import React from 'react'
import clsx from 'clsx'
import type { TaskType, TaskStatus } from '@/lib/types'
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS } from '@/lib/types'

interface TypeBadgeProps {
  type: TaskType
  size?: 'sm' | 'md'
}

const typeStyles: Record<TaskType, string> = {
  university: 'bg-blue-100 text-blue-700',
  work: 'bg-amber-100 text-amber-700',
  personal: 'bg-purple-100 text-purple-700',
  recurring: 'bg-emerald-100 text-emerald-700',
}

const typeDots: Record<TaskType, string> = {
  university: 'bg-blue-500',
  work: 'bg-amber-500',
  personal: 'bg-purple-500',
  recurring: 'bg-emerald-500',
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-full',
        typeStyles[type],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', typeDots[type])} />
      {TASK_TYPE_LABELS[type]}
    </span>
  )
}

interface StatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'md'
}

const statusStyles: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        statusStyles[status],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}

interface BadgeProps {
  children: React.ReactNode
  color?: 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'emerald'
  size?: 'sm' | 'md'
  className?: string
}

const colorStyles = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700',
}

export function Badge({ children, color = 'gray', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        colorStyles[color],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {children}
    </span>
  )
}
