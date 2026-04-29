'use client'

import React, { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Clock, Calendar, CheckCircle2, Circle, AlertCircle, CalendarDays,
  ChevronDown, AlignLeft, Plus, X, Check, Minus, Edit2, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import type { Task, Subject, TaskFormData } from '@/lib/types'
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS } from '@/lib/types'
import ProgressBar from '@/components/ui/ProgressBar'
import { useAreaTags } from '@/hooks/useAreaTags'
import { useSubtasks } from '@/hooks/useSubtasks'

interface TaskCardProps {
  task: Task
  subject?: Subject | null
  onClick?: () => void
  onToggleStatus?: () => void
  compact?: boolean
  expandable?: boolean
  hideAreaBadge?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onUpdateTask?: (updates: Partial<TaskFormData>) => void
}

const typeColorMap: Record<string, 'blue' | 'amber' | 'purple' | 'emerald'> = {
  university: 'blue',
  work: 'amber',
  personal: 'purple',
  recurring: 'emerald',
}

const leftBorderColors: Record<string, string> = {
  university: 'border-l-blue-500',
  work: 'border-l-amber-500',
  personal: 'border-l-purple-500',
  recurring: 'border-l-emerald-500',
}

export default function TaskCard({
  task,
  subject,
  onClick,
  onToggleStatus,
  compact = false,
  expandable = false,
  hideAreaBadge = false,
  onEdit,
  onDelete,
  onUpdateTask,
}: TaskCardProps) {
  const isDone = task.status === 'done'
  const isCancelled = task.status === 'cancelled'
  const hasProgress = task.progress_total > 0
  const isOverdue = task.deadline && task.status !== 'done' && task.status !== 'cancelled'
    && new Date(task.deadline) < new Date()

  const [expanded, setExpanded] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? '')
  const [progressCurrent, setProgressCurrent] = useState(task.progress_current)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const { tags, fetchTags } = useAreaTags()
  const { subtasks, loading: subtasksLoading, fetchSubtasks, createSubtask, toggleSubtask, deleteSubtask } = useSubtasks()

  // Load tags on mount
  useEffect(() => {
    if ((task.tag_ids?.length ?? 0) > 0) {
      const area = task.type === 'university' ? 'university' : task.type === 'work' ? 'work' : 'general'
      fetchTags(area)
    }
  }, [task.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load subtasks when expanded
  useEffect(() => {
    if (expanded && expandable) fetchSubtasks(task.id)
  }, [expanded, task.id, expandable]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from parent
  useEffect(() => { setDescValue(task.description ?? '') }, [task.description])
  useEffect(() => { setProgressCurrent(task.progress_current) }, [task.progress_current])

  const taskTags = (task.tag_ids ?? [])
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean)

  const subtasksDoneCount = subtasks.filter(s => s.is_done).length

  const handleClick = () => {
    if (expandable) {
      setExpanded(prev => !prev)
    } else {
      onClick?.()
    }
  }

  const handleDescBlur = () => {
    setEditingDesc(false)
    if (descValue !== (task.description ?? '')) {
      onUpdateTask?.({ description: descValue })
    }
  }

  const handleProgressChange = (delta: number) => {
    const newVal = Math.max(0, Math.min(task.progress_total, progressCurrent + delta))
    setProgressCurrent(newVal)
    onUpdateTask?.({ progress_current: newVal })
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return
    await createSubtask(task.id, newSubtaskTitle.trim())
    setNewSubtaskTitle('')
  }

  return (
    <div
      className={clsx(
        'task-card relative border-l-4 select-none',
        !subject && leftBorderColors[task.type],
        isDone && 'opacity-60',
        isCancelled && 'opacity-40',
        compact ? 'p-2' : 'p-3',
        expandable && expanded && 'shadow-card'
      )}
      style={subject ? { borderLeftColor: subject.color } : undefined}
    >
      {/* Main row */}
      <div
        className={clsx('flex items-start gap-2', (expandable || onClick) && 'cursor-pointer')}
        onClick={handleClick}
      >
        {/* Status toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggleStatus?.() }}
          className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors"
          title="Cambiar estado"
        >
          {isDone
            ? <CheckCircle2 size={16} className="text-green-500" />
            : <Circle size={16} />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {task.is_event && (
                <CalendarDays size={12} className="text-gray-400 flex-shrink-0" />
              )}
              <p className={clsx(
                'text-sm font-medium text-gray-900 leading-snug',
                isDone && 'line-through text-gray-400',
                compact && 'text-xs'
              )}>
                {task.title}
              </p>
            </div>

            {/* Tags: area tags → subject → type */}
            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
              {!compact && taskTags.slice(0, 2).map(tag => tag && (
                <span
                  key={tag.id}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {subject ? (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: subject.color }}
                >
                  {subject.name}
                </span>
              ) : !hideAreaBadge ? (
                <span className={clsx(
                  'text-xs font-medium px-1.5 py-0.5 rounded-full',
                  TASK_TYPE_COLORS[task.type].bg,
                  TASK_TYPE_COLORS[task.type].text
                )}>
                  {TASK_TYPE_LABELS[task.type]}
                </span>
              ) : null}
            </div>
          </div>

          {!compact && (
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {task.time && !task.is_all_day && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} />
                  {task.time.substring(0, 5)}
                </span>
              )}
              {task.deadline && (
                <span className={clsx(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'
                )}>
                  {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                  {format(parseISO(task.deadline), 'd MMM', { locale: es })}
                </span>
              )}
              {task.is_recurring && (
                <span className="text-xs text-emerald-500 font-medium">↻ recurrente</span>
              )}
            </div>
          )}

          {/* Progress bar preview */}
          {hasProgress && !compact && !(expandable && expanded) && (
            <div className="mt-2">
              <ProgressBar
                current={progressCurrent}
                total={task.progress_total}
                color={typeColorMap[task.type]}
                size="sm"
                showLabel
              />
            </div>
          )}
        </div>

        {/* Expand chevron */}
        {expandable && (
          <ChevronDown
            size={14}
            className={clsx(
              'flex-shrink-0 text-gray-300 mt-1 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        )}
      </div>

      {/* ── Accordion body ── */}
      {expandable && (
        <div className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="pt-3 mt-2 border-t border-gray-50 space-y-3">

            {/* All area tags */}
            {taskTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {taskTags.map(tag => tag && (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Description (editable) */}
            <div>
              {editingDesc ? (
                <textarea
                  className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-gray-400 bg-gray-50"
                  rows={2}
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                  onBlur={handleDescBlur}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setDescValue(task.description ?? ''); setEditingDesc(false) }
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDescBlur() }
                  }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  placeholder="Agregar descripción..."
                />
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setEditingDesc(true) }}
                  className="w-full text-left flex items-start gap-2 group/desc"
                >
                  <AlignLeft size={13} className="text-gray-300 mt-0.5 flex-shrink-0 group-hover/desc:text-gray-400" />
                  <p className={clsx('text-xs leading-relaxed', descValue ? 'text-gray-500' : 'text-gray-300 italic')}>
                    {descValue || 'Agregar descripción...'}
                  </p>
                </button>
              )}
            </div>

            {/* Subtasks */}
            <div className="space-y-1.5">
              {subtasksLoading ? (
                <p className="text-xs text-gray-300">Cargando...</p>
              ) : subtasks.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Subtareas {subtasksDoneCount}/{subtasks.length}
                    </p>
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-700 rounded-full transition-all duration-300"
                        style={{ width: subtasks.length > 0 ? `${Math.round((subtasksDoneCount / subtasks.length) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                  {subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 group/sub">
                      <button
                        onClick={e => { e.stopPropagation(); toggleSubtask(sub) }}
                        className={clsx(
                          'w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          sub.is_done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gray-500'
                        )}
                      >
                        {sub.is_done && <Check size={9} className="text-white" strokeWidth={3} />}
                      </button>
                      <span className={clsx('text-xs flex-1', sub.is_done && 'line-through text-gray-400')}>
                        {sub.title}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSubtask(sub.id) }}
                        className="opacity-0 group-hover/sub:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </>
              ) : null}
              <div className="flex items-center gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                <input
                  className="flex-1 text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-300 placeholder:text-gray-300"
                  placeholder="+ Agregar subtarea..."
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                />
                {newSubtaskTitle.trim() && (
                  <button
                    onClick={handleAddSubtask}
                    className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress counter */}
            {hasProgress && (
              <div onClick={e => e.stopPropagation()}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Progreso</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleProgressChange(-1)}
                    disabled={progressCurrent <= 0}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-sm font-semibold text-gray-700 w-20 text-center tabular-nums">
                    {progressCurrent} / {task.progress_total}
                  </span>
                  <button
                    onClick={() => handleProgressChange(1)}
                    disabled={progressCurrent >= task.progress_total}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    current={progressCurrent}
                    total={task.progress_total}
                    color={typeColorMap[task.type]}
                    size="sm"
                    showLabel
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1 pt-1 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Edit2 size={11} />
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors ml-auto"
                  >
                    <Trash2 size={11} />
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
