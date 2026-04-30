import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CAT_LABELS: Record<string, string> = {
  TP: 'TP',
  Parcial: 'Parcial',
  Proyecto: 'Proyecto',
}

const CAT_COLORS: Record<string, string> = {
  TP: '#f97316',
  Parcial: '#ef4444',
  Proyecto: '#8b5cf6',
}

function buildEmailHtml(deliverables: Array<{
  title: string
  category: string
  deadline: string
  subject_name: string | null
  days_left: number
}>): string {
  const rows = deliverables.map(d => {
    const color = CAT_COLORS[d.category] ?? '#6b7280'
    const deadlineFormatted = format(new Date(d.deadline + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">${CAT_LABELS[d.category] ?? d.category}</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${d.title}</span>
          </div>
          ${d.subject_name ? `<div style="margin-top:4px;font-size:12px;color:#6b7280;">📚 ${d.subject_name}</div>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap;">
          <span style="font-size:12px;font-weight:600;color:${d.days_left === 1 ? '#ef4444' : d.days_left <= 2 ? '#f97316' : '#374151'};">
            ${d.days_left === 1 ? '⚠️ Mañana' : `En ${d.days_left} días`}
          </span>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${deadlineFormatted}</div>
        </td>
      </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:32px auto;">
    <tr>
      <td style="padding:0 16px;">
        <!-- Header -->
        <div style="background:#111827;border-radius:16px 16px 0 0;padding:24px 28px;display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;background:#374151;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">⚡</div>
          <div>
            <div style="color:white;font-size:18px;font-weight:700;">Plani</div>
            <div style="color:#9ca3af;font-size:12px;">Recordatorio de entregas</div>
          </div>
        </div>

        <!-- Body -->
        <div style="background:white;padding:24px 28px;border-radius:0 0 16px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111827;">
            Próximas entregas 📋
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">
            Estas son las entregas que vencen pronto. ¡No te quedes sin tiempo!
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
            ${rows}
          </table>

          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://plani.vercel.app'}/lists"
               style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:600;">
              Ver mis tareas →
            </a>
          </div>
        </div>

        <p style="text-align:center;font-size:11px;color:#d1d5db;margin-top:16px;">
          Plani · podés cambiar tus preferencias en Configuración
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function GET(req: NextRequest) {
  // Auth check for cron
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = format(new Date(), 'yyyy-MM-dd')

    // Fetch all active user settings with reminders enabled
    const { data: settingsRows, error: settingsErr } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('reminders_enabled', true)
      .not('reminder_email', 'is', null)

    if (settingsErr) throw settingsErr
    if (!settingsRows?.length) return NextResponse.json({ sent: 0 })

    let totalSent = 0

    for (const setting of settingsRows) {
      const reminderDays: number[] = setting.reminder_days ?? [3, 1]

      // Find deliverables that match any reminder day
      const targetDates = reminderDays.map(d => format(addDays(new Date(), d), 'yyyy-MM-dd'))

      const { data: tasks, error: tasksErr } = await supabaseAdmin
        .from('tasks')
        .select('id, title, category, deadline, subject_id')
        .eq('user_id', setting.user_id)
        .in('category', ['TP', 'Parcial', 'Proyecto'])
        .not('status', 'in', '("done","cancelled")')
        .in('deadline', targetDates)

      if (tasksErr || !tasks?.length) continue

      // Enrich with subject names
      const subjectIds = Array.from(new Set(tasks.map(t => t.subject_id).filter(Boolean)))
      let subjectsMap: Record<string, string> = {}
      if (subjectIds.length > 0) {
        const { data: subjects } = await supabaseAdmin
          .from('subjects')
          .select('id, name')
          .in('id', subjectIds)
        if (subjects) {
          subjectsMap = Object.fromEntries(subjects.map(s => [s.id, s.name]))
        }
      }

      const deliverables = tasks.map(t => {
        const daysLeft = reminderDays.find(d => format(addDays(new Date(), d), 'yyyy-MM-dd') === t.deadline) ?? 1
        return {
          title: t.title,
          category: t.category,
          deadline: t.deadline,
          subject_name: t.subject_id ? subjectsMap[t.subject_id] ?? null : null,
          days_left: daysLeft,
        }
      }).sort((a, b) => a.days_left - b.days_left)

      const html = buildEmailHtml(deliverables)
      const text = deliverables
        .map(d => `• [${d.category}] ${d.title} — vence en ${d.days_left} día(s)`)
        .join('\n')

      // Send via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Plani <onboarding@resend.dev>',
          to: [setting.reminder_email],
          subject: `📋 Plani: ${deliverables.length} entrega${deliverables.length > 1 ? 's' : ''} próxima${deliverables.length > 1 ? 's' : ''}`,
          html,
          text,
        }),
      })

      if (res.ok) totalSent++
    }

    return NextResponse.json({ sent: totalSent, checked: settingsRows.length })
  } catch (err) {
    console.error('[reminders/send]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
