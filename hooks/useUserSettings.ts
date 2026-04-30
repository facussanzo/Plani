'use client'

import { useState, useCallback } from 'react'
import { supabase, db } from '@/lib/supabase'

export interface UserSettings {
  id: string
  user_id: string
  reminder_email: string | null
  reminder_days: number[]
  reminders_enabled: boolean
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id'> = {
  reminder_email: null,
  reminder_days: [3, 1],
  reminders_enabled: false,
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettings(data as UserSettings)
      } else {
        // Row doesn't exist yet — create it with defaults
        const { data: created, error: createErr } = await db
          .from('user_settings')
          .insert([{ user_id: user.id, ...DEFAULT_SETTINGS }])
          .select()
          .single()
        if (createErr) throw createErr
        setSettings(created as UserSettings)
      }
    } catch (err) {
      console.error('[useUserSettings] fetchSettings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updates: Partial<Omit<UserSettings, 'id' | 'user_id'>>) => {
    if (!settings) return
    setSaving(true)
    try {
      const { data, error } = await db
        .from('user_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()
      if (error) throw error
      setSettings(data as UserSettings)
    } catch (err) {
      console.error('[useUserSettings] updateSettings:', err)
    } finally {
      setSaving(false)
    }
  }, [settings])

  return { settings, loading, saving, fetchSettings, updateSettings }
}
