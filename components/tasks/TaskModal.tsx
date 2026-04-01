'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  format, parseISO, eachDayOfInterval,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Check, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, X, CalendarDays } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useSubjects } from '@/hooks/useSubjects'
import { useAreaTags } from '@/hooks/useAreaTags'
import { useSubtasks } from '@/hooks/useSubtasks'
import type { Task, TaskStatus, TaskFormData } from '@/lib/types'
import { SUBJECT_COLORS, TAG_PASTEL_COLORS } from '@/lib/types'
import clsx from 'clsx'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TaskFormData) => Promise<Task | void>
  initialTask?: Task | null
  initialDate?: string
  initialTitle?: string
  initialIsEvent?: boolean
  defaultType?: 'university' | 'work' | 'personal'
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  type: 'university',
  category: '',
  subject_id: null,
  deadline: '',
  start_date: '',
  end_date: '',
  is_all_day: true,
  time: '',
  progress_current: 0,
  progress_total: 0,
  is_recurring: false,
  recurring_pattern: '',
  status: 'pending',
  is_event: false,
  tag_ids: [],
}

const UI_TYPES = [
  { value: 'university' as const, label: 'Universidad', active: 'border-blue-400 bg-blue-50 text-blue-700',     dot: 'bg-blue-500'   },
  { value: 'work' as const,       label: 'Trabajo',     active: 'border-amber-400 bg-amber-50 text-amber-700',  dot: 'bg-amber-500'  },
  { value: 'personal' as const,   label: 'Personal',    active: 'border-purple-400 bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
]

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending',     label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done',        label: 'Completada' },
  { value: 'cancelled',   label: 'Cancelada' },
]

const RECURRING_PATTERNS = [
  { value: 'daily',   label: 'Cada día',    desc: 'Se repite todos los días' },
  { value: 'weekly',  label: 'Cada semana', desc: 'Mismo día cada semana' },
  { value: 'monthly', label: 'Cada mes',    desc: 'Mismo día cada mes' },
]

// ──────────────────────────────────────────
// Inline subject creation form
// ──────────────────────────────────────────
function NewSubjectForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { createSubject } = useSubjects()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[1].value)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    const subject = await createSubject(name.trim(), color)
    setSaving(false)
    if (subject) {
      setName('')
      onCreated(subject.id)
    }
  }

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nueva materia</p>
      <input
        className="input text-sm"
        placeholder="Nombre de la materia..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          {SUBJECT_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={clsx(
                'w-5 h-5 rounded-full transition-all',
                color === c.value ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
        <Button size="sm" type="button" onClick={handleCreate} loading={saving} disabled={!name.trim()}>
          Crear
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Toggle checkbox component
// ──────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left"
    >
      <div
        className={clsx(
          'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white'
        )}
      >
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </button>
  )
}

// ──────────────────────────────────────────
// Tags selector
// ──────────────────────────────────────────
function TagsSelector({
  area,
  selectedIds,
  onChange,
}: {
  area: 'university' | 'work' | 'general' | 'personal'
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const { tags, loading, fetchTags, createTag } = useAreaTags()
  const [newTagName, setNewTagName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newTagColor, setNewTagColor] = useState(TAG_PASTEL_COLORS[5].value)

  useEffect(() => {
    fetchTags(area)
  }, [area]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(i => i !== id)
        : [...selectedIds, id]
    )
  }

  const handleCreate = async () => {
    if (!newTagName.trim()) return
    const tag = await createTag(newTagName.trim(), area, newTagColor)
    if (tag) {
      onChange([...selectedIds, tag.id])
      setNewTagName('')
      setShowNew(false)
    }
  }

  if (loading) return <div className="text-xs text-gray-400">Cargando etiquetas...</div>

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
              selectedIds.includes(tag.id)
                ? 'text-white border-transparent'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
            )}
            style={selectedIds.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
          >
            {tag.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="px-2 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all"
        >
          + Nueva
        </button>
      </div>
      {showNew && (
        <div className="space-y-2">
          <input
            className="input text-xs py-1.5"
            placeholder="Nombre de la etiqueta..."
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-wrap flex-1">
              {TAG_PASTEL_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewTagColor(c.value)}
                  className={clsx(
                    'w-5 h-5 rounded-full transition-all',
                    newTagColor === c.value ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors"
            >
              Crear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// Subtasks section (only for existing tasks)
// ──────────────────────────────────────────
function SubtasksSection({ taskId }: { taskId: string }) {
  const { subtasks, loading, fetchSubtasks, createSubtask, toggleSubtask, deleteSubtask } = useSubtasks()
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    fetchSubtasks(taskId)
  }, [taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    await createSubtask(taskId, newTitle.trim(), newDate || undefined)
    setNewTitle('')
    setNewDate('')
  }

  const doneCount = subtasks.filter(s => s.is_done).length

  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Subtareas {subtasks.length > 0 && `(${doneCount}/${subtasks.length})`}
        </p>
        {subtasks.length > 0 && (
          <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-800 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((doneCount / subtasks.length) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-1">
          {subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => toggleSubtask(sub)}
                className={clsx(
                  'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  sub.is_done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gray-500'
                )}
              >
                {sub.is_done && <Check size={9} className="text-white" strokeWidth={3} />}
              </button>
              <span className={clsx('text-sm flex-1', sub.is_done && 'line-through text-gray-400')}>
                {sub.title}
              </span>
              {sub.date && (
                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {sub.date}
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteSubtask(sub.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2">
          <input
            className="input text-xs py-1.5 flex-1"
            placeholder="Agregar subtarea..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
        {newTitle.trim() && (
          <div className="flex items-center gap-1.5 pl-1">
            <CalendarDays size={11} className="text-gray-300 flex-shrink-0" />
            <input
              type="date"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-gray-400 text-gray-500"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              placeholder="Fecha (opcional)"
            />
            <span className="text-[10px] text-gray-300">fecha en DayView (opcional)</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Main modal
// ──────────────────────────────────────────
export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  initialDate,
  initialTitle,
  initialIsEvent = false,
  defaultType = 'university',
}: TaskModalProps) {
  const [form, setForm] = useState<TaskFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [hasProgress, setHasProgress] = useState(false)

  const { createSubtask: createPendingSubtask } = useSubtasks()
  const [pendingSubtasks, setPendingSubtasks] = useState<{title: string; date: string}[]>([])
  const [newPendingSub, setNewPendingSub] = useState('')
  const [newPendingSubDate, setNewPendingSubDate] = useState('')

  // Multi-fecha state
  const [multiEnabled, setMultiEnabled] = useState(false)
  const [multiMode, setMultiMode] = useState<'range' | 'specific'>('range')
  const [multiRangeStart, setMultiRangeStart] = useState('')
  const [multiRangeEnd, setMultiRangeEnd] = useState('')
  const [multiSpecificDates, setMultiSpecificDates] = useState<string[]>([])
  const [miniCalMonth, setMiniCalMonth] = useState(new Date())

  const { subjects, fetchSubjects } = useSubjects()

  useEffect(() => {
    if (isOpen) {
      fetchSubjects()
      if (initialTask) {
        const taskHasProgress = initialTask.progress_total > 0
        setHasProgress(taskHasProgress)
        setForm({
          title: initialTask.title,
          description: initialTask.description ?? '',
          type: initialTask.type,
          category: initialTask.category ?? '',
          subject_id: initialTask.subject_id ?? null,
          deadline: initialTask.deadline ?? '',
          start_date: initialTask.start_date ?? '',
          end_date: initialTask.end_date ?? '',
          is_all_day: initialTask.is_all_day,
          time: initialTask.time ?? '',
          progress_current: initialTask.progress_current,
          progress_total: initialTask.progress_total,
          is_recurring: initialTask.is_recurring,
          recurring_pattern: initialTask.recurring_pattern ?? '',
          status: initialTask.status,
          is_event: initialTask.is_event ?? false,
          tag_ids: initialTask.tag_ids ?? [],
        })
      } else {
        setForm({
          ...defaultFormData,
          type: defaultType,
          start_date: initialDate ?? '',
          title: initialTitle ?? '',
          is_event: initialIsEvent,
        })
        setHasProgress(false)
      }
      setError(null)
      setShowNewSubject(false)
      setPendingSubtasks([])
      setNewPendingSub('')
      setNewPendingSubDate('')
      setMultiEnabled(false)
      setMultiMode('range')
      setMultiRangeStart('')
      setMultiRangeEnd('')
      setMultiSpecificDates([])
      setMiniCalMonth(new Date())
    }
  }, [isOpen, initialTask, initialDate, initialTitle, defaultType, initialIsEvent])

  const update = <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // Computed multi-fecha dates
  const multiSelectedDates: string[] = useMemo(() => {
    if (!multiEnabled) return []
    if (multiMode === 'range' && multiRangeStart && multiRangeEnd) {
      try {
        const start = parseISO(multiRangeStart)
        const end = parseISO(multiRangeEnd)
        if (end < start) return []
        return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'))
      } catch { return [] }
    }
    if (multiMode === 'specific') return multiSpecificDates.slice().sort()
    return []
  }, [multiEnabled, multiMode, multiRangeStart, multiRangeEnd, multiSpecificDates])

  const toggleSpecificDate = (dateStr: string) => {
    setMultiSpecificDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    )
  }

  const handleProgressToggle = (enabled: boolean) => {
    setHasProgress(enabled)
    if (!enabled) {
      update('progress_current', 0)
      update('progress_total', 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio.'); return }
    if (form.is_recurring && !form.recurring_pattern) { setError('Seleccioná el patrón de recurrencia.'); return }
    if (form.is_recurring && (!form.start_date || !form.deadline)) { setError('Las tareas recurrentes requieren fecha de inicio y fin del período.'); return }
    if (multiEnabled && multiSelectedDates.length === 0) { setError('Seleccioná al menos una fecha para la repetición.'); return }
    setSaving(true)
    setError(null)
    try {
      const dataToSave = hasProgress
        ? form
        : { ...form, progress_current: 0, progress_total: 0 }

      if (multiEnabled && multiSelectedDates.length > 0) {
        const groupId = crypto.randomUUID()
        for (const date of multiSelectedDates) {
          await onSave({ ...dataToSave, start_date: date, deadline: date, group_id: groupId })
        }
      } else {
        const result = await onSave(dataToSave)
        // Create pending subtasks for newly created task
        if (result && !initialTask && pendingSubtasks.length > 0) {
          for (const sub of pendingSubtasks) {
            await createPendingSubtask(result.id, sub.title, sub.date || undefined)
          }
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la tarea.')
    } finally {
      setSaving(false)
    }
  }

  const selectedSubject = subjects.find(s => s.id === form.subject_id)

  const progressPct = form.progress_total > 0
    ? Math.round((form.progress_current / form.progress_total) * 100)
    : 0

  const tagsArea: 'university' | 'work' | 'general' | 'personal' =
    form.type === 'university' ? 'university' :
    form.type === 'work' ? 'work' :
    form.type === 'personal' ? 'personal' : 'general'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? 'Editar tarea' : form.is_event ? 'Nuevo evento' : 'Nueva tarea'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Event toggle (prominent at top for new items) ── */}
        {!initialTask && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <button
              type="button"
              onClick={() => update('is_event', !form.is_event)}
              className={clsx(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
                form.is_event ? 'bg-gray-900' : 'bg-gray-300'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                  form.is_event ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">Es un evento</p>
              <p className="text-xs text-gray-400">Los eventos se muestran en el calendario con fondo sólido</p>
            </div>
          </div>
        )}

        {/* ── Title ── */}
        <div>
          <label className="label">Título *</label>
          <input
            className="input"
            type="text"
            placeholder={form.is_event ? '¿Qué evento es?' : '¿Qué hay que hacer?'}
            value={form.title}
            onChange={e => update('title', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (form.title.trim()) handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            autoFocus
          />
        </div>

        {/* ── Area / Type ── */}
        <div>
          <label className="label">Área</label>
          <div className="grid grid-cols-3 gap-2">
            {UI_TYPES.map(({ value, label, active, dot }) => (
              <button
                key={value}
                type="button"
                onClick={() => { update('type', value); update('tag_ids', []) }}
                className={clsx(
                  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all',
                  form.type === value
                    ? active
                    : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full', form.type === value ? dot : 'bg-gray-300')} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Subject selector (university only) ── */}
        {form.type === 'university' && (
          <div>
            <label className="label">Materia</label>
            {subjects.length === 0 && !showNewSubject ? (
              <button
                type="button"
                onClick={() => setShowNewSubject(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-blue-300 text-sm text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Plus size={14} />
                Crear primera materia
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <select
                    className="input appearance-none pr-8"
                    value={form.subject_id ?? ''}
                    onChange={e => update('subject_id', e.target.value || null)}
                  >
                    <option value="">Sin materia</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    {selectedSubject && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedSubject.color }} />
                    )}
                    <ChevronDown size={12} className="text-gray-400" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewSubject(!showNewSubject)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus size={11} />
                  Nueva materia
                </button>
              </div>
            )}
            {showNewSubject && (
              <NewSubjectForm
                onCreated={(id) => {
                  update('subject_id', id)
                  setShowNewSubject(false)
                  fetchSubjects()
                }}
              />
            )}
          </div>
        )}

        {/* ── Area tags ── */}
        {form.type !== 'recurring' && (
          <div>
            <label className="label">Etiquetas</label>
            <TagsSelector
              area={tagsArea}
              selectedIds={form.tag_ids ?? []}
              onChange={ids => update('tag_ids', ids)}
            />
          </div>
        )}

        {/* ── Description ── */}
        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Detalles opcionales..."
            value={form.description ?? ''}
            onChange={e => update('description', e.target.value)}
          />
        </div>

        {/* ── Dates ── */}
        <div className="space-y-1.5">
          {form.is_recurring && (
            <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              Rango de recurrencia: la tarea se repetirá entre estas fechas.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{form.is_recurring ? 'Inicio recurrencia *' : 'Fecha inicio'}</label>
              <input className="input" type="date" value={form.start_date ?? ''}
                onChange={e => update('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">{form.is_recurring ? 'Fin recurrencia *' : 'Fecha límite'}</label>
              <input className="input" type="date" value={form.deadline ?? ''}
                onChange={e => update('deadline', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Time + Status ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Hora</label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-gray-300"
                  checked={form.is_all_day}
                  onChange={e => update('is_all_day', e.target.checked)}
                />
                <span className="text-xs text-gray-500">Todo el día</span>
              </label>
            </div>
            <input
              className="input disabled:opacity-40 disabled:cursor-not-allowed"
              type="time"
              value={form.time ?? ''}
              onChange={e => update('time', e.target.value)}
              disabled={form.is_all_day}
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.status}
              onChange={e => update('status', e.target.value as TaskStatus)}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Multi-fecha (only for new tasks) ── */}
        {!initialTask && (
          <div className="border border-gray-100 rounded-xl p-3 space-y-3">
            <Toggle
              checked={multiEnabled}
              onChange={setMultiEnabled}
              label="Repetir en múltiples fechas"
              description="Crea instancias independientes de esta tarea en varios días"
            />

            {multiEnabled && (
              <div className="ml-7 space-y-3">
                {/* Mode selector */}
                <div className="flex items-center gap-2">
                  {(['range', 'specific'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setMultiMode(mode)}
                      className={clsx(
                        'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        multiMode === mode
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {mode === 'range' ? 'Rango continuo' : 'Días específicos'}
                    </button>
                  ))}
                </div>

                {multiMode === 'range' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Desde</label>
                        <input className="input" type="date" value={multiRangeStart}
                          onChange={e => setMultiRangeStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Hasta</label>
                        <input className="input" type="date" value={multiRangeEnd}
                          onChange={e => setMultiRangeEnd(e.target.value)} />
                      </div>
                    </div>
                    {multiSelectedDates.length > 0 && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        Se crearán <strong>{multiSelectedDates.length}</strong> tareas independientes
                      </p>
                    )}
                  </div>
                )}

                {multiMode === 'specific' && (
                  <div className="space-y-2">
                    {/* Mini calendar */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Month nav */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <button
                          type="button"
                          onClick={() => setMiniCalMonth(prev => subMonths(prev, 1))}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-gray-700 capitalize">
                          {format(miniCalMonth, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMiniCalMonth(prev => addMonths(prev, 1))}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      {/* Grid */}
                      <div className="p-2">
                        <div className="grid grid-cols-7 mb-1">
                          {['L','M','X','J','V','S','D'].map(d => (
                            <div key={d} className="text-[10px] text-center text-gray-400 font-semibold py-0.5">
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {(() => {
                            const monthStart = startOfMonth(miniCalMonth)
                            const monthEnd = endOfMonth(miniCalMonth)
                            const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
                            const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
                            const days = eachDayOfInterval({ start: calStart, end: calEnd })
                            return days.map(day => {
                              const dayStr = format(day, 'yyyy-MM-dd')
                              const inMonth = isSameMonth(day, miniCalMonth)
                              const selected = multiSpecificDates.includes(dayStr)
                              return (
                                <button
                                  key={dayStr}
                                  type="button"
                                  onClick={() => toggleSpecificDate(dayStr)}
                                  className={clsx(
                                    'text-[11px] rounded-md py-1 font-medium transition-all',
                                    !inMonth && 'opacity-30',
                                    selected
                                      ? 'bg-gray-900 text-white'
                                      : inMonth
                                        ? 'hover:bg-gray-100 text-gray-700'
                                        : 'text-gray-400'
                                  )}
                                >
                                  {format(day, 'd')}
                                </button>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    </div>
                    {multiSpecificDates.length > 0 && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        {multiSpecificDates.length} día{multiSpecificDates.length !== 1 ? 's' : ''} seleccionado{multiSpecificDates.length !== 1 ? 's' : ''}
                        {' — '}Se crearán <strong>{multiSpecificDates.length}</strong> tareas
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Subtasks (editing existing tasks only) ── */}
        {initialTask && (
          <SubtasksSection taskId={initialTask.id} />
        )}

        {/* ── Pending subtasks (new task only) ── */}
        {!initialTask && (
          <div className="border border-gray-100 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Subtareas {pendingSubtasks.length > 0 && `(${pendingSubtasks.length})`}
            </p>
            {pendingSubtasks.length > 0 && (
              <div className="space-y-1">
                {pendingSubtasks.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs flex-1 text-gray-700">{sub.title}</span>
                    {sub.date && (
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">
                        {sub.date}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingSubtasks(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  className="input text-xs py-1.5 flex-1"
                  placeholder="Agregar subtarea..."
                  value={newPendingSub}
                  onChange={e => setNewPendingSub(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newPendingSub.trim()) {
                        setPendingSubtasks(prev => [...prev, { title: newPendingSub.trim(), date: newPendingSubDate }])
                        setNewPendingSub('')
                        setNewPendingSubDate('')
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!newPendingSub.trim()}
                  onClick={() => {
                    if (!newPendingSub.trim()) return
                    setPendingSubtasks(prev => [...prev, { title: newPendingSub.trim(), date: newPendingSubDate }])
                    setNewPendingSub('')
                    setNewPendingSubDate('')
                  }}
                  className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <Plus size={13} />
                </button>
              </div>
              {newPendingSub.trim() && (
                <div className="flex items-center gap-1.5 pl-1">
                  <CalendarDays size={11} className="text-gray-300 flex-shrink-0" />
                  <input
                    type="date"
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-gray-400 text-gray-500"
                    value={newPendingSubDate}
                    onChange={e => setNewPendingSubDate(e.target.value)}
                  />
                  <span className="text-[10px] text-gray-300">fecha opcional</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Progress ── */}
        <div className="border border-gray-100 rounded-xl p-3 space-y-3">
          <Toggle
            checked={hasProgress}
            onChange={handleProgressToggle}
            label="Habilitar progreso"
            description="Trackea avance en esta tarea (ej: páginas, items, pasos)"
          />

          {hasProgress && (
            <div className="ml-7 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Completado</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={form.progress_total || undefined}
                    placeholder="0"
                    value={form.progress_current || ''}
                    onChange={e => update('progress_current', Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className="label">Total</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    placeholder="10"
                    value={form.progress_total || ''}
                    onChange={e => update('progress_total', Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>
              {form.progress_total > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{form.progress_current} / {form.progress_total}</span>
                    <span className="text-xs font-semibold text-gray-700">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Recurring ── */}
        <div className="border border-gray-100 rounded-xl p-3 space-y-3">
          <Toggle
            checked={form.is_recurring}
            onChange={(v) => {
              update('is_recurring', v)
              if (!v) update('recurring_pattern', '')
            }}
            label="Tarea recurrente"
            description="Se repite automáticamente según el patrón"
          />

          {form.is_recurring && (
            <div className="ml-7 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {RECURRING_PATTERNS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => update('recurring_pattern', p.value)}
                    className={clsx(
                      'px-2.5 py-2 rounded-xl border text-xs font-medium transition-all text-center',
                      form.recurring_pattern === p.value
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>

              {form.recurring_pattern && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg text-xs text-emerald-700">
                  <RefreshCw size={11} />
                  <span>
                    {form.recurring_pattern === 'daily' ? 'Todos los días' :
                     form.recurring_pattern === 'weekly' ? 'Cada semana el mismo día' :
                     'Cada mes el mismo día'}
                    {!form.is_all_day && form.time ? ` a las ${form.time.substring(0, 5)}` : ', todo el día'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
            {error}
          </p>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {initialTask ? 'Guardar cambios'
              : multiEnabled && multiSelectedDates.length > 0
                ? `Crear ${multiSelectedDates.length} tareas`
                : form.is_event ? 'Crear evento' : 'Crear tarea'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
