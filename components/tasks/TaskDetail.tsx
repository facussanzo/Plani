'use client'

import React, { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  RefreshCw,
  AlignLeft,
  Edit2,
  Trash2,
  X,
  CalendarDays,
} from 'lucide-react'
import type { Task, Subject } from '@/lib/types'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import { TypeBadge, StatusBadge } from '@/components/ui/Badge'
import { useSubtasks } from '@/hooks/useSubtasks'
import clsx from 'clsx'

interface TaskDetailProps {
  task: Task
  subject?: Subject | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}

const typeColorMap: Record<string, 'blue' | 'amber' | 'purple' | 'emerald'> = {
  university: 'blue',
  work: 'amber',
  personal: 'purple',
  recurring: 'emerald',
}

export default function TaskDetail({
  task,
  subject,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
}: TaskDetailProps) {
  const hasProgress = task.progress_total > 0
  const { subtasks, fetchSubtasks, toggleSubtask, doneCount } = useSubtasks()

  useEffect(() => {
    fetchSubtasks(task.id)
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-slide-in-right">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {task.is_event && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                <CalendarDays size={10} />
                Evento
              </span>
            )}
            <TypeBadge type={task.type} />
            <StatusBadge status={task.status} />
            {/* Subject tag */}
            {subject && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: subject.color }}
              >
                {subject.name}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 leading-snug">{task.title}</h2>
          {task.category && (
            <p className="text-sm text-gray-400 mt-1">{task.category}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-3"
        >
          <X size={16} />
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlignLeft size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        {task.start_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} className="text-gray-400" />
            <span>Inicio: {format(parseISO(task.start_date), 'dd MMM yyyy', { locale: es })}</span>
          </div>
        )}
        {task.deadline && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} className="text-red-400" />
            <span>Límite: {format(parseISO(task.deadline), 'dd MMM yyyy', { locale: es })}</span>
          </div>
        )}
        {task.end_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} className="text-gray-400" />
            <span>Fin: {format(parseISO(task.end_date), 'dd MMM yyyy', { locale: es })}</span>
          </div>
        )}
        {task.time && !task.is_all_day && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={14} className="text-gray-400" />
            <span>{task.time.substring(0, 5)}</span>
          </div>
        )}
        {task.is_all_day && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={14} className="text-gray-400" />
            <span>Todo el día</span>
          </div>
        )}
        {task.is_recurring && task.recurring_pattern && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <RefreshCw size={14} className="text-emerald-400" />
            <span>Recurrente: {task.recurring_pattern}</span>
          </div>
        )}
      </div>

      {/* Progress */}
      {hasProgress && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Progreso</p>
          <ProgressBar
            current={task.progress_current}
            total={task.progress_total}
            color={typeColorMap[task.type]}
            size="md"
            showLabel
          />
        </div>
      )}

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Subtareas ({doneCount}/{subtasks.length})
            </p>
            <div className="flex-1 mx-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700 rounded-full transition-all"
                style={{ width: `${subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            {subtasks.map(sub => (
              <button
                key={sub.id}
                onClick={() => toggleSubtask(sub)}
                className="flex items-center gap-2 w-full text-left group"
              >
                <div
                  className={clsx(
                    'w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    sub.is_done ? 'bg-green-500 border-green-500' : 'border-gray-400 group-hover:border-gray-600'
                  )}
                >
                  {sub.is_done && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span className={clsx('text-sm', sub.is_done && 'line-through text-gray-400')}>
                  {sub.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Created at */}
      <p className="text-xs text-gray-300 mb-4">
        Creada el {format(parseISO(task.created_at), 'dd MMM yyyy', { locale: es })}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleStatus}
        >
          {task.status === 'done' ? 'Reabrir' : 'Completar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 size={13} />
          Editar
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} className="ml-auto">
          <Trash2 size={13} />
          Eliminar
        </Button>
      </div>
    </div>
  )
}
