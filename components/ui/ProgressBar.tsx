'use client'

import React from 'react'
import clsx from 'clsx'

interface ProgressBarProps {
  current: number
  total: number
  color?: 'blue' | 'amber' | 'purple' | 'emerald' | 'gray'
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

const colorClasses = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  gray: 'bg-gray-400',
}

const trackClasses = {
  blue: 'bg-blue-100',
  amber: 'bg-amber-100',
  purple: 'bg-purple-100',
  emerald: 'bg-emerald-100',
  gray: 'bg-gray-100',
}

export default function ProgressBar({
  current,
  total,
  color = 'blue',
  size = 'md',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">{current} / {total}</span>
          <span className="text-xs font-medium text-gray-700">{percent}%</span>
        </div>
      )}
      <div
        className={clsx(
          'w-full rounded-full overflow-hidden',
          trackClasses[color],
          size === 'sm' ? 'h-1' : 'h-2'
        )}
      >
        <div
          className={clsx('h-full rounded-full progress-bar-fill', colorClasses[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
