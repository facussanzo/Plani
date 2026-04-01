'use client'

import { useState, useCallback } from 'react'
import { supabase, db, getAuthUserId } from '@/lib/supabase'
import type { Draft } from '@/lib/types'

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('drafts')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setDrafts((data as Draft[]) ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching drafts'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const createDraft = useCallback(async (content: string): Promise<Draft | null> => {
    setError(null)
    try {
      const userId = await getAuthUserId()
      const { data, error: err } = await db
        .from('drafts')
        .insert([{ content, user_id: userId }])
        .select()
        .single()

      if (err) throw err
      const newDraft = data as Draft
      setDrafts(prev => [newDraft, ...prev])
      return newDraft
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error creating draft'
      setError(msg)
      return null
    }
  }, [])

  const updateDraft = useCallback(async (id: string, content: string): Promise<Draft | null> => {
    setError(null)
    try {
      const { data, error: err } = await db
        .from('drafts')
        .update({ content })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const updated = data as Draft
      setDrafts(prev => prev.map(d => (d.id === id ? updated : d)))
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error updating draft'
      setError(msg)
      return null
    }
  }, [])

  const deleteDraft = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: err } = await supabase
        .from('drafts')
        .delete()
        .eq('id', id)

      if (err) throw err
      setDrafts(prev => prev.filter(d => d.id !== id))
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error deleting draft'
      setError(msg)
      return false
    }
  }, [])

  return {
    drafts,
    loading,
    error,
    fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
  }
}
