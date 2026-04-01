'use client'

import { useSearchParams } from 'next/navigation'
import ListView from '@/components/lists/ListView'

export default function ListsPageClient() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const initialTab: 'university' | 'work' | 'personal' =
    tab === 'work' ? 'work' : tab === 'personal' ? 'personal' : 'university'
  return <ListView key={initialTab} initialTab={initialTab} />
}
