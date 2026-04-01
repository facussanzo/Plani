import { Suspense } from 'react'
import ListsPageClient from './ListsPageClient'

export default function ListsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="skeleton h-8 w-32 rounded-lg" /></div>}>
      <ListsPageClient />
    </Suspense>
  )
}
