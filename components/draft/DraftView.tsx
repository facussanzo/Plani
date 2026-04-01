'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Trash2, Zap, ArrowRight } from 'lucide-react'
import { useDrafts } from '@/hooks/useDrafts'
import { useTasks } from '@/hooks/useTasks'
import type { Draft } from '@/lib/types'
import TaskModal from '@/components/tasks/TaskModal'
import Button from '@/components/ui/Button'
import clsx from 'clsx'

export default function DraftView() {
  const [input, setInput] = useState('')
  const [convertingDraft, setConvertingDraft] = useState<Draft | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { drafts, loading, fetchDrafts, createDraft, deleteDraft } = useDrafts()
  const { createTask } = useTasks()

  useEffect(() => {
    fetchDrafts()
    inputRef.current?.focus()
  }, [fetchDrafts])

  const handleSubmit = useCallback(async () => {
    const content = input.trim()
    if (!content) return
    await createDraft(content)
    setInput('')
    inputRef.current?.focus()
  }, [input, createDraft])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleConvert = (draft: Draft) => {
    setConvertingDraft(draft)
    setTaskModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await deleteDraft(id)
  }

  const handleSaveTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data)
    if (convertingDraft) {
      await deleteDraft(convertingDraft.id)
      setConvertingDraft(null)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Borrador</h1>
        <p className="text-sm text-gray-400 mt-1">
          Captura ideas rápido. Presiona Enter para guardar.
        </p>
      </div>

      {/* Quick input */}
      <div className="card mb-6">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <Zap size={13} className="text-white" />
          </div>
          <div className="flex-1">
            <textarea
              ref={inputRef}
              className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none border-none outline-none focus:ring-0 min-h-[60px]"
              placeholder="Anota algo... (Enter para guardar, Shift+Enter para nueva línea)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-300">
            {input.length > 0 ? `${input.length} caracteres` : 'Escribe algo...'}
          </p>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!input.trim()}
          >
            <Send size={12} />
            Guardar
          </Button>
        </div>
      </div>

      {/* Drafts list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">
            Borrador ({drafts.length})
          </p>
          {drafts.length > 0 && (
            <p className="text-xs text-gray-400">Convierte ideas en tareas</p>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">✍️</p>
            <p className="text-sm text-gray-500">No hay borradores.</p>
            <p className="text-xs text-gray-400 mt-1">
              Usa el campo de arriba para capturar ideas.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map(draft => (
              <div
                key={draft.id}
                className="group card hover:shadow-card transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                      {draft.content}
                    </p>
                    <p className="text-xs text-gray-300 mt-2">
                      {format(parseISO(draft.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleConvert(draft)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                      title="Convertir en tarea"
                    >
                      <ArrowRight size={12} />
                      Crear tarea
                    </button>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setConvertingDraft(null) }}
        initialTitle={convertingDraft?.content.split('\n')[0].substring(0, 100)}
        onSave={handleSaveTask}
      />
    </div>
  )
}
