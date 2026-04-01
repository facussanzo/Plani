'use client'

import { useState, useCallback } from 'react'
import { supabase, db } from '@/lib/supabase'
import type { Subtask, SubtaskWithTask } from '@/lib/types'

export function useSubtasks() {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSubtasks = useCallback(async (taskId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('position', { ascending: true })
      if (error) throw error
      setSubtasks((data as Subtask[]) ?? [])
    } catch (err) {
      console.error('[useSubtasks] fetchSubtasks:', err)
      setSubtasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSubtasksByDate = useCallback(async (date: string): Promise<SubtaskWithTask[]> => {
    try {
      const { data, error } = await db
        .from('subtasks')
        .select('*, task:tasks(id, title, type)')
        .eq('date', date)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as SubtaskWithTask[]) ?? []
    } catch (err) {
      console.error('[useSubtasks] fetchSubtasksByDate:', err)
      return []
    }
  }, [])

  const createSubtask = useCallback(async (
    taskId: string,
    title: string,
    date?: string
  ): Promise<Subtask | null> => {
    try {
      const position = subtasks.length
      const payload: Record<string, unknown> = {
        task_id: taskId,
        title: title.trim(),
        is_done: false,
        position,
      }
      if (date) payload.date = date
      const { data, error } = await db
        .from('subtasks')
        .insert([payload])
        .select()
        .single()
      if (error) throw error
      const created = data as Subtask
      setSubtasks(prev => [...prev, created])
      return created
    } catch (err) {
      console.error('[useSubtasks] createSubtask:', err)
      return null
    }
  }, [subtasks.length])

  const toggleSubtask = useCallback(async (subtask: Subtask): Promise<void> => {
    try {
      const { data, error } = await db
        .from('subtasks')
        .update({ is_done: !subtask.is_done })
        .eq('id', subtask.id)
        .select()
        .single()
      if (error) throw error
      const updated = data as Subtask
      setSubtasks(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch (err) {
      console.error('[useSubtasks] toggleSubtask:', err)
    }
  }, [])

  const deleteSubtask = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('subtasks').delete().eq('id', id)
      if (error) throw error
      setSubtasks(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('[useSubtasks] deleteSubtask:', err)
    }
  }, [])

  const doneCount = subtasks.filter(s => s.is_done).length

  return {
    subtasks,
    loading,
    doneCount,
    fetchSubtasks,
    fetchSubtasksByDate,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    setSubtasks,
  }
}
