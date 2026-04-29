export type TaskType = 'university' | 'work' | 'personal' | 'recurring'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'

export interface Subject {
  id: string
  name: string
  color: string
  area?: 'university' | 'work' | 'personal'
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string | null
  type: TaskType
  category?: string | null
  subject_id?: string | null
  deadline?: string | null
  start_date?: string | null
  end_date?: string | null
  is_all_day: boolean
  time?: string | null
  progress_current: number
  progress_total: number
  is_recurring: boolean
  recurring_pattern?: string | null
  status: TaskStatus
  is_event?: boolean
  tag_ids?: string[]
  group_id?: string | null
  created_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_done: boolean
  position: number
  date?: string | null
  created_at: string
}

export interface SubtaskWithTask extends Subtask {
  task?: { id: string; title: string; type: TaskType } | null
}

export interface AreaTag {
  id: string
  name: string
  area: 'university' | 'work' | 'general' | 'personal'
  color: string
  created_at: string
}

export interface SomedayItem {
  id: string
  title: string
  notes?: string | null
  area: 'personal' | 'university' | 'work'
  is_done: boolean
  created_at: string
}

// Soft iOS-inspired palette for subjects
export const SUBJECT_COLORS = [
  { label: 'Azul',    value: '#3b82f6' },
  { label: 'Índigo',  value: '#6366f1' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Rosa',    value: '#ec4899' },
  { label: 'Rojo',    value: '#ef4444' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Ámbar',   value: '#f59e0b' },
  { label: 'Verde',   value: '#22c55e' },
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Gris',    value: '#6b7280' },
]

export const TAG_PASTEL_COLORS = [
  { label: 'Rojo',      value: '#fca5a5' },
  { label: 'Naranja',   value: '#fdba74' },
  { label: 'Amarillo',  value: '#fde047' },
  { label: 'Verde',     value: '#86efac' },
  { label: 'Cian',      value: '#67e8f9' },
  { label: 'Azul',      value: '#93c5fd' },
  { label: 'Violeta',   value: '#c4b5fd' },
  { label: 'Rosa',      value: '#f9a8d4' },
  { label: 'Gris',      value: '#d1d5db' },
  { label: 'Esmeralda', value: '#6ee7b7' },
]

export interface FixedBlock {
  id: string
  title: string
  start_time: string
  end_time: string
  days_of_week: number[]
  type: 'work' | 'university' | 'personal' | 'other'
  subject_id?: string | null
}

export interface Draft {
  id: string
  content: string
  created_at: string
}

export type TaskFormData = Omit<Task, 'id' | 'created_at'>

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  university: 'Universidad',
  work: 'Trabajo',
  personal: 'Personal',
  recurring: 'Recurrente',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada',
  cancelled: 'Cancelada',
}

export const TASK_TYPE_COLORS: Record<TaskType, { bg: string; text: string; border: string; dot: string }> = {
  university: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  work: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  personal: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  recurring: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
}

export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-600' },
  done: { bg: 'bg-green-100', text: 'text-green-600' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-600' },
}
