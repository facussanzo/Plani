'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Check, Mail, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useUserSettings } from '@/hooks/useUserSettings'

const REMINDER_DAY_OPTIONS = [7, 5, 3, 2, 1]

export default function SettingsView() {
  const { settings, loading, saving, fetchSettings, updateSettings } = useUserSettings()
  const [email, setEmail] = useState('')
  const [days, setDays] = useState<number[]>([3, 1])
  const [enabled, setEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings) {
      setEmail(settings.reminder_email ?? '')
      setDays(settings.reminder_days ?? [3, 1])
      setEnabled(settings.reminders_enabled)
    }
  }, [settings])

  const toggleDay = (day: number) => {
    setDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const handleSave = async () => {
    await updateSettings({
      reminder_email: email.trim() || null,
      reminder_days: days,
      reminders_enabled: enabled,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-400 mt-1">Personaliza tu experiencia en Plani</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Cargando...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Email reminders section */}
          <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Bell size={15} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Recordatorios por mail</h2>
                <p className="text-xs text-gray-400">Recibí alertas antes de tus entregas (TPs, Parciales, Proyectos)</p>
              </div>
              {/* Enable toggle */}
              <button
                type="button"
                onClick={() => setEnabled(prev => !prev)}
                className={clsx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-auto flex-shrink-0',
                  enabled ? 'bg-gray-900' : 'bg-gray-300'
                )}
              >
                <span className={clsx(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            <div className={clsx('space-y-4 transition-all', !enabled && 'opacity-40 pointer-events-none')}>
              {/* Email address */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  <Mail size={11} className="inline mr-1" />
                  Dirección de email
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              {/* Days before */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  ¿Cuántos días antes querés recibir el aviso?
                </label>
                <p className="text-xs text-gray-400 mb-2">Podés elegir varios — se acumularán.</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {REMINDER_DAY_OPTIONS.map(day => {
                    const active = days.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                          active
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                        )}
                      >
                        {day === 1 ? '1 día antes' : `${day} días antes`}
                      </button>
                    )
                  })}
                </div>
                {days.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Recibirás recordatorios{' '}
                    {days.sort((a, b) => b - a).map((d, i) => (
                      <span key={d}>
                        <strong>{d === 1 ? '1 día' : `${d} días`}</strong>
                        {i < days.length - 1 ? ', ' : ' '}
                      </span>
                    ))}
                    antes del deadline.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60'
              )}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved ? (
                <Check size={14} />
              ) : null}
              {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
