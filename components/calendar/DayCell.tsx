'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import type { Task, FixedBlock, Subject } from '@/lib/types'
import { TASK_TYPE_COLORS } from '@/lib/types'

interface DayCellProps {
  date: Date
  dateStr: string
  tasks: Task[]
  blocks?: FixedBlock[]
  subjects?: Subject[]
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isFreeDay?: boolean
  isWeekend?: boolean
  freeMode?: boolean
  onClick: () => void
}

const MAX_VISIBLE_TASKS = 2
const MAX_VISIBLE_BLOCKS = 1

// Solid fill for events
const EVENT_BG: Record<string, string> = {
  university: 'bg-blue-500 text-white',
  work:       'bg-amber-500 text-white',
  personal:   'bg-purple-500 text-white',
  recurring:  'bg-emerald-500 text-white',
}

// Area fallback colors for blocks (hex for inline style)
const AREA_BLOCK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  university: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  work:       { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  personal:   { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
  other:      { bg: '#f9fafb', border: '#9ca3af', text: '#4b5563' },
}

function getBlockStyle(
  block: FixedBlock,
  subjects: Subject[]
): React.CSSProperties {
  if (block.subject_id) {
    const subject = subjects.find(s => s.id === block.subject_id)
    if (subject) {
      return {
        backgroundColor: subject.color + '22',  // ~13% opacity
        borderLeft: `3px solid ${subject.color}`,
        color: subject.color,
      }
    }
  }
  const area = AREA_BLOCK_COLORS[block.type] ?? AREA_BLOCK_COLORS.other
  return {
    backgroundColor: area.bg,
    borderLeft: `3px solid ${area.border}`,
    color: area.text,
  }
}

export default function DayCell({
  date,
  dateStr,
  tasks,
  blocks = [],
  subjects = [],
  isCurrentMonth,
  isToday,
  isSelected,
  isFreeDay = false,
  isWeekend = false,
  freeMode = false,
  onClick,
}: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr })

  const visibleBlocks = blocks.slice(0, MAX_VISIBLE_BLOCKS)
  const visibleTasks  = tasks.slice(0, MAX_VISIBLE_TASKS)
  const overflow = (blocks.length + tasks.length) - (visibleBlocks.length + visibleTasks.length)

  // Background priority: out-of-month > free day > today > weekend > default
  const bgClass = !isCurrentMonth
    ? 'bg-gray-50 opacity-50'
    : isFreeDay
    ? 'bg-slate-100'
    : isToday
    ? 'bg-blue-50'
    : isWeekend
    ? 'bg-gray-50/70'
    : ''

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={clsx(
        'border-b border-r border-gray-100 flex flex-col p-1 transition-colors duration-100',
        freeMode ? 'cursor-crosshair' : 'cursor-pointer',
        bgClass,
        !isFreeDay && !isToday && isCurrentMonth && 'hover:bg-gray-50',
        isSelected && 'ring-2 ring-inset ring-blue-400',
        isOver && 'bg-blue-50 ring-2 ring-inset ring-blue-300'
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-0.5">
        {isFreeDay && isCurrentMonth && (
          <span className="text-[9px] text-slate-400 font-medium leading-none">libre</span>
        )}
        {!isFreeDay && <span />}
        <span
          className={clsx(
            'w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-medium',
            isToday
              ? 'bg-gray-900 text-white'
              : isCurrentMonth
              ? 'text-gray-600'
              : 'text-gray-300'
          )}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
        {/* Fixed blocks — with subject/area colors */}
        {visibleBlocks.map(block => {
          const style = getBlockStyle(block, subjects)
          return (
            <div
              key={block.id}
              title={`${block.title} · ${block.start_time.substring(0, 5)}–${block.end_time.substring(0, 5)}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight truncate"
              style={style}
            >
              <span className="text-[9px] opacity-60 flex-shrink-0 tabular-nums">
                {block.start_time.substring(0, 5)}
              </span>
              <span className="truncate">{block.title}</span>
            </div>
          )
        })}

        {/* Tasks/Events */}
        {visibleTasks.map(task => (
          task.is_event ? (
            <div
              key={task.id}
              title={task.title}
              className={clsx(
                'flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight truncate',
                EVENT_BG[task.type] ?? EVENT_BG.personal,
                task.status === 'done' && 'opacity-50 line-through'
              )}
            >
              <span className="truncate">{task.title}</span>
            </div>
          ) : (
            <div
              key={task.id}
              title={task.title}
              className={clsx(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight truncate',
                TASK_TYPE_COLORS[task.type].bg,
                TASK_TYPE_COLORS[task.type].text,
                task.status === 'done' && 'opacity-40 line-through'
              )}
            >
              <span className={clsx('w-1 h-1 rounded-full flex-shrink-0', TASK_TYPE_COLORS[task.type].dot)} />
              <span className="truncate">{task.title}</span>
            </div>
          )
        ))}

        {overflow > 0 && (
          <div className="px-1.5 py-0.5 text-[10px] text-gray-400 font-medium">
            +{overflow} más
          </div>
        )}
      </div>
    </div>
  )
}
