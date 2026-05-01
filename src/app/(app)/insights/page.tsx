import { auth } from "@/auth"
import { getChatSessions, getJournalEntries } from "@/lib/db"
import { formatDate, parseTags, moodEmoji } from "@/lib/utils"
import styles from "./insights.module.css"

export default async function InsightsPage() {
  const session = await auth()
  const userId = session!.user.id

  const [sessions, entries] = await Promise.all([
    getChatSessions(userId, 50),
    getJournalEntries(userId, { limit: 50 }),
  ])

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>Your Story</h1>
          <p className={styles.pageSub}>All conversations and entries — your life, in words.</p>
        </div>
        <button
          className={styles.printBtn}
          onClick={() => typeof window !== "undefined" && window.print()}
        >
          ⎙ Print
        </button>
      </div>

      {/* Journal entries timeline */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Journal</h2>
        {entries.length === 0 ? (
          <p className={styles.empty}>No entries yet.</p>
        ) : (
          <div className={styles.timeline}>
            {entries.map((entry) => (
              <article key={entry.id} className={styles.entry}>
                <div className={styles.entryMeta}>
                  <span className={styles.entryDate}>{formatDate(entry.date)}</span>
                  {entry.mood && (
                    <span className={styles.entryMood}>{moodEmoji(entry.mood)}</span>
                  )}
                  <div className={styles.entryTags}>
                    {parseTags(entry.tags).map((t) => (
                      <span key={t} className={styles.tag}>#{t}</span>
                    ))}
                  </div>
                </div>
                {entry.title && <h3 className={styles.entryTitle}>{entry.title}</h3>}
                {entry.body && <p className={styles.entryBody}>{entry.body}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* AI Chat sessions */}
      {sessions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Conversations</h2>
          <div className={styles.timeline}>
            {sessions.map((s) => {
              let msgs: Array<{ role: string; content: string }> = []
              let created: { journal?: { title: string }; goalNotes?: string[] } | null = null
              try { msgs = JSON.parse(s.messages) } catch { /* ignore */ }
              try { if (s.entries_created) created = JSON.parse(s.entries_created) } catch { /* ignore */ }

              return (
                <article key={s.id} className={`${styles.entry} ${styles.chatEntry}`}>
                  <div className={styles.entryMeta}>
                    <span className={styles.entryDate}>{formatDate(s.created_at)}</span>
                    <span className={styles.chatBadge}>AI Session · {msgs.length} messages</span>
                  </div>
                  <div className={styles.chatMsgs}>
                    {msgs.map((m, i) => (
                      <div key={i} className={`${styles.chatLine} ${m.role === "user" ? styles.chatUser : styles.chatAi}`}>
                        <span className={styles.chatRole}>{m.role === "user" ? "You" : "life."}</span>
                        <p className={styles.chatText}>{m.content}</p>
                      </div>
                    ))}
                  </div>
                  {created && (created.journal || (created.goalNotes?.length ?? 0) > 0) && (
                    <div className={styles.sessionCreated}>
                      {created.journal && <span>◻ Saved journal: <em>{created.journal.title}</em></span>}
                      {created.goalNotes?.map((n, i) => <span key={i}>◎ {n}</span>)}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
