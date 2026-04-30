'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks, isToday, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Layers, Plus, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTasks } from '@/hooks/useTasks'
import { useFixedBlocks } from '@/hooks/useFixedBlocks'
import { useSubjects } from '@/hooks/useSubjects'
import type { Task, FixedBlock, TaskFormData } from '@/lib/types'
import { TASK_TYPE_COLORS, PRIORITY_CONFIG } from '@/lib/types'
import TaskModal from '@/components/tasks/TaskModal'
import clsx from 'clsx'

const SHOW_BLOCKS_WEEK_KEY = 'plani_week_show_blocks'
const SPECIAL_CATS = new Set(['TP', 'Parcial', 'Proyecto'])

const CAT_COLORS: Record<string, string> = {
  TP: 'bg-orange-500',
  Parcial: 'bg-red-500',
  Proyecto: 'bg-violet-500',
}

export default function WeekView() {
  const router = useRouter()
  const [baseDate, setBaseDate] = useState(new Date())
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showBlocks, setShowBlocks] = useState(() => {
    if (typeof window === 'undefined') return true
    const s = localStorage.getItem(SHOW_BLOCKS_WEEK_KEY)
    return s === null ? true : s === 'true'
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalDate, setModalDate] = useState('')

  const { fetchTasksByDateRange, createTask, updateTask } = useTasks()
  const { blocks, fetchBlocks } = useFixedBlocks()
  const { subjects, fetchSubjects } = useSubjects()

  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [data] = await Promise.all([
      fetchTasksByDateRange(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),
      fetchBlocks(),
      fetchSubjects(),
    ])
    setAllTasks(data)
    setLoading(false)
  }, [baseDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  const getTasksForDay = (date: Date) => {
    const ds = format(date, 'yyyy-MM-dd')
    return allTasks.filter(t => t.start_date === ds || t.deadline === ds)
  }

  const getBlocksForDay = (date: Date) => {
    const dow = date.getDay()
    return blocks.filter(b => b.days_of_week.includes(dow))
  }

  const subjectFor = (task: Task) =>
    task.subject_id ? subjects.find(s => s.id === task.subject_id) ?? null : null

  const handleSave = async (data: TaskFormData): Promise<Task> => {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, data)
      setAllTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
      setEditingTask(null)
      return updated
    } else {
      const created = await createTask(data)
      setAllTasks(prev => [...prev, created])
      return created
    }
  }

  const toggleShowBlocks = () => {
    const next = !showBlocks
    setShowBlocks(next)
    localStorage.setItem(SHOW_BLOCKS_WEEK_KEY, String(next))
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white flex-shrink-0">
        {/* Row 1: nav + actions */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBaseDate(prev => subWeeks(prev, 1))}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-base font-bold text-gray-900 min-w-[200px] text-center">
              {format(weekStart, "d 'de' MMM", { locale: es })} – {format(weekEnd, "d 'de' MMM yyyy", { locale: es })}
            </h1>
            <button
              onClick={() => setBaseDate(prev => addWeeks(prev, 1))}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingTask(null); setModalDate(format(new Date(), 'yyyy-MM-dd')); setModalOpen(true) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <CalendarDays size={13} />
              Nuevo evento
            </button>
            <button
              onClick={() => { setEditingTask(null); setModalDate(format(new Date(), 'yyyy-MM-dd')); setModalOpen(true) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={13} />
              Nueva tarea
            </button>
          </div>
        </div>
        {/* Row 2: toggles */}
        <div className="flex items-center gap-2 px-6 pb-2.5">
          <button
            onClick={() => setBaseDate(new Date())}
            className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            Esta semana
          </button>
          <button
            onClick={toggleShowBlocks}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              showBlocks
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            <Layers size={13} />
            Bloques
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white flex-shrink-0">
        {days.map(day => (
          <button
            key={day.toISOString()}
            onClick={() => router.push(`/day/${format(day, 'yyyy-MM-dd')}`)}
            className={clsx(
              'py-2 text-center transition-colors hover:bg-gray-50',
              isToday(day) && 'bg-blue-50'
            )}
          >
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {format(day, 'EEE', { locale: es })}
            </p>
            <p className={clsx(
              'text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full',
              isToday(day) ? 'bg-gray-900 text-white' : 'text-gray-700'
            )}>
              {format(day, 'd')}
            </p>
          </button>
        ))}
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-400">Cargando semana...</div>
          </div>
        ) : (
          <div className="grid grid-cols-7 h-full divide-x divide-gray-100">
            {days.map(day => {
              const ds = format(day, 'yyyy-MM-dd')
              const dayTasks = getTasksForDay(day)
              const dayBlocks = getBlocksForDay(day)
              const entregas = dayTasks.filter(t => SPECIAL_CATS.has(t.category ?? ''))
              const regular = dayTasks.filter(t => !SPECIAL_CATS.has(t.category ?? ''))

              return (
                <div
                  key={ds}
                  className={clsx(
                    'p-2 space-y-1 min-h-[200px]',
                    isToday(day) && 'bg-blue-50/40'
                  )}
                >
                  {/* Fixed blocks */}
                  {showBlocks && dayBlocks.map(block => {
                    const sub = block.subject_id ? subjects.find(s => s.id === block.subject_id) : null
                    return (
                      <div
                        key={block.id}
                        className="px-1.5 py-1 rounded text-[10px] font-medium leading-tight truncate"
                        style={sub
                          ? { backgroundColor: sub.color + '22', borderLeft: `2px solid ${sub.color}`, color: sub.color }
                          : { backgroundColor: '#eff6ff', borderLeft: '2px solid #3b82f6', color: '#1d4ed8' }
                        }
                        title={`${block.title} ${block.start_time.substring(0, 5)}–${block.end_time.substring(0, 5)}`}
                      >
                        <span className="opacity-60 mr-1">{block.start_time.substring(0, 5)}</span>
                        {block.title}
                      </div>
                    )
                  })}

                  {/* Entregas */}
                  {entregas.map(task => {
                    const sub = subjectFor(task)
                    const catColor = CAT_COLORS[task.category ?? ''] ?? 'bg-gray-500'
                    return (
                      <button
                        key={task.id}
                        onClick={() => { setEditingTask(task); setModalDate(ds); setModalOpen(true) }}
                        className="w-full text-left px-1.5 py-1 rounded border text-[10px] font-medium leading-tight truncate flex items-center gap-1"
                        style={sub
                          ? { backgroundColor: sub.color + '12', borderColor: sub.color + '45' }
                          : { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }
                        }
                      >
                        <span className={clsx('text-[9px] font-bold px-1 py-0.5 rounded text-white flex-shrink-0', catColor)}>
                          {task.category}
                        </span>
                        <span className="truncate text-gray-700">{task.title}</span>
                        {task.priority && (
                          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto', PRIORITY_CONFIG[task.priority].dot)} />
                        )}
                      </button>
                    )
                  })}

                  {/* Regular tasks */}
                  {regular.map(task => {
                    const sub = subjectFor(task)
                    const isDone = task.status === 'done'
                    return (
                      <button
                        key={task.id}
                        onClick={() => { setEditingTask(task); setModalDate(ds); setModalOpen(true) }}
                        className={clsx(
                          'w-full text-left px-1.5 py-1 rounded text-[10px] font-medium leading-tight truncate flex items-center gap-1 border-l-2',
                          TASK_TYPE_COLORS[task.type].bg,
                          TASK_TYPE_COLORS[task.type].text,
                          isDone && 'opacity-50 line-through'
                        )}
                        style={sub ? { borderLeftColor: sub.color } : { borderLeftColor: 'transparent' }}
                        title={task.title}
                      >
                        <span className="truncate flex-1">{task.title}</span>
                        {task.priority && (
                          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_CONFIG[task.priority].dot)} />
                        )}
                      </button>
                    )
                  })}

                  {dayTasks.length === 0 && dayBlocks.length === 0 && (
                    <button
                      onClick={() => { setEditingTask(null); setModalDate(ds); setModalOpen(true) }}
                      className="w-full text-center py-2 text-[10px] text-gray-300 hover:text-gray-400 transition-colors"
                    >
                      + agregar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        initialTask={editingTask}
        initialDate={modalDate}
        onSave={handleSave}
      />
    </div>
  )
}
