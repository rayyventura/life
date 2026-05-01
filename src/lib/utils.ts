import { randomBytes } from "crypto"

export function generateId(): string {
  return randomBytes(12).toString("hex")
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function todayISO(): string {
  return formatDateISO(new Date())
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function moodEmoji(mood: string): string {
  const map: Record<string, string> = {
    amazing: "✦",
    good: "◉",
    okay: "◎",
    low: "◌",
    rough: "○",
  }
  return map[mood] ?? "◎"
}

export function moodLabel(mood: string): string {
  const map: Record<string, string> = {
    amazing: "Amazing",
    good: "Good",
    okay: "Okay",
    low: "Low",
    rough: "Rough",
  }
  return map[mood] ?? mood
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    career: "#c4a882",
    health: "#7c9e87",
    finance: "#a8c4c4",
    relationships: "#c48282",
    growth: "#a882c4",
    learning: "#82a8c4",
    creative: "#c4c482",
  }
  return map[category] ?? "#c4a882"
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    career: "Career",
    health: "Health",
    finance: "Finance",
    relationships: "Relationships",
    growth: "Personal Growth",
    learning: "Learning",
    creative: "Creative",
  }
  return map[category] ?? category
}

export function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try {
    return JSON.parse(tags)
  } catch {
    return []
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags)
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}
