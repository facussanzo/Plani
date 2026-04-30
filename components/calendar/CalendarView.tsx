'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addMonths, subMonths, parseISO, isSameDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, SunMedium, Layers } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useTasks } from '@/hooks/useTasks'
import { useFixedBlocks } from '@/hooks/useFixedBlocks'
import { useSubjects } from '@/hooks/useSubjects'
import type { Task, Subject } from '@/lib/types'
import { TASK_TYPE_COLORS } from '@/lib/types'
import DayCell from './DayCell'
import TaskModal from '@/components/tasks/TaskModal'
import clsx from 'clsx'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type AreaFilter = 'general' | 'university' | 'work' | 'personal'

const AREA_FILTERS: { value: AreaFilter; label: string }[] = [
  { value: 'general',    label: 'General'     },
  { value: 'university', label: 'Universidad' },
  { value: 'work',       label: 'Trabajo'     },
  { value: 'personal',   label: 'Personal'    },
]

const FREE_DAYS_KEY = 'plani_free_days'
const SHOW_BLOCKS_KEY = 'plani_cal_show_blocks'

function loadFreeDays(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(FREE_DAYS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

function saveFreeDays(days: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FREE_DAYS_KEY, JSON.stringify(Array.from(days)))
}

export default function CalendarView() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<string>('')
  const [modalIsEvent, setModalIsEvent] = useState(false)
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('general')
  const [freeDays, setFreeDays] = useState<Set<string>>(new Set())
  const [freeMode, setFreeMode] = useState(false)
  const [showBlocks, setShowBlocks] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(SHOW_BLOCKS_KEY)
    return stored === null ? true : stored === 'true'
  })

  const { fetchTasksByDateRange, updateTask, createTask } = useTasks()
  const { blocks, fetchBlocks } = useFixedBlocks()
  const { subjects, fetchSubjects } = useSubjects()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Load free days from localStorage on mount
  useEffect(() => {
    setFreeDays(loadFreeDays())
  }, [])

  const loadTasks = useCallback(async () => {
    const start = format(calStart, 'yyyy-MM-dd')
    const end = format(calEnd, 'yyyy-MM-dd')
    const data = await fetchTasksByDateRange(start, end)
    setAllTasks(data)
  }, [currentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTasks()
    fetchBlocks()
    fetchSubjects()
  }, [currentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFreeDay = (dateStr: string) => {
    setFreeDays(prev => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      saveFreeDays(next)
      return next
    })
  }

  const filterTask = (task: Task): boolean => {
    if (areaFilter === 'general') return true
    return task.type === areaFilter
  }

  const filterBlock = (block: { type: string }): boolean => {
    if (areaFilter === 'general') return true
    return block.type === areaFilter
  }

  const getTasksForDay = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return allTasks.filter(t => {
      if (!filterTask(t)) return false
      return t.start_date === dateStr || t.deadline === dateStr
    })
  }

  const getBlocksForDay = (date: Date) => {
    const dayOfWeek = date.getDay()
    return blocks.filter(b => b.days_of_week.includes(dayOfWeek) && filterBlock(b))
  }

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (freeMode) {
      toggleFreeDay(dateStr)
      return
    }
    setSelectedDate(date)
    router.push(`/day/${dateStr}`)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find(t => t.id === event.active.id)
    if (task) setDraggingTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingTask(null)
    if (!over || active.id === over.id) return

    const task = allTasks.find(t => t.id === active.id)
    if (!task) return

    const newDateStr = over.id as string
    if (task.start_date === newDateStr) return

    try {
      const updated = await updateTask(task.id, { start_date: newDateStr })
      setAllTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } catch (err) {
      console.error('[CalendarView] drag update failed:', err)
    }
  }

  const openNewTask = (date: Date, isEvent = false) => {
    setModalDate(format(date, 'yyyy-MM-dd'))
    setModalIsEvent(isEvent)
    setModalOpen(true)
  }

  const numWeeks = calDays.length / 7

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Month nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-base font-bold text-gray-900 capitalize min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h1>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            Hoy
          </button>

          {/* Area filter */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {AREA_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAreaFilter(value)}
                className={clsx(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                  areaFilter === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Toggle fixed blocks */}
          <button
            onClick={() => {
              const next = !showBlocks
              setShowBlocks(next)
              localStorage.setItem(SHOW_BLOCKS_KEY, String(next))
            }}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              showBlocks
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
            title="Mostrar/ocultar bloques fijos"
          >
            <Layers size={13} />
            Bloques
          </button>

          {/* Free day mode toggle */}
          <button
            onClick={() => setFreeMode(prev => !prev)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              freeMode
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
            title="Marcar días libres (fines de semana, feriados)"
          >
            <SunMedium size={13} />
            {freeMode ? 'Salir: Días libres' : 'Días libres'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewTask(new Date(), true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CalendarDays size={13} />
            Nuevo evento
          </button>
          <button
            onClick={() => openNewTask(new Date(), false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={13} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white flex-shrink-0">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-1.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="grid grid-cols-7 h-full border-l border-gray-100"
            style={{ gridTemplateRows: `repeat(${numWeeks}, 1fr)` }}
          >
            {calDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const dayTasks = getTasksForDay(day)
              const dayBlocks = getBlocksForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const isFreeDay = freeDays.has(dayStr)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <DayCell
                  key={dayStr}
                  date={day}
                  dateStr={dayStr}
                  tasks={dayTasks}
                  blocks={showBlocks ? dayBlocks : []}
                  subjects={subjects}
                  isCurrentMonth={inMonth}
                  isToday={isToday(day)}
                  isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
                  isFreeDay={isFreeDay}
                  isWeekend={isWeekend}
                  freeMode={freeMode}
                  onClick={() => handleDayClick(day)}
                />
              )
            })}
          </div>

          <DragOverlay>
            {draggingTask && (
              <div
                className={clsx(
                  'px-2 py-1.5 rounded-lg text-xs font-medium shadow-lg cursor-grabbing opacity-90',
                  TASK_TYPE_COLORS[draggingTask.type].bg,
                  TASK_TYPE_COLORS[draggingTask.type].text
                )}
              >
                {draggingTask.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDate={modalDate}
        initialIsEvent={modalIsEvent}
        onSave={async (data) => {
          await createTask(data)
          await loadTasks()
        }}
      />
    </div>
  )
}
