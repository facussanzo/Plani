'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase, db, getAuthUserId } from '@/lib/supabase'
import type { Task, TaskFormData } from '@/lib/types'

/**
 * Converts empty strings to null for optional DB fields.
 * This is critical: PostgreSQL rejects '' for date/time columns.
 */
function sanitize(data: TaskFormData): Record<string, unknown> {
  const nullIfEmpty = (v: string | null | undefined) =>
    v === '' || v === undefined ? null : v

  return {
    title: data.title.trim(),
    description: nullIfEmpty(data.description),
    type: data.type,
    category: nullIfEmpty(data.category),
    subject_id: data.subject_id ?? null,
    deadline: nullIfEmpty(data.deadline),
    start_date: nullIfEmpty(data.start_date),
    end_date: nullIfEmpty(data.end_date),
    is_all_day: data.is_all_day,
    time: nullIfEmpty(data.time),
    progress_current: data.progress_current ?? 0,
    progress_total: data.progress_total ?? 0,
    is_recurring: data.is_recurring,
    recurring_pattern: nullIfEmpty(data.recurring_pattern),
    status: data.status,
    is_event: data.is_event ?? false,
    tag_ids: data.tag_ids ?? [],
    group_id: data.group_id ?? null,
    priority: data.priority ?? null,
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setTasks((data as Task[]) ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching tasks'
      console.error('[useTasks] fetchTasks:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTasksByDate = useCallback(async (date: string): Promise<Task[]> => {
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .or(`start_date.eq.${date},deadline.eq.${date}`)
        .order('time', { ascending: true, nullsFirst: false })

      if (err) throw err
      return (data as Task[]) ?? []
    } catch (err) {
      console.error('[useTasks] fetchTasksByDate:', err)
      return []
    }
  }, [])

  const fetchTasksByDateRange = useCallback(async (startDate: string, endDate: string): Promise<Task[]> => {
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .or(
          `and(start_date.gte.${startDate},start_date.lte.${endDate}),and(deadline.gte.${startDate},deadline.lte.${endDate})`
        )
        .order('start_date', { ascending: true })

      if (err) throw err
      return (data as Task[]) ?? []
    } catch (err) {
      console.error('[useTasks] fetchTasksByDateRange:', err)
      return []
    }
  }, [])

  /**
   * Creates a task. Throws on error so callers can show feedback.
   */
  const createTask = useCallback(async (taskData: TaskFormData): Promise<Task> => {
    const payload = sanitize(taskData)
    const userId = await getAuthUserId()
    console.log('[useTasks] createTask payload:', payload)

    const { data, error: err } = await db
      .from('tasks')
      .insert([{ ...payload, user_id: userId }])
      .select()
      .single()

    if (err) {
      console.error('[useTasks] createTask error:', err)
      throw new Error(err.message)
    }

    const newTask = data as Task
    setTasks(prev => [newTask, ...prev])
    return newTask
  }, [])

  /**
   * Updates a task. Throws on error.
   * Only sends the fields present in `updates` (partial update).
   */
  const updateTask = useCallback(async (id: string, updates: Partial<TaskFormData>): Promise<Task> => {
    // Sanitize only the fields being updated
    const partialPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' && value === '' &&
        ['deadline', 'start_date', 'end_date', 'time', 'description', 'category', 'recurring_pattern'].includes(key)) {
        partialPayload[key] = null
      } else {
        partialPayload[key] = value
      }
    }
    console.log('[useTasks] updateTask payload:', partialPayload)

    const { data, error: err } = await db
      .from('tasks')
      .update(partialPayload)
      .eq('id', id)
      .select()
      .single()

    if (err) {
      console.error('[useTasks] updateTask error:', err)
      throw new Error(err.message)
    }

    const updated = data as Task
    setTasks(prev => prev.map(t => (t.id === id ? updated : t)))
    return updated
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('tasks').delete().eq('id', id)
      if (err) throw err
      setTasks(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err) {
      console.error('[useTasks] deleteTask:', err)
      return false
    }
  }, [])

  const toggleTaskStatus = useCallback(async (task: Task): Promise<Task | null> => {
    const nextStatus: Record<string, Task['status']> = {
      pending: 'in_progress',
      in_progress: 'done',
      done: 'pending',
      cancelled: 'pending',
    }
    try {
      return await updateTask(task.id, { status: nextStatus[task.status] })
    } catch {
      return null
    }
  }, [updateTask])

  const fetchOverdueTasks = useCallback(async (): Promise<Task[]> => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .lt('deadline', today)
        .in('status', ['pending', 'in_progress'])
        .order('deadline', { ascending: true })
        .limit(15)
      if (err) throw err
      return (data as Task[]) ?? []
    } catch (err) {
      console.error('[useTasks] fetchOverdueTasks:', err)
      return []
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    fetchTasksByDate,
    fetchTasksByDateRange,
    fetchOverdueTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    setTasks,
  }
}
