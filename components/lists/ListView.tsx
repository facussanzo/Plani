'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTasks } from '@/hooks/useTasks'
import { useSubjects } from '@/hooks/useSubjects'
import type { Task, TaskStatus, TaskFormData, Subject } from '@/lib/types'
import { SUBJECT_COLORS } from '@/lib/types'
import TaskCard from '@/components/tasks/TaskCard'
import TaskModal from '@/components/tasks/TaskModal'
import Button from '@/components/ui/Button'
import clsx from 'clsx'

type Area = 'university' | 'work' | 'personal'
type SortKey = 'deadline' | 'created' | 'name'
type FilterStatus = 'all' | TaskStatus

interface ListViewProps {
  initialTab?: Area
}

const SORT_LABELS: Record<SortKey, string> = {
  deadline: 'Fecha límite',
  created: 'Creación',
  name: 'Nombre',
}

// ------- Subject Management Panel -------
function SubjectManager({
  subjects,
  onRefresh,
}: {
  subjects: Subject[]
  onRefresh: () => void
}) {
  const { createSubject, deleteSubject } = useSubjects()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[2].value)
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await createSubject(name.trim(), color)
    setName('')
    setSaving(false)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta materia? Las tareas asociadas quedarán sin materia.')) return
    await deleteSubject(id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {/* Existing subjects */}
      {subjects.length > 0 && (
        <div className="space-y-1.5">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 group px-2 py-1.5 rounded-lg hover:bg-gray-50">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-sm text-gray-700 flex-1">{s.name}</span>
              <button
                onClick={() => handleDelete(s.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="space-y-2">
        <input
          className="input text-sm"
          placeholder="Nueva materia..."
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1 flex-wrap">
            {SUBJECT_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={clsx(
                  'w-5 h-5 rounded-full transition-transform',
                  color === c.value && 'scale-125 ring-2 ring-offset-1 ring-gray-300'
                )}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
          <Button size="sm" type="submit" loading={saving} disabled={!name.trim()}>
            <Plus size={12} />
            Agregar
          </Button>
        </div>
      </form>
    </div>
  )
}

// ------- Main Component -------
export default function ListView({ initialTab = 'university' }: ListViewProps) {
  const [area, setArea] = useState<Area>(initialTab)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null) // null = "Todas"
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortKey>('deadline')
  const [search, setSearch] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showSubjectManager, setShowSubjectManager] = useState(false)

  const { createTask, updateTask, deleteTask, toggleTaskStatus } = useTasks()
  const { subjects, fetchSubjects } = useSubjects()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('type', area)
        .order('created_at', { ascending: false })
      if (!error && data) setTasks(data as Task[])
    } finally {
      setLoading(false)
    }
  }, [area])

  const subjectFor = (task: Task) =>
    task.subject_id ? subjects.find(s => s.id === task.subject_id) ?? null : null

  useEffect(() => {
    loadTasks()
    fetchSubjects()
    setActiveSubjectId(null)
  }, [area])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...tasks]

    // Subject filter (university only)
    if (area === 'university' && activeSubjectId !== null) {
      result = result.filter(t => t.subject_id === activeSubjectId)
    }

    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      }
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      return b.created_at.localeCompare(a.created_at)
    })

    return result
  }, [tasks, area, activeSubjectId, filterStatus, search, sortBy])

  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    for (const task of filtered) {
      const key = task.category || 'General'
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    }
    return groups
  }, [filtered])

  const handleSave = async (data: TaskFormData) => {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, data)
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      const created = await createTask({ ...data, type: area })
      setTasks(prev => [created, ...prev])
    }
    setEditingTask(null)
  }

  const handleToggle = async (task: Task) => {
    const updated = await toggleTaskStatus(task)
    if (updated) {
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const totalByStatus = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  // Subjects with task counts
  const subjectsWithCount = useMemo(() =>
    subjects.map(s => ({
      ...s,
      count: tasks.filter(t => t.subject_id === s.id).length,
    })),
    [subjects, tasks]
  )

  const allTasksCount = tasks.length

  const isUniversity = area === 'university'

  return (
    <div className="p-8 flex gap-6 max-w-6xl">
      {/* Main panel */}
      <div className="flex-1 min-w-0">

        {/* Area switcher */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setArea('university')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  area === 'university' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                🎓 Universidad
              </button>
              <button
                onClick={() => setArea('work')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  area === 'work' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                💼 Trabajo
              </button>
              <button
                onClick={() => setArea('personal')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  area === 'personal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                👤 Personal
              </button>
            </div>
          </div>

          <Button
            onClick={() => { setEditingTask(null); setModalOpen(true) }}
          >
            <Plus size={16} />
            Nueva tarea
          </Button>
        </div>

        {/* Subject sub-tabs (university only) */}
        {isUniversity && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* "Todas" tab */}
              <button
                onClick={() => setActiveSubjectId(null)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  activeSubjectId === null
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                Todas
                <span className={clsx(
                  'text-xs rounded-full px-1.5 py-0.5 font-semibold',
                  activeSubjectId === null ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  {allTasksCount}
                </span>
              </button>

              {/* Subject tabs */}
              {subjectsWithCount.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSubjectId(s.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    activeSubjectId === s.id
                      ? 'text-white border-transparent'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                  style={activeSubjectId === s.id ? { backgroundColor: s.color, borderColor: s.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeSubjectId === s.id ? 'rgba(255,255,255,0.7)' : s.color }}
                  />
                  {s.name}
                  <span className={clsx(
                    'text-xs rounded-full px-1.5 py-0.5 font-semibold',
                    activeSubjectId === s.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  )}>
                    {s.count}
                  </span>
                </button>
              ))}

              {/* Manage subjects button */}
              <button
                onClick={() => setShowSubjectManager(!showSubjectManager)}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all"
              >
                {showSubjectManager ? '✕ Cerrar' : '+ Materias'}
              </button>
            </div>

            {/* Subject manager panel */}
            {showSubjectManager && (
              <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Gestionar materias
                </p>
                <SubjectManager subjects={subjects} onRefresh={fetchSubjects} />
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-40 max-w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8 text-xs"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'pending', 'in_progress', 'done'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  filterStatus === s
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {s === 'all' ? `Todas (${totalByStatus.all})`
                  : s === 'pending' ? `Pendientes (${totalByStatus.pending})`
                  : s === 'in_progress' ? `En curso (${totalByStatus.in_progress})`
                  : `Hechas (${totalByStatus.done})`}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              className="input text-xs py-1.5 pl-3 pr-7 appearance-none"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{area === 'university' ? '🎓' : area === 'work' ? '💼' : '👤'}</p>
            <p className="text-sm text-gray-500">
              {search ? 'No se encontraron tareas.' : 'No hay tareas aquí.'}
            </p>
            <button
              onClick={() => { setEditingTask(null); setModalOpen(true) }}
              className="mt-3 text-sm text-blue-500 hover:text-blue-700 font-medium"
            >
              + Agregar tarea
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, categoryTasks]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {category}
                  </span>
                  <span className="text-xs text-gray-300">({categoryTasks.length})</span>
                </div>
                <div className="space-y-2">
                  {categoryTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      subject={subjectFor(task)}
                      expandable
                      hideAreaBadge
                      onToggleStatus={() => handleToggle(task)}
                      onEdit={() => { setEditingTask(task); setModalOpen(true) }}
                      onDelete={() => handleDelete(task.id)}
                      onUpdateTask={async (updates) => {
                        const updated = await updateTask(task.id, updates)
                        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        initialTask={editingTask}
        defaultType={area === 'university' ? 'university' : area === 'work' ? 'work' : 'personal'}
        onSave={handleSave}
      />
    </div>
  )
}
