"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import styles from "./Dashboard.module.css"
import { formatDateShort, categoryColor, categoryLabel, moodEmoji, relativeTime, parseTags } from "@/lib/utils"

const CATEGORIES = ["career", "health", "finance", "relationships", "growth", "learning", "creative"]
const MOODS = ["rough", "low", "okay", "good", "amazing"]
const MOOD_HEIGHTS: Record<string, number> = { rough: 20, low: 35, okay: 52, good: 70, amazing: 88 }

interface Stats {
  goalStats: Array<{ category: string; status: string; count: number }>
  moodStats: Array<{ mood: string; count: number }>
  photoCount: number
  milestoneStats: { total: number; done: number }
  allGoals: Array<{ id: string; category: string; status: string }>
  allMilestones: Array<{ goal_id: string; done: number }>
  recentEntries: Array<{ id: string; date: string; title: string | null; mood: string | null; tags: string | null }>
  upcomingMilestones: Array<{ id: string; title: string; done: number; goal_id: string; goal_title: string; category: string }>
}

function getGreeting(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name.split(" ")[0]}.`
  if (h < 17) return `Good afternoon, ${name.split(" ")[0]}.`
  return `Good evening, ${name.split(" ")[0]}.`
}

function CategoryRing({ category, pct }: { category: string; pct: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const gap = circ - dash
  const color = categoryColor(category)
  return (
    <div className={styles.ringWrap}>
      <svg width="68" height="68" className="ring-svg">
        <circle cx="34" cy="34" r={r} className="ring-track" />
        <circle
          cx="34" cy="34" r={r}
          className="ring-fill"
          style={{ stroke: color, strokeDasharray: `${dash} ${gap}` }}
        />
        <text
          x="34" y="38"
          textAnchor="middle"
          className={styles.ringPct}
          style={{ fill: color }}
          transform="rotate(90, 34, 34)"
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className={styles.ringCat}>{categoryLabel(category).replace("Personal ", "")}</span>
    </div>
  )
}

export default function Dashboard({ userName }: { userName: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(({ stats }) => { setStats(stats); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={styles.loadWrap}>
        <div className="spinner" />
      </div>
    )
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  // compute per-category progress
  const catProgress: Record<string, number> = {}
  if (stats) {
    for (const cat of CATEGORIES) {
      const catGoals = stats.allGoals.filter((g) => g.category === cat)
      const catMilestones = stats.allMilestones.filter((m) =>
        catGoals.some((g) => g.id === m.goal_id)
      )
      if (catMilestones.length === 0) {
        const completed = catGoals.filter((g) => g.status === "completed").length
        catProgress[cat] = catGoals.length ? completed / catGoals.length : 0
      } else {
        const done = catMilestones.filter((m) => m.done).length
        catProgress[cat] = done / catMilestones.length
      }
    }
  }

  const totalGoals = stats?.allGoals.filter((g) => g.status === "active").length ?? 0
  const totalMilestones = stats ? Number(stats.milestoneStats?.total ?? 0) : 0
  const doneMilestones = stats ? Number(stats.milestoneStats?.done ?? 0) : 0
  const overallPct = totalMilestones ? doneMilestones / totalMilestones : 0

  // mood for recent entries (last 7 for sparkline)
  const recentMoods = (stats?.recentEntries ?? []).slice(0, 7).map((e) => e.mood ?? "okay").reverse()

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{getGreeting(userName)}</h1>
          <p className={styles.date}>{today}</p>
        </div>
        <Link href="/journal" className={`btn btn-gold ${styles.writeBtn}`}>
          + Write today
        </Link>
      </header>

      {/* Stats strip */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{totalGoals}</span>
          <span className={styles.statLabel}>Active goals</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{stats?.recentEntries?.length ?? 0}</span>
          <span className={styles.statLabel}>Recent entries</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{Math.round(overallPct * 100)}%</span>
          <span className={styles.statLabel}>Milestones done</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{stats?.photoCount ?? 0}</span>
          <span className={styles.statLabel}>Memories</span>
        </div>
      </div>

      {/* Life Wheel */}
      <section className={`card ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Life Wheel</h2>
          <Link href="/goals" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>View all →</Link>
        </div>
        <div className={styles.rings}>
          {CATEGORIES.map((cat) => (
            <CategoryRing key={cat} category={cat} pct={catProgress[cat] ?? 0} />
          ))}
        </div>
      </section>

      <div className={styles.twoCol}>
        {/* Recent Journal */}
        <section className={`card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Entries</h2>
            <Link href="/journal" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>All →</Link>
          </div>
          {!stats?.recentEntries?.length ? (
            <div className="empty">
              <span className="empty-icon">◻</span>
              <p className="empty-text">No entries yet. Start writing.</p>
            </div>
          ) : (
            <div className={styles.entries}>
              {stats.recentEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/journal/${entry.date}`}
                  className={styles.entryRow}
                >
                  <div className={styles.entryMood}>{moodEmoji(entry.mood ?? "okay")}</div>
                  <div className={styles.entryBody}>
                    <span className={styles.entryTitle}>{entry.title || "Untitled entry"}</span>
                    <span className={styles.entryDate}>{formatDateShort(entry.date)}</span>
                  </div>
                  {parseTags(entry.tags).slice(0, 2).map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Milestones */}
        <section className={`card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Up Next</h2>
            <Link href="/goals" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>Goals →</Link>
          </div>
          {!stats?.upcomingMilestones?.length ? (
            <div className="empty">
              <span className="empty-icon">◎</span>
              <p className="empty-text">Add milestones to your goals.</p>
            </div>
          ) : (
            <div className={styles.milestones}>
              {stats.upcomingMilestones.map((m) => (
                <div key={m.id} className={styles.milestone}>
                  <span
                    className={styles.milestoneDot}
                    style={{ background: categoryColor(m.category) }}
                  />
                  <div className={styles.milestoneBody}>
                    <span className={styles.milestoneTitle}>{m.title}</span>
                    <span className={styles.milestoneGoal}>{m.goal_title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mood sparkline */}
          {recentMoods.length > 0 && (
            <div className={styles.sparkWrap}>
              <span className={styles.sparkLabel}>Mood trend</span>
              <div className={styles.sparkline}>
                {recentMoods.map((mood, i) => (
                  <div
                    key={i}
                    className={styles.sparkBar}
                    style={{ height: `${MOOD_HEIGHTS[mood] ?? 50}%` }}
                    title={mood}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
