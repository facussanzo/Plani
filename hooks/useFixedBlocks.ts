'use client'

import { useState, useCallback } from 'react'
import { supabase, db, getAuthUserId } from '@/lib/supabase'
import type { FixedBlock } from '@/lib/types'

type FixedBlockFormData = Omit<FixedBlock, 'id'>

export function useFixedBlocks() {
  const [blocks, setBlocks] = useState<FixedBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBlocks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('fixed_blocks')
        .select('*')
        .order('start_time', { ascending: true })

      if (err) throw err
      setBlocks((data as FixedBlock[]) ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching blocks'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBlocksForDay = useCallback((dayOfWeek: number): FixedBlock[] => {
    return blocks.filter(b => b.days_of_week.includes(dayOfWeek))
  }, [blocks])

  const createBlock = useCallback(async (blockData: FixedBlockFormData): Promise<FixedBlock | null> => {
    setError(null)
    try {
      const userId = await getAuthUserId()
      const { data, error: err } = await db
        .from('fixed_blocks')
        .insert([{ ...blockData, user_id: userId }])
        .select()
        .single()

      if (err) throw err
      const newBlock = data as FixedBlock
      setBlocks(prev => [...prev, newBlock].sort((a, b) => a.start_time.localeCompare(b.start_time)))
      return newBlock
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error creating block'
      setError(msg)
      return null
    }
  }, [])

  const updateBlock = useCallback(async (id: string, updates: Partial<FixedBlockFormData>): Promise<FixedBlock | null> => {
    setError(null)
    try {
      const { data, error: err } = await db
        .from('fixed_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const updated = data as FixedBlock
      setBlocks(prev => prev.map(b => (b.id === id ? updated : b)))
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error updating block'
      setError(msg)
      return null
    }
  }, [])

  const deleteBlock = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: err } = await supabase
        .from('fixed_blocks')
        .delete()
        .eq('id', id)

      if (err) throw err
      setBlocks(prev => prev.filter(b => b.id !== id))
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error deleting block'
      setError(msg)
      return false
    }
  }, [])

  return {
    blocks,
    loading,
    error,
    fetchBlocks,
    fetchBlocksForDay,
    createBlock,
    updateBlock,
    deleteBlock,
  }
}
