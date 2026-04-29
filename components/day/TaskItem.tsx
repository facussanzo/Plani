'use client'

import React, { useState, useEffect } from 'react'
import { isBefore, parseISO as parseDate, startOfDay, format as formatDate } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, CheckCircle2, Circle, Edit2, Trash2,
  Clock, RefreshCw, ChevronDown, Plus, X, Check,
  Calendar, AlignLeft, Minus,
} from 'lucide-react'
import clsx from 'clsx'
import type { Task, Subject, TaskFormData } from '@/lib/types'
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS } from '@/lib/types'
import ProgressBar from '@/components/ui/ProgressBar'
import { useAreaTags } from '@/hooks/useAreaTags'
import { useSubtasks } from '@/hooks/useSubtasks'

interface TaskItemProps {
  task: Task
  subject?: Subject | null
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onReschedule: (date: string, time?: string) => void
  onUpdateTask: (updates: Partial<TaskFormData>) => void
}

const typeColorMap: Record<string, 'blue' | 'amber' | 'purple' | 'emerald'> = {
  university: 'blue',
  work: 'amber',
  personal: 'purple',
  recurring: 'emerald',
}

const leftBorderColors: Record<string, string> = {
  university: 'border-l-blue-400',
  work: 'border-l-amber-400',
  personal: 'border-l-purple-400',
  recurring: 'border-l-emerald-400',
}

export default function TaskItem({
  task,
  subject,
  onEdit,
  onDelete,
  onToggleStatus,
  onReschedule,
  onUpdateTask,
}: TaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const isDone = task.status === 'done'
  const isCancelled = task.status === 'cancelled'
  const hasProgress = task.progress_total > 0

  const [expanded, setExpanded] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? '')
  const [progressCurrent, setProgressCurrent] = useState(task.progress_current)

  const { tags, fetchTags } = useAreaTags()
  const {
    subtasks,
    loading: subtasksLoading,
    fetchSubtasks,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useSubtasks()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskDate, setNewSubtaskDate] = useState('')

  // Load tags on mount if there are any
  useEffect(() => {
    if ((task.tag_ids?.length ?? 0) > 0) {
      const area = task.type === 'university' ? 'university' : task.type === 'work' ? 'work' : 'general'
      fetchTags(area)
    }
  }, [task.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load subtasks when expanded
  useEffect(() => {
    if (expanded) fetchSubtasks(task.id)
  }, [expanded, task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from parent
  useEffect(() => { setDescValue(task.description ?? '') }, [task.description])
  useEffect(() => { setProgressCurrent(task.progress_current) }, [task.progress_current])

  const taskTags = (task.tag_ids ?? [])
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean)

  const subtasksDoneCount = subtasks.filter(s => s.is_done).length

  const handleDescBlur = () => {
    setEditingDesc(false)
    if (descValue !== (task.description ?? '')) {
      onUpdateTask({ description: descValue })
    }
  }

  const handleProgressChange = (delta: number) => {
    const newVal = Math.max(0, Math.min(task.progress_total, progressCurrent + delta))
    setProgressCurrent(newVal)
    onUpdateTask({ progress_current: newVal })
  }

  const handleRescheduleConfirm = () => {
    if (!rescheduleDate) return
    onReschedule(rescheduleDate, rescheduleTime || undefined)
    setShowReschedule(false)
    setRescheduleDate('')
    setRescheduleTime('')
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return
    await createSubtask(task.id, newSubtaskTitle.trim(), newSubtaskDate || undefined)
    setNewSubtaskTitle('')
    setNewSubtaskDate('')
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...(subject ? { borderLeftColor: subject.color } : {}) }}
      className={clsx(
        'group bg-white border border-gray-100 rounded-xl shadow-soft border-l-4 transition-all duration-200',
        !subject && leftBorderColors[task.type],
        isDragging && 'opacity-50 scale-95 shadow-lg',
        isDone && 'opacity-60',
        isCancelled && 'opacity-40',
        expanded && 'shadow-card'
      )}
    >
      {/* ── Collapsed header (always visible) ── */}
      <div
        className="flex items-start gap-2 px-3 py-3 cursor-pointer"
        onClick={() => setExpanded(prev => !prev)}
      >
        {/* Drag handle */}
        <button
          className="mt-0.5 flex-shrink-0 text-gray-200 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
          onClick={e => e.stopPropagation()}
          {...attributes}
          {...listeners}
          title="Arrastrar"
        >
          <GripVertical size={14} />
        </button>

        {/* Status toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggleStatus() }}
          className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
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
            <p className={clsx(
              'text-sm font-medium text-gray-900 leading-snug flex-1 min-w-0',
              isDone && 'line-through text-gray-400'
            )}>
              {task.title}
            </p>
            {/* Tags inline: area tags (small) → subject → type */}
            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
              {taskTags.slice(0, 2).map(tag => tag && (
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
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: subject.color }}
                >
                  {subject.name}
                </span>
              ) : (
                <span className={clsx(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  TASK_TYPE_COLORS[task.type].bg,
                  TASK_TYPE_COLORS[task.type].text
                )}>
                  {TASK_TYPE_LABELS[task.type]}
                </span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {task.time && !task.is_all_day && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={10} />
                {task.time.substring(0, 5)}
              </span>
            )}
            {task.is_recurring && task.recurring_pattern && (
              <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                <RefreshCw size={10} />
                {task.recurring_pattern === 'daily' ? 'Diario'
                  : task.recurring_pattern === 'weekly' ? 'Semanal'
                  : 'Mensual'}
              </span>
            )}
          </div>

          {/* Progress preview (collapsed) */}
          {hasProgress && !expanded && (
            <div className="mt-1.5">
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
        <ChevronDown
          size={14}
          className={clsx(
            'flex-shrink-0 text-gray-300 mt-1 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </div>

      {/* ── Accordion body ── */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-3 border-t border-gray-50 space-y-3">

          {/* All area tags (if more than 2) */}
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

          {/* Description (editable inline) */}
          <div>
            {editingDesc ? (
              <textarea
                className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-gray-400 transition-colors bg-gray-50"
                rows={2}
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                onBlur={handleDescBlur}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setDescValue(task.description ?? ''); setEditingDesc(false) }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDescBlur() }
                }}
                autoFocus
                placeholder="Agregar descripción..."
              />
            ) : (
              <button
                onClick={() => setEditingDesc(true)}
                className="w-full text-left flex items-start gap-2 group/desc"
              >
                <AlignLeft size={13} className="text-gray-300 mt-0.5 flex-shrink-0 group-hover/desc:text-gray-400 transition-colors" />
                <p className={clsx(
                  'text-xs leading-relaxed',
                  descValue ? 'text-gray-500' : 'text-gray-300 italic'
                )}>
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
                {subtasks.map(sub => {
                  const today = startOfDay(new Date())
                  const subDate = sub.date ? startOfDay(parseDate(sub.date)) : null
                  const isPast = subDate ? isBefore(subDate, today) : false
                  const isOverdue = isPast && !sub.is_done
                  const formattedDate = subDate
                    ? formatDate(subDate, 'd MMM', { locale: esLocale })
                    : null

                  return (
                    <div key={sub.id} className="flex items-center gap-2 group/sub">
                      <button
                        onClick={() => toggleSubtask(sub)}
                        className={clsx(
                          'w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          sub.is_done ? 'bg-green-500 border-green-500'
                          : isOverdue ? 'border-red-400 hover:border-red-600'
                          : 'border-gray-300 hover:border-gray-500'
                        )}
                      >
                        {sub.is_done && <Check size={9} className="text-white" strokeWidth={3} />}
                      </button>
                      <span className={clsx(
                        'text-xs flex-1',
                        sub.is_done ? 'line-through text-gray-400'
                        : isOverdue ? 'text-red-600'
                        : 'text-gray-700'
                      )}>
                        {sub.title}
                      </span>
                      {formattedDate && (
                        <span className={clsx(
                          'text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium',
                          sub.is_done ? 'text-green-600 bg-green-50'
                          : isOverdue ? 'text-red-500 bg-red-50'
                          : 'text-gray-400 bg-gray-50'
                        )}>
                          {formattedDate}
                        </span>
                      )}
                      <button
                        onClick={() => deleteSubtask(sub.id)}
                        className="opacity-0 group-hover/sub:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )
                })}
              </>
            ) : null}
            {/* Add subtask input */}
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-1.5">
                <input
                  className="flex-1 text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-300 placeholder:text-gray-300 transition-colors"
                  placeholder="+ Agregar subtarea..."
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                />
                {newSubtaskTitle.trim() && (
                  <button
                    onClick={handleAddSubtask}
                    className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>
              {newSubtaskTitle.trim() && (
                <div className="flex items-center gap-1.5 pl-1">
                  <Calendar size={10} className="text-gray-300 flex-shrink-0" />
                  <input
                    type="date"
                    className="text-[10px] border border-gray-100 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:border-gray-300 text-gray-500"
                    value={newSubtaskDate}
                    onChange={e => setNewSubtaskDate(e.target.value)}
                    placeholder="Fecha (opcional)"
                  />
                  <span className="text-[10px] text-gray-300">fecha opcional</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress counter */}
          {hasProgress && (
            <div>
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

          {/* Reschedule inline form */}
          {showReschedule && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reprogramar tarea</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Nueva fecha *</label>
                  <input
                    type="date"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Hora (opcional)</label>
                  <input
                    type="time"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRescheduleConfirm}
                  disabled={!rescheduleDate}
                  className="flex-1 text-xs font-medium bg-gray-900 text-white py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => { setShowReschedule(false); setRescheduleDate(''); setRescheduleTime('') }}
                  className="px-3 text-xs text-gray-500 bg-white border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
            >
              <Edit2 size={11} />
              Editar
            </button>
            <button
              onClick={() => setShowReschedule(prev => !prev)}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showReschedule
                  ? 'text-amber-700 bg-amber-50'
                  : 'text-gray-500 hover:text-amber-700 hover:bg-amber-50'
              )}
            >
              <Calendar size={11} />
              Reprogramar
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors ml-auto"
            >
              <Trash2 size={11} />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
