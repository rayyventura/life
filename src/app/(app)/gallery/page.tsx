import { auth } from "@/auth"
import { getPhotos, getJournalEntries } from "@/lib/db"
import Gallery from "@/components/Gallery"

export default async function GalleryPage() {
  const session = await auth()
  const userId = session!.user.id
  const [photos, entries] = await Promise.all([
    getPhotos(userId),
    getJournalEntries(userId),
  ])

  const entryMap = new Map(entries.map((e) => [e.id, e]))
  const enrichedPhotos = photos.map((p) => {
    const entry = p.entry_id ? entryMap.get(p.entry_id) : undefined
    return {
      ...p,
      entry_date: entry?.date,
      entry_title: entry?.title ?? undefined,
    }
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gallery</h1>
        <p className="page-subtitle">{photos.length} memor{photos.length !== 1 ? "ies" : "y"} captured.</p>
      </div>
      <Gallery photos={enrichedPhotos} />
    </div>
  )
}
