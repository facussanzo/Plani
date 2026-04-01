'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, AlertCircle, CheckCircle2, Clock, CalendarDays, Trash2, SkipForward, Calendar, X } from 'lucide-react'
import Link from 'next/link'
import { useTasks } from '@/hooks/useTasks'
import { useFixedBlocks } from '@/hooks/useFixedBlocks'
import { useSubjects } from '@/hooks/useSubjects'
import type { Task, FixedBlock, TaskType } from '@/lib/types'
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS } from '@/lib/types'
import TaskModal from '@/components/tasks/TaskModal'
import TaskCard from '@/components/tasks/TaskCard'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import clsx from 'clsx'

const typeColorMap: Record<string, 'blue' | 'amber' | 'purple' | 'emerald'> = {
  university: 'blue',
  work: 'amber',
  personal: 'purple',
  recurring: 'emerald',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardView() {
  const { fetchTasksByDate, fetchTasksByDateRange, createTask, toggleTaskStatus, updateTask, deleteTask, fetchOverdueTasks } = useTasks()
  const { blocks, fetchBlocks } = useFixedBlocks()
  const { subjects, fetchSubjects } = useSubjects()

  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [todayBlocks, setTodayBlocks] = useState<FixedBlock[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIsEvent, setModalIsEvent] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [overdueExpanded, setOverdueExpanded] = useState(true)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dayOfWeek = today.getDay()

  const loadData = useCallback(async () => {
    setDataLoading(true)
    const [todayData, upcomingData, overdueData] = await Promise.all([
      fetchTasksByDate(todayStr),
      fetchTasksByDateRange(
        format(addDays(today, 1), 'yyyy-MM-dd'),
        format(addDays(today, 7), 'yyyy-MM-dd')
      ),
      fetchOverdueTasks(),
      fetchBlocks(),
      fetchSubjects(),
    ])
    setTodayTasks(todayData)
    setUpcomingTasks(upcomingData.slice(0, 8))
    setOverdueTasks(overdueData)
    setDataLoading(false)
  }, [todayStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    setTodayBlocks(blocks.filter(b => b.days_of_week.includes(dayOfWeek)))
  }, [blocks, dayOfWeek])

  const subjectFor = (task: Task) =>
    task.subject_id ? subjects.find(s => s.id === task.subject_id) ?? null : null

  const handleToggle = async (task: Task) => {
    const updated = await toggleTaskStatus(task)
    if (updated) setTodayTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const handleOverdueMoveToday = async (task: Task) => {
    await updateTask(task.id, { start_date: todayStr, deadline: todayStr })
    setOverdueTasks(prev => prev.filter(t => t.id !== task.id))
    await loadData()
  }

  const handleOverdueReschedule = async (task: Task) => {
    if (!rescheduleDate) return
    await updateTask(task.id, { start_date: rescheduleDate, deadline: rescheduleDate })
    setOverdueTasks(prev => prev.filter(t => t.id !== task.id))
    setReschedulingId(null)
    setRescheduleDate('')
    await loadData()
  }

  const handleOverdueComplete = async (task: Task) => {
    await updateTask(task.id, { status: 'done' })
    setOverdueTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const handleOverdueCancel = async (task: Task) => {
    await updateTask(task.id, { status: 'cancelled' })
    setOverdueTasks(prev => prev.filter(t => t.id !== task.id))
  }

  // Stats
  const totalToday = todayTasks.length
  const doneToday  = todayTasks.filter(t => t.status === 'done').length

  const tasksByType = (['university', 'work', 'personal', 'recurring'] as TaskType[])
    .map(type => ({
      type,
      total: todayTasks.filter(t => t.type === type).length,
      done:  todayTasks.filter(t => t.type === type && t.status === 'done').length,
    }))
    .filter(s => s.total > 0)

  const blockTypeStyle = (type: string) => {
    if (type === 'university') return 'bg-blue-50 border-blue-100 text-blue-700'
    if (type === 'work') return 'bg-amber-50 border-amber-100 text-amber-700'
    return 'bg-gray-50 border-gray-100 text-gray-600'
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400 font-medium mb-1">
            {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setModalIsEvent(true); setModalOpen(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CalendarDays size={14} />
            Nuevo evento
          </button>
          <Button onClick={() => { setModalIsEvent(false); setModalOpen(true) }}>
            <Plus size={16} />
            Nueva tarea
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hoy</p>
            <CheckCircle2 size={16} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{doneToday}/{totalToday}</p>
          <p className="text-xs text-gray-400 mt-1">tareas completadas</p>
          {totalToday > 0 && (
            <ProgressBar current={doneToday} total={totalToday} color="blue" size="sm" className="mt-2" />
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Próximos 7 días</p>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{upcomingTasks.length}</p>
          <p className="text-xs text-gray-400 mt-1">tareas pendientes</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vencidas</p>
            <AlertCircle size={16} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{overdueTasks.length}</p>
          <p className="text-xs text-gray-400 mt-1">requieren atención</p>
        </div>
      </div>

      {/* Overdue tasks widget */}
      {overdueTasks.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setOverdueExpanded(prev => !prev)}
            className="flex items-center gap-2 mb-3 w-full text-left"
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-900">
                Tareas vencidas
              </h2>
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                {overdueTasks.length}
              </span>
            </div>
            <span className="text-xs text-gray-400">{overdueExpanded ? '▲' : '▼'}</span>
          </button>
          {overdueExpanded && (
            <div className="space-y-1.5">
              {overdueTasks.map(task => (
                <div
                  key={task.id}
                  className="bg-white border border-red-100 rounded-xl shadow-soft overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      <p className="text-xs text-red-400 mt-0.5">
                        Venció el {task.deadline ? format(parseISO(task.deadline), 'd MMM', { locale: es }) : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOverdueMoveToday(task)}
                        title="Mover a hoy"
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <SkipForward size={11} />
                        Hoy
                      </button>
                      <button
                        onClick={() => {
                          if (reschedulingId === task.id) {
                            setReschedulingId(null)
                            setRescheduleDate('')
                          } else {
                            setReschedulingId(task.id)
                            setRescheduleDate('')
                          }
                        }}
                        title="Reprogramar"
                        className={clsx(
                          'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition-colors',
                          reschedulingId === task.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-700'
                        )}
                      >
                        <Calendar size={11} />
                        Reprogramar
                      </button>
                      <button
                        onClick={() => handleOverdueComplete(task)}
                        title="Marcar como completada"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => handleOverdueCancel(task)}
                        title="Cancelar tarea"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {reschedulingId === task.id && (
                    <div className="px-4 py-2.5 border-t border-red-50 bg-blue-50 flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex-shrink-0">Nueva fecha:</span>
                      <input
                        type="date"
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400"
                        value={rescheduleDate}
                        onChange={e => setRescheduleDate(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={() => handleOverdueReschedule(task)}
                        disabled={!rescheduleDate}
                        className="px-2.5 py-1 text-[11px] font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => { setReschedulingId(null); setRescheduleDate('') }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Today tasks */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Tareas de hoy</h2>
            <Link
              href={`/day/${todayStr}`}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              Ver vista día →
            </Link>
          </div>

          {dataLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm text-gray-500">No hay tareas para hoy.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                + Agregar tarea
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  subject={subjectFor(task)}
                  onToggleStatus={() => handleToggle(task)}
                />
              ))}
            </div>
          )}

          {/* Today's fixed blocks */}
          {todayBlocks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Bloques fijos
              </h3>
              <div className="space-y-2">
                {todayBlocks.map(block => (
                  <div
                    key={block.id}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium',
                      blockTypeStyle(block.type)
                    )}
                  >
                    <span>{block.title}</span>
                    <span className="text-xs opacity-60 font-normal tabular-nums">
                      {block.start_time.substring(0, 5)} – {block.end_time.substring(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-6">
          {/* Area breakdown */}
          {tasksByType.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Por área</h3>
              <div className="space-y-3">
                {tasksByType.map(({ type, total, done }) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">
                        {TASK_TYPE_LABELS[type as TaskType]}
                      </span>
                      <span className="text-xs text-gray-400">{done}/{total}</span>
                    </div>
                    <ProgressBar
                      current={done}
                      total={total}
                      color={typeColorMap[type]}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming tasks */}
          {upcomingTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Próximas tareas
              </h3>
              <div className="space-y-1.5">
                {upcomingTasks.slice(0, 5).map(task => {
                  const sub = subjectFor(task)
                  return (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <span
                        className={clsx('w-2 h-2 rounded-full flex-shrink-0', TASK_TYPE_COLORS[task.type].dot)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {task.deadline && (
                            <p className="text-xs text-gray-400">
                              {format(parseISO(task.deadline), 'd MMM', { locale: es })}
                            </p>
                          )}
                          {sub && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white leading-none"
                              style={{ backgroundColor: sub.color }}
                            >
                              {sub.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDate={todayStr}
        initialIsEvent={modalIsEvent}
        onSave={async (data) => {
          await createTask(data)
          await loadData()
        }}
      />
    </div>
  )
}
