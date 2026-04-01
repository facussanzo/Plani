'use client'

import { useState, useCallback } from 'react'
import { supabase, db, getAuthUserId } from '@/lib/supabase'
import type { AreaTag } from '@/lib/types'

export function useAreaTags() {
  const [tags, setTags] = useState<AreaTag[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTags = useCallback(async (area?: 'university' | 'work' | 'general' | 'personal') => {
    setLoading(true)
    try {
      let query = supabase.from('area_tags').select('*').order('name', { ascending: true })
      if (area) query = query.eq('area', area)
      const { data, error } = await query
      if (error) throw error
      setTags((data as AreaTag[]) ?? [])
    } catch (err) {
      console.error('[useAreaTags] fetchTags:', err)
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createTag = useCallback(async (
    name: string,
    area: 'university' | 'work' | 'general' | 'personal',
    color: string
  ): Promise<AreaTag | null> => {
    try {
      const userId = await getAuthUserId()
      const { data, error } = await db
        .from('area_tags')
        .insert([{ name: name.trim(), area, color, user_id: userId }])
        .select()
        .single()
      if (error) throw error
      const created = data as AreaTag
      setTags(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      return created
    } catch (err) {
      console.error('[useAreaTags] createTag:', err)
      return null
    }
  }, [])

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('area_tags').delete().eq('id', id)
      if (error) throw error
      setTags(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error('[useAreaTags] deleteTag:', err)
    }
  }, [])

  return { tags, loading, fetchTags, createTag, deleteTag }
}
