"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import styles from "./JournalCalendar.module.css"
import { getDaysInMonth, getFirstDayOfMonth, formatDateISO, todayISO } from "@/lib/utils"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function JournalCalendar({ initialEntryDates }: { initialEntryDates: string[] }) {
  const router = useRouter()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [entryDates, setEntryDates] = useState(new Set(initialEntryDates))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/journal?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(({ dates }) => {
        setEntryDates(new Set(dates))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = todayISO()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth}>←</button>
        <h2 className={styles.monthTitle}>
          {MONTHS[month]} <span className={styles.year}>{year}</span>
        </h2>
        <button className={styles.navBtn} onClick={nextMonth}>→</button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const hasEntry = entryDates.has(dateStr)
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr
          return (
            <button
              key={dateStr}
              className={`${styles.day} ${hasEntry ? styles.hasEntry : ""} ${isToday ? styles.today : ""} ${isFuture ? styles.future : ""}`}
              onClick={() => !isFuture && router.push(`/journal/${dateStr}`)}
              disabled={isFuture}
            >
              {day}
              {hasEntry && <span className={styles.dot} />}
            </button>
          )
        })}
      </div>

      {loading && <div className={styles.loadingBar} />}
    </div>
  )
}
