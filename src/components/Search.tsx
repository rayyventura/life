"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import styles from "./Search.module.css"
import { formatDate, categoryColor, categoryLabel, moodEmoji } from "@/lib/utils"

interface SearchEntry {
  id: string; date: string; title: string | null
  body: string | null; mood: string | null; tags: string | null
}
interface SearchGoal {
  id: string; title: string; description: string | null
  category: string; status: string
}
interface Results { entries: SearchEntry[]; goals: SearchGoal[] }

function highlight(text: string | null, query: string): React.ReactNode {
  if (!text || !query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className={styles.mark}>{part}</mark>
      : part
  )
}

export default function Search() {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!q.trim()) { setResults(null); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setResults(data)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  const total = (results?.entries.length ?? 0) + (results?.goals.length ?? 0)

  return (
    <div className={styles.root}>
      <div className={styles.inputWrap}>
        <span className={styles.searchIcon}>◇</span>
        <input
          ref={inputRef}
          className={styles.searchInput}
          placeholder="Search your journal, goals, memories…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button className={styles.clear} onClick={() => setQ("")}>×</button>}
        {loading && <div className="spinner" />}
      </div>

      {q && results && (
        <p className={styles.resultCount}>
          {total === 0 ? "No results found" : `${total} result${total !== 1 ? "s" : ""} for "${q}"`}
        </p>
      )}

      {results && results.entries.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Journal Entries</h2>
          <div className={styles.list}>
            {results.entries.map((entry) => (
              <Link key={entry.id} href={`/journal/${entry.date}`} className={styles.result}>
                <div className={styles.resultIcon}>{moodEmoji(entry.mood ?? "okay")}</div>
                <div className={styles.resultBody}>
                  <span className={styles.resultTitle}>
                    {highlight(entry.title || "Untitled", q)}
                  </span>
                  <span className={styles.resultDate}>{formatDate(entry.date)}</span>
                  {entry.body && (
                    <p className={styles.resultSnippet}>
                      {highlight(entry.body.slice(0, 180), q)}…
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results && results.goals.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Goals</h2>
          <div className={styles.list}>
            {results.goals.map((goal) => {
              const color = categoryColor(goal.category)
              return (
                <Link key={goal.id} href="/goals" className={styles.result}>
                  <div className={styles.resultIcon}>
                    <span style={{ color, fontSize: "0.9rem" }}>◎</span>
                  </div>
                  <div className={styles.resultBody}>
                    <div className={styles.resultMeta}>
                      <span className="badge" style={{ color, borderColor: color + "44", background: color + "11", fontSize: "0.68rem" }}>
                        {categoryLabel(goal.category).replace("Personal ", "")}
                      </span>
                      <span className={styles.status}>{goal.status}</span>
                    </div>
                    <span className={styles.resultTitle}>{highlight(goal.title, q)}</span>
                    {goal.description && (
                      <p className={styles.resultSnippet}>{highlight(goal.description.slice(0, 150), q)}</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {!q && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            Search across everything — journal entries, goals, notes, tags.
          </p>
          <div className={styles.suggestions}>
            {["morning reflection", "career", "grateful", "health"].map((s) => (
              <button key={s} className="chip" onClick={() => setQ(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
