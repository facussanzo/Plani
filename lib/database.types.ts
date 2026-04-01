export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          type: 'university' | 'work' | 'personal' | 'recurring'
          category: string | null
          subject_id: string | null
          deadline: string | null
          start_date: string | null
          end_date: string | null
          is_all_day: boolean
          time: string | null
          progress_current: number
          progress_total: number
          is_recurring: boolean
          recurring_pattern: string | null
          status: 'pending' | 'in_progress' | 'done' | 'cancelled'
          is_event: boolean
          tag_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type?: 'university' | 'work' | 'personal' | 'recurring'
          category?: string | null
          subject_id?: string | null
          deadline?: string | null
          start_date?: string | null
          end_date?: string | null
          is_all_day?: boolean
          time?: string | null
          progress_current?: number
          progress_total?: number
          is_recurring?: boolean
          recurring_pattern?: string | null
          status?: 'pending' | 'in_progress' | 'done' | 'cancelled'
          is_event?: boolean
          tag_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: 'university' | 'work' | 'personal' | 'recurring'
          category?: string | null
          subject_id?: string | null
          deadline?: string | null
          start_date?: string | null
          end_date?: string | null
          is_all_day?: boolean
          time?: string | null
          progress_current?: number
          progress_total?: number
          is_recurring?: boolean
          recurring_pattern?: string | null
          status?: 'pending' | 'in_progress' | 'done' | 'cancelled'
          is_event?: boolean
          tag_ids?: string[]
          created_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      fixed_blocks: {
        Row: {
          id: string
          title: string
          start_time: string
          end_time: string
          days_of_week: number[]
          type: 'work' | 'university' | 'personal' | 'other'
          subject_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          start_time: string
          end_time: string
          days_of_week: number[]
          type?: 'work' | 'university' | 'other'
          subject_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          start_time?: string
          end_time?: string
          days_of_week?: number[]
          type?: 'work' | 'university' | 'other'
          subject_id?: string | null
          created_at?: string
        }
      }
      drafts: {
        Row: {
          id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          created_at?: string
        }
      }
      area_tags: {
        Row: {
          id: string
          name: string
          area: 'university' | 'work' | 'general' | 'personal'
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          area?: 'university' | 'work' | 'general'
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          area?: 'university' | 'work' | 'general'
          color?: string
          created_at?: string
        }
      }
      someday: {
        Row: {
          id: string
          title: string
          notes: string | null
          area: 'personal' | 'university' | 'work'
          is_done: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          notes?: string | null
          area?: 'personal' | 'university' | 'work'
          is_done?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          notes?: string | null
          area?: 'personal' | 'university' | 'work'
          is_done?: boolean
          created_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          is_done: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          is_done?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          is_done?: boolean
          position?: number
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
