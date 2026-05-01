import { auth } from "@/auth"
import { getJournalEntryByDate, getPhotos } from "@/lib/db"
import JournalEntryEditor from "@/components/JournalEntry"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

interface Props { params: { date: string } }

export async function generateMetadata({ params }: Props) {
  return { title: `Journal — ${formatDate(params.date)}` }
}

export default async function JournalEntryPage({ params }: Props) {
  const { date } = params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return <div className="empty"><p className="empty-text">Invalid date format.</p></div>
  }

  const session = await auth()
  const userId = session!.user.id
  const [entry, photos] = await Promise.all([
    getJournalEntryByDate(userId, date),
    getPhotos(userId),
  ])

  const entryPhotos = entry ? photos.filter((p) => p.entry_id === entry.id) : []

  return (
    <div>
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/journal" className="btn btn-ghost" style={{ fontSize: "0.85rem" }}>← Journal</Link>
      </div>
      <JournalEntryEditor date={date} initialEntry={entry} initialPhotos={entryPhotos} />
    </div>
  )
}
