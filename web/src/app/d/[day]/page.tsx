import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DayView } from '@/components/DayView'
import { dayPage } from '@/lib/data'
import { isDay, longDay } from '@/lib/format'

export const revalidate = 300

// Days are built when first asked for and then kept like the front page.
export const generateStaticParams = async () => []

type Props = { params: Promise<{ day: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { day } = await params
  if (!isDay(day)) return {}
  const page = await dayPage(day)
  if (!page) return {}
  return { title: page.digest ? `${page.digest.headline} (${longDay(day)})` : longDay(day), description: page.digest?.overview, alternates: { canonical: `/d/${day}` } }
}

export default async function Day({ params }: Props) {
  const { day } = await params
  if (!isDay(day)) notFound()
  const page = await dayPage(day)
  if (!page) notFound()
  return <DayView page={page} />
}
