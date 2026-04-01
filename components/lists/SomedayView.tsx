'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Trash2, Check, Circle, AlignLeft, ArrowRight, Bookmark } from 'lucide-react'
import { useSomeday } from '@/hooks/useSomeday'
import { useTasks } from '@/hooks/useTasks'
import TaskModal from '@/components/tasks/TaskModal'
import type { SomedayItem } from '@/lib/types'
import clsx from 'clsx'

const AREA_OPTIONS: { value: 'personal' | 'university' | 'work'; label: string; color: string }[] = [
  { value: 'personal',   label: 'Personal',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'university', label: 'Universidad',   color: 'bg-blue-100   text-blue-700   border-blue-200'   },
  { value: 'work',       label: 'Trabajo',       color: 'bg-amber-100  text-amber-700  border-amber-200'  },
]

export default function SomedayView() {
  const [newTitle, setNewTitle] = useState('')
  const [newArea, setNewArea] = useState<'personal' | 'university' | 'work'>('personal')
  const [addError, setAddError] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [convertingItem, setConvertingItem] = useState<SomedayItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { items, loading, fetchItems, createItem, toggleItem, deleteItem, updateNotes } = useSomeday()
  const { createTask } = useTasks()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAddError(false)
    const created = await createItem(newTitle.trim(), newArea)
    if (created) {
      setNewTitle('')
      setAddError(false)
      inputRef.current?.focus()
      await fetchItems()  // ensure list syncs with DB
    } else {
      setAddError(true)
    }
  }

  const handleNotesBlur = async (item: SomedayItem) => {
    const val = editingNotes[item.id]
    if (val !== undefined && val !== (item.notes ?? '')) {
      await updateNotes(item.id, val)
    }
    setEditingNotes(prev => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })
  }

  const handleConvert = (item: SomedayItem) => {
    setConvertingItem(item)
    setModalOpen(true)
  }

  const handleSaveTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data)
    if (convertingItem) {
      await deleteItem(convertingItem.id)
      setConvertingItem(null)
    }
  }

  const pending = items.filter(i => !i.is_done)
  const done = items.filter(i => i.is_done)

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Bookmark size={18} className="text-purple-500" />
          <h1 className="text-xl font-bold text-gray-900">Someday / Maybe</h1>
        </div>
        <p className="text-sm text-gray-400">
          Ideas y objetivos sin fecha. Revísalos cuando tengas tiempo.
        </p>
      </div>

      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          {AREA_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setNewArea(opt.value)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                newArea === opt.value ? opt.color : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-gray-400"
            placeholder="Agregar idea o tópico..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            <Plus size={13} />
            Agregar
          </button>
        </div>
        {addError && (
          <p className="text-xs text-red-500 mt-1">Error al guardar. Verificá tu conexión.</p>
        )}
      </div>

      {/* Pending items */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : pending.length === 0 && done.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-sm font-medium text-gray-500">No hay ideas todavía.</p>
          <p className="text-xs text-gray-400 mt-1">Agrega cosas que quieras hacer algún día.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map(item => {
            const areaOpt = AREA_OPTIONS.find(a => a.value === item.area)!
            const isExpanded = expandedId === item.id
            const notesVal = editingNotes[item.id] ?? item.notes ?? ''

            return (
              <div
                key={item.id}
                className={clsx(
                  'bg-white border border-gray-100 rounded-xl shadow-soft transition-all duration-200',
                  isExpanded && 'shadow-card'
                )}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleItem(item) }}
                    className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors"
                  >
                    <Circle size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {format(parseISO(item.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full border', areaOpt.color)}>
                    {areaOpt.label}
                  </span>
                </div>

                {/* Expanded */}
                <div className={clsx(
                  'overflow-hidden transition-all duration-200',
                  isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                )}>
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                    {/* Notes */}
                    <div className="flex items-start gap-2">
                      <AlignLeft size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                      <textarea
                        className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-gray-300 placeholder:text-gray-300"
                        rows={2}
                        placeholder="Notas opcionales..."
                        value={notesVal}
                        onChange={e => setEditingNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onFocus={() => { if (editingNotes[item.id] === undefined) setEditingNotes(prev => ({ ...prev, [item.id]: item.notes ?? '' })) }}
                        onBlur={() => handleNotesBlur(item)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleConvert(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <ArrowRight size={11} />
                        Crear tarea
                      </button>
                      <button
                        onClick={() => toggleItem(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <Check size={11} />
                        Completar
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={11} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Done items */}
          {done.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">
                Completadas ({done.length})
              </p>
              <div className="space-y-1.5">
                {done.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-100 rounded-xl opacity-50">
                    <button onClick={() => toggleItem(item)} className="flex-shrink-0 text-green-500">
                      <Check size={15} />
                    </button>
                    <p className="text-sm text-gray-500 line-through flex-1">{item.title}</p>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setConvertingItem(null) }}
        initialTitle={convertingItem?.title}
        defaultType="personal"
        onSave={handleSaveTask}
      />
    </div>
  )
}
