'use client'

import { useState, useCallback } from 'react'
import { supabase, db, getAuthUserId } from '@/lib/supabase'
import type { SomedayItem } from '@/lib/types'

export function useSomeday() {
  const [items, setItems] = useState<SomedayItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchItems = useCallback(async (area?: 'personal' | 'university' | 'work') => {
    setLoading(true)
    try {
      let query = supabase
        .from('someday')
        .select('*')
        .order('created_at', { ascending: false })
      if (area) query = query.eq('area', area)
      const { data, error } = await query
      if (error) throw error
      setItems((data as SomedayItem[]) ?? [])
    } catch (err) {
      console.error('[useSomeday] fetchItems:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createItem = useCallback(async (
    title: string,
    area: 'personal' | 'university' | 'work' = 'personal',
    notes?: string
  ): Promise<SomedayItem | null> => {
    try {
      const userId = await getAuthUserId()
      const { data, error } = await db
        .from('someday')
        .insert([{ title: title.trim(), area, notes: notes?.trim() || null, user_id: userId }])
        .select()
        .single()
      if (error) throw error
      const created = data as SomedayItem
      setItems(prev => [created, ...prev])
      return created
    } catch (err) {
      console.error('[useSomeday] createItem:', err)
      return null
    }
  }, [])

  const toggleItem = useCallback(async (item: SomedayItem): Promise<void> => {
    try {
      const { data, error } = await db
        .from('someday')
        .update({ is_done: !item.is_done })
        .eq('id', item.id)
        .select()
        .single()
      if (error) throw error
      const updated = data as SomedayItem
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    } catch (err) {
      console.error('[useSomeday] toggleItem:', err)
    }
  }, [])

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('someday').delete().eq('id', id)
      if (error) throw error
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('[useSomeday] deleteItem:', err)
    }
  }, [])

  const updateNotes = useCallback(async (id: string, notes: string): Promise<void> => {
    try {
      const { data, error } = await db
        .from('someday')
        .update({ notes: notes.trim() || null })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const updated = data as SomedayItem
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    } catch (err) {
      console.error('[useSomeday] updateNotes:', err)
    }
  }, [])

  return { items, loading, fetchItems, createItem, toggleItem, deleteItem, updateNotes }
}
