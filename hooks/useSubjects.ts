'use client'

import { useState, useCallback } from 'react'
import { supabase, db, getAuthUserId } from '@/lib/supabase'
import type { Subject } from '@/lib/types'

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      if (error) {
        console.error('[useSubjects] fetchSubjects error:', error)
        return
      }
      setSubjects((data as Subject[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const createSubject = useCallback(async (name: string, color: string, area: 'university' | 'work' | 'personal' = 'university'): Promise<Subject | null> => {
    try {
      const userId = await getAuthUserId()
      const { data, error } = await db
        .from('subjects')
        .insert([{ name: name.trim(), color, user_id: userId, area }])
        .select()
        .single()

      if (error) {
        console.error('[useSubjects] createSubject error:', error)
        return null
      }
      const subject = data as Subject
      setSubjects(prev => [...prev, subject].sort((a, b) => a.name.localeCompare(b.name)))
      return subject
    } catch (err) {
      console.error('[useSubjects] createSubject exception:', err)
      return null
    }
  }, [])

  const deleteSubject = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id)
      if (error) {
        console.error('[useSubjects] deleteSubject error:', error)
        return false
      }
      setSubjects(prev => prev.filter(s => s.id !== id))
      return true
    } catch (err) {
      console.error('[useSubjects] deleteSubject exception:', err)
      return false
    }
  }, [])

  return { subjects, loading, fetchSubjects, createSubject, deleteSubject, setSubjects }
}
