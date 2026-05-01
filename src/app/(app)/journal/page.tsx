import { auth } from "@/auth"
import { getEntryDatesForMonth } from "@/lib/db"
import JournalCalendar from "@/components/JournalCalendar"
import { getJournalEntries } from "@/lib/db"
import Link from "next/link"
import { formatDateShort, moodEmoji, todayISO } from "@/lib/utils"
import styles from "./journal.module.css"

export default async function JournalPage() {
  const session = await auth()
  const userId = session!.user.id
  const now = new Date()
  const [entryDates, recentEntries] = await Promise.all([
    getEntryDatesForMonth(userId, now.getFullYear(), now.getMonth()),
    getJournalEntries(userId, { limit: 10 }),
  ])

  const today = todayISO()

  return (
    <div>
      <div className="page-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Journal</h1>
          <p className="page-subtitle">Your daily record of thoughts and moments.</p>
        </div>
        <Link href={`/journal/${today}`} className="btn btn-gold">+ Today</Link>
      </div>

      <div className={styles.layout}>
        <div className={styles.calWrap}>
          <JournalCalendar initialEntryDates={entryDates} />
        </div>

        <div className={styles.list}>
          <h2 className={styles.listTitle}>Recent entries</h2>
          {recentEntries.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">◻</span>
              <p className="empty-text">Begin your first entry.</p>
            </div>
          ) : (
            recentEntries.map((entry) => (
              <Link key={entry.id} href={`/journal/${entry.date}`} className={styles.entryCard}>
                <div className={styles.entryLeft}>
                  <span className={styles.entryMood}>{moodEmoji(entry.mood ?? "okay")}</span>
                  <span className={styles.entryDate}>{formatDateShort(entry.date)}</span>
                </div>
                <div className={styles.entryRight}>
                  <span className={styles.entryTitle}>{entry.title || "Untitled entry"}</span>
                  {entry.body && (
                    <p className={styles.entrySnippet}>{entry.body.slice(0, 100)}…</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
