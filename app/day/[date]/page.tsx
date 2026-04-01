import DayView from '@/components/day/DayView'

interface Props {
  params: { date: string }
}

export default function DayPage({ params }: Props) {
  return <DayView dateStr={params.date} />
}
