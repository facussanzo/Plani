'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addDays, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useTasks } from '@/hooks/useTasks'
import { useFixedBlocks } from '@/hooks/useFixedBlocks'
import { useSubjects } from '@/hooks/useSubjects'
import type { Task, FixedBlock, TaskFormData } from '@/lib/types'
import { TASK_TYPE_COLORS } from '@/lib/types'
import TaskItem from './TaskItem'
import TaskModal from '@/components/tasks/TaskModal'
import Button from '@/components/ui/Button'
import clsx from 'clsx'

interface DayViewProps {
  dateStr: string
}

export default function DayView({ dateStr }: DayViewProps) {
  const router = useRouter()
  const resolvedDateStr = dateStr === 'today' ? format(new Date(), 'yyyy-MM-dd') : dateStr
  const date = parseISO(resolvedDateStr)
  const dayOfWeek = date.getDay()

  const [tasks, setTasks] = useState<Task[]>([])
  const [dayBlocks, setDayBlocks] = useState<FixedBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalIsEvent, setModalIsEvent] = useState(false)

  const { fetchTasksByDate, createTask, updateTask, deleteTask, toggleTaskStatus } = useTasks()
  const { blocks, fetchBlocks } = useFixedBlocks()
  const { subjects, fetchSubjects } = useSubjects()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const orderKey = `plani_order_${resolvedDateStr}`

  const applyStoredOrder = (tasksList: Task[]): Task[] => {
    try {
      const saved = localStorage.getItem(orderKey)
      if (!saved) return tasksList
      const ids: string[] = JSON.parse(saved)
      const ordered = ids.map(id => tasksList.find(t => t.id === id)).filter(Boolean) as Task[]
      const remaining = tasksList.filter(t => !ids.includes(t.id))
      return [...ordered, ...remaining]
    } catch { return tasksList }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [data] = await Promise.all([
      fetchTasksByDate(resolvedDateStr),
      fetchBlocks(),
      fetchSubjects(),
    ])
    setTasks(applyStoredOrder(data))
    setLoading(false)
  }, [resolvedDateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setDayBlocks(blocks.filter(b => b.days_of_week.includes(dayOfWeek)))
  }, [blocks, dayOfWeek])

  // Helper: find subject for a task
  const subjectFor = (task: Task) =>
    task.subject_id ? subjects.find(s => s.id === task.subject_id) ?? null : null

  const allDayTasks = tasks.filter(t => t.is_all_day)
  const timedTasks = tasks
    .filter(t => !t.is_all_day && t.time)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const untimedTasks = tasks.filter(t => !t.is_all_day && !t.time)

  const handleToggle = async (task: Task) => {
    const updated = await toggleTaskStatus(task)
    if (updated) setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleReschedule = async (task: Task, newDate: string, newTime?: string) => {
    try {
      const updates: Partial<TaskFormData> = { start_date: newDate }
      if (newTime) {
        updates.time = newTime
        updates.is_all_day = false
      }
      await updateTask(task.id, updates)
      setTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (err) {
      console.error('[DayView] reschedule failed:', err)
    }
  }

  const handleUpdateTask = async (task: Task, updates: Partial<TaskFormData>) => {
    try {
      const updated = await updateTask(task.id, updates)
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch (err) {
      console.error('[DayView] updateTask failed:', err)
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setModalIsEvent(false)
    setModalOpen(true)
  }

  const openNew = (isEvent = false) => {
    setEditingTask(null)
    setModalIsEvent(isEvent)
    setModalOpen(true)
  }

  const handleSave = async (data: TaskFormData): Promise<Task> => {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, data)
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
      setEditingTask(null)
      return updated
    } else {
      const created = await createTask(data)
      setTasks(prev => [...prev, created])
      setEditingTask(null)
      return created
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setDraggingTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingTask(null)
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    setTasks(reordered)
    localStorage.setItem(orderKey, JSON.stringify(reordered.map(t => t.id)))
  }

  const navigateDay = (delta: number) => {
    const newDate = addDays(date, delta)
    router.push(`/day/${format(newDate, 'yyyy-MM-dd')}`)
  }

  const isTodayDate = isToday(date)

  const blockStyle = (block: FixedBlock): { cls: string; style?: React.CSSProperties } => {
    if (block.subject_id) {
      const sub = subjects.find(s => s.id === block.subject_id)
      if (sub) return { cls: 'bg-white border-gray-100 text-gray-800 border-l-[3px]', style: { borderLeftColor: sub.color } }
    }
    if (block.type === 'university') return { cls: 'bg-blue-50 border-blue-100 text-blue-700' }
    if (block.type === 'work') return { cls: 'bg-amber-50 border-amber-100 text-amber-700' }
    if (block.type === 'personal') return { cls: 'bg-purple-50 border-purple-100 text-purple-700' }
    return { cls: 'bg-gray-50 border-gray-100 text-gray-600' }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={() => navigateDay(-1)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 capitalize">
                {format(date, "EEEE, d 'de' MMMM", { locale: es })}
              </h1>
              {isTodayDate && (
                <span className="text-xs font-semibold bg-gray-900 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                  Hoy
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
            </p>
          </div>
          <button
            onClick={() => navigateDay(1)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => router.push('/calendar')} className="hidden sm:inline-flex">
            <CalendarDays size={14} />
            Calendario
          </Button>
          <button
            onClick={() => openNew(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CalendarDays size={13} />
            Nuevo evento
          </button>
          <button
            onClick={() => openNew(false)}
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva tarea</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Fixed blocks */}
          {dayBlocks.length > 0 && (
            <div className="mb-6">
              <p className="section-title">Bloques fijos</p>
              <div className="space-y-2">
                {dayBlocks.map(block => {
                  const bs = blockStyle(block)
                  return (
                    <div
                      key={block.id}
                      className={clsx(
                        'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium',
                        bs.cls
                      )}
                      style={bs.style}
                    >
                      <span className="font-semibold">{block.title}</span>
                      <span className="text-xs opacity-60 font-normal tabular-nums">
                        {block.start_time.substring(0, 5)} – {block.end_time.substring(0, 5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All-day tasks */}
          {allDayTasks.length > 0 && (
            <div className="mb-6">
              <p className="section-title">Todo el día</p>
              <SortableContext items={allDayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {allDayTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      subject={subjectFor(task)}
                      onEdit={() => handleEdit(task)}
                      onDelete={() => handleDelete(task.id)}
                      onToggleStatus={() => handleToggle(task)}
                      onReschedule={(date, time) => handleReschedule(task, date, time)}
                      onUpdateTask={(updates) => handleUpdateTask(task, updates)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}

          {/* Timed tasks */}
          {timedTasks.length > 0 && (
            <div className="mb-6">
              <p className="section-title">Con horario</p>
              <SortableContext items={timedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {timedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      subject={subjectFor(task)}
                      onEdit={() => handleEdit(task)}
                      onDelete={() => handleDelete(task.id)}
                      onToggleStatus={() => handleToggle(task)}
                      onReschedule={(date, time) => handleReschedule(task, date, time)}
                      onUpdateTask={(updates) => handleUpdateTask(task, updates)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}

          {/* Untimed tasks */}
          {untimedTasks.length > 0 && (
            <div className="mb-6">
              <p className="section-title">Sin horario</p>
              <SortableContext items={untimedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {untimedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      subject={subjectFor(task)}
                      onEdit={() => handleEdit(task)}
                      onDelete={() => handleDelete(task.id)}
                      onToggleStatus={() => handleToggle(task)}
                      onReschedule={(date, time) => handleReschedule(task, date, time)}
                      onUpdateTask={(updates) => handleUpdateTask(task, updates)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm font-medium text-gray-500">No hay tareas para este día.</p>
              <button
                onClick={() => openNew(false)}
                className="mt-3 text-sm text-blue-500 hover:text-blue-700 font-medium"
              >
                + Agregar una tarea
              </button>
            </div>
          )}

          <DragOverlay>
            {draggingTask && (
              <div
                className={clsx(
                  'px-3 py-2 rounded-xl text-sm font-medium shadow-xl cursor-grabbing border-l-4',
                  TASK_TYPE_COLORS[draggingTask.type].bg,
                  TASK_TYPE_COLORS[draggingTask.type].text,
                )}
              >
                {draggingTask.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        initialTask={editingTask}
        initialDate={resolvedDateStr}
        initialIsEvent={modalIsEvent}
        onSave={handleSave}
      />
    </div>
  )
}
