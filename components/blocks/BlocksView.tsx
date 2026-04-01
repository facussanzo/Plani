'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Clock, BookOpen, Briefcase, LayoutGrid, ChevronDown, User } from 'lucide-react'
import { useFixedBlocks } from '@/hooks/useFixedBlocks'
import { useSubjects } from '@/hooks/useSubjects'
import type { FixedBlock } from '@/lib/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import clsx from 'clsx'

const DAYS = [
  { label: 'Domingo',   short: 'Dom', letter: 'D', value: 0 },
  { label: 'Lunes',     short: 'Lun', letter: 'L', value: 1 },
  { label: 'Martes',    short: 'Mar', letter: 'M', value: 2 },
  { label: 'Miércoles', short: 'Mié', letter: 'X', value: 3 },
  { label: 'Jueves',    short: 'Jue', letter: 'J', value: 4 },
  { label: 'Viernes',   short: 'Vie', letter: 'V', value: 5 },
  { label: 'Sábado',    short: 'Sáb', letter: 'S', value: 6 },
]

const BLOCK_TYPES = [
  {
    value: 'university' as const,
    label: 'Universidad',
    icon: BookOpen,
    active: 'border-blue-400 bg-blue-50 text-blue-700',
    card: 'bg-blue-500',
    light: 'bg-blue-50 border-blue-200 text-blue-700',
    grid: 'bg-blue-100 text-blue-800 border-l-2 border-blue-400',
  },
  {
    value: 'work' as const,
    label: 'Trabajo',
    icon: Briefcase,
    active: 'border-amber-400 bg-amber-50 text-amber-700',
    card: 'bg-amber-500',
    light: 'bg-amber-50 border-amber-200 text-amber-700',
    grid: 'bg-amber-100 text-amber-800 border-l-2 border-amber-400',
  },
  {
    value: 'personal' as const,
    label: 'Personal',
    icon: User,
    active: 'border-purple-400 bg-purple-50 text-purple-700',
    card: 'bg-purple-500',
    light: 'bg-purple-50 border-purple-200 text-purple-700',
    grid: 'bg-purple-100 text-purple-800 border-l-2 border-purple-400',
  },
  {
    value: 'other' as const,
    label: 'Otro',
    icon: LayoutGrid,
    active: 'border-gray-400 bg-gray-100 text-gray-700',
    card: 'bg-gray-500',
    light: 'bg-gray-50 border-gray-200 text-gray-600',
    grid: 'bg-gray-100 text-gray-700 border-l-2 border-gray-400',
  },
]

interface BlockFormData {
  title: string
  start_time: string
  end_time: string
  days_of_week: number[]
  type: 'work' | 'university' | 'personal' | 'other'
  subject_id: string | null
}

const defaultForm: BlockFormData = {
  title: '',
  start_time: '',
  end_time: '',
  days_of_week: [],
  type: 'university',
  subject_id: null,
}

const GRID_START = 8   // 08:00
const GRID_END   = 23  // 23:00
const GRID_HOURS = GRID_END - GRID_START
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon → Sun

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function blockPosition(block: FixedBlock) {
  const start   = timeToMinutes(block.start_time) - GRID_START * 60
  const end     = timeToMinutes(block.end_time)   - GRID_START * 60
  const total   = GRID_HOURS * 60
  const top     = (start / total) * 100
  const height  = Math.max(((end - start) / total) * 100, 2.5)
  return { top: `${top}%`, height: `${height}%` }
}

function durationLabel(block: FixedBlock) {
  const mins = timeToMinutes(block.end_time) - timeToMinutes(block.start_time)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

export default function BlocksView() {
  const { blocks, loading, fetchBlocks, createBlock, updateBlock, deleteBlock } = useFixedBlocks()
  const { subjects, fetchSubjects } = useSubjects()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<FixedBlock | null>(null)
  const [form, setForm] = useState<BlockFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBlocks()
    fetchSubjects()
  }, [fetchBlocks, fetchSubjects])

  const openNew = () => {
    setEditingBlock(null)
    setForm(defaultForm)
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (block: FixedBlock) => {
    setEditingBlock(block)
    setForm({
      title: block.title,
      start_time: block.start_time,
      end_time: block.end_time,
      days_of_week: block.days_of_week,
      type: block.type,
      subject_id: block.subject_id ?? null,
    })
    setError(null)
    setModalOpen(true)
  }

  const toggleDay = (day: number) =>
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort(),
    }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim())              { setError('El título es obligatorio.'); return }
    if (!form.start_time)                { setError('La hora de inicio es obligatoria.'); return }
    if (!form.end_time)                  { setError('La hora de fin es obligatoria.'); return }
    if (form.days_of_week.length === 0)  { setError('Selecciona al menos un día.'); return }
    if (form.end_time <= form.start_time) { setError('La hora de fin debe ser posterior al inicio.'); return }

    setSaving(true)
    setError(null)
    try {
      editingBlock
        ? await updateBlock(editingBlock.id, form)
        : await createBlock(form)
      setModalOpen(false)
    } catch {
      setError('Error al guardar el bloque.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este bloque fijo?')) return
    await deleteBlock(id)
  }

  const getTypeConfig = (type: string) =>
    BLOCK_TYPES.find(t => t.value === type) ?? BLOCK_TYPES[2]

  const hourLabels = Array.from({ length: GRID_HOURS + 1 }, (_, i) => GRID_START + i)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900">Bloques fijos</h1>
          <p className="text-xs text-gray-400">Horarios recurrentes que dan contexto a tu semana</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} />
          Nuevo bloque
        </Button>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* Weekly grid */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
          {/* Day headers */}
          <div className="grid border-b border-gray-100 flex-shrink-0" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
            <div className="py-2" />
            {DAYS_ORDER.map(d => {
              const day = DAYS.find(x => x.value === d)!
              return (
                <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {day.short}
                </div>
              )
            })}
          </div>

          {/* Grid body — fills all remaining height */}
          <div className="relative flex-1" style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)' }}>
            {/* Hour labels + lines */}
            {hourLabels.map(h => (
              <React.Fragment key={h}>
                <div
                  className="absolute left-0 w-10 text-right pr-2"
                  style={{ top: `${((h - GRID_START) / GRID_HOURS) * 100}%`, transform: 'translateY(-50%)' }}
                >
                  <span className="text-[9px] text-gray-300 font-medium">{h}:00</span>
                </div>
                <div
                  className="absolute left-10 right-0 border-t border-gray-100"
                  style={{ top: `${((h - GRID_START) / GRID_HOURS) * 100}%` }}
                />
              </React.Fragment>
            ))}

            {/* Day columns */}
            {DAYS_ORDER.map((dayNum, colIdx) => (
              <div
                key={dayNum}
                className="absolute top-0 bottom-0 border-l border-gray-100"
                style={{
                  left: `calc(40px + ${colIdx} * ((100% - 40px) / 7))`,
                  width: `calc((100% - 40px) / 7)`,
                }}
              >
                {blocks
                  .filter(b => b.days_of_week.includes(dayNum))
                  .map(block => {
                    const pos = blockPosition(block)
                    const cfg = getTypeConfig(block.type)
                    return (
                      <div
                        key={block.id}
                        className={clsx(
                          'absolute left-0.5 right-0.5 rounded cursor-pointer flex flex-col justify-center px-1.5 overflow-hidden',
                          'hover:brightness-95 transition-all',
                          block.subject_id
                            ? 'border-l-2 bg-white shadow-sm'
                            : cfg.grid
                        )}
                        style={{
                          ...pos,
                          ...(block.subject_id
                            ? { borderLeftColor: subjects.find(s => s.id === block.subject_id)?.color ?? '#6366f1' }
                            : {}),
                        }}
                        onClick={() => openEdit(block)}
                        title={`${block.title} • ${block.start_time.substring(0, 5)}–${block.end_time.substring(0, 5)}`}
                      >
                        <p className="text-[10px] font-semibold truncate leading-tight text-gray-800">
                          {block.title}
                        </p>
                        {block.subject_id && (
                          <p className="text-[9px] font-medium truncate leading-tight"
                            style={{ color: subjects.find(s => s.id === block.subject_id)?.color ?? '#6366f1' }}>
                            {subjects.find(s => s.id === block.subject_id)?.name}
                          </p>
                        )}
                        <p className="text-[9px] opacity-50 leading-tight">
                          {block.start_time.substring(0, 5)}–{block.end_time.substring(0, 5)}
                        </p>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>

        {/* Block list — sidebar */}
        <div className="w-64 flex-shrink-0 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🗓️</p>
              <p className="text-xs text-gray-500 font-medium">Sin bloques todavía.</p>
              <button onClick={openNew} className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-medium">
                + Crear primer bloque
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map(block => {
                const cfg = getTypeConfig(block.type)
                const Icon = cfg.icon
                const days = block.days_of_week
                  .sort()
                  .map(d => DAYS.find(x => x.value === d)?.short)
                  .join(', ')
                const blockSubject = block.subject_id ? subjects.find(s => s.id === block.subject_id) : null

                return (
                  <div
                    key={block.id}
                    className={clsx(
                      'group flex items-center gap-3 px-3 py-3 rounded-xl border transition-all',
                      cfg.light
                    )}
                  >
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        !blockSubject && cfg.card
                      )}
                      style={blockSubject ? { backgroundColor: blockSubject.color } : undefined}
                    >
                      {blockSubject
                        ? <span className="text-white text-[11px] font-bold">{blockSubject.name.charAt(0).toUpperCase()}</span>
                        : <Icon size={14} className="text-white" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{block.title}</p>
                      {blockSubject && (
                        <p className="text-[10px] font-medium truncate" style={{ color: blockSubject.color }}>
                          {blockSubject.name}
                        </p>
                      )}
                      <p className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
                        <Clock size={9} />
                        {block.start_time.substring(0, 5)}–{block.end_time.substring(0, 5)}
                      </p>
                      <p className="text-[10px] opacity-50 truncate">{days}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(block)} className="p-1 hover:bg-white/70 rounded transition-colors" title="Editar">
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => handleDelete(block.id)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors" title="Eliminar">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Form modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBlock ? 'Editar bloque' : 'Nuevo bloque fijo'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="label">Título *</label>
            <input
              className="input"
              type="text"
              placeholder="Ej: Clases de Matemáticas"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Inicio *</label>
              <input className="input" type="time" value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fin *</label>
              <input className="input" type="time" value={form.end_time}
                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {BLOCK_TYPES.map(({ value, label, icon: Icon, active }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: value, subject_id: value !== 'university' ? null : p.subject_id }))}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-all',
                    form.type === value ? active : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject (only for university blocks) */}
          {form.type === 'university' && subjects.length > 0 && (
            <div>
              <label className="label">Materia</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-8"
                  value={form.subject_id ?? ''}
                  onChange={e => setForm(p => ({ ...p, subject_id: e.target.value || null }))}
                >
                  <option value="">Sin materia</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  {form.subject_id && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: subjects.find(s => s.id === form.subject_id)?.color }}
                    />
                  )}
                  <ChevronDown size={12} className="text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Days */}
          <div>
            <label className="label">Días de la semana *</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={clsx(
                    'w-9 h-9 rounded-full text-xs font-bold transition-all border',
                    form.days_of_week.includes(day.value)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  )}
                  title={day.label}
                >
                  {day.letter}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingBlock ? 'Guardar' : 'Crear bloque'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
