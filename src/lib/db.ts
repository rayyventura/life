import { createClient, type InValue } from "@libsql/client"
import { generateId } from "./utils"

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

let initialized = false

export async function ensureSchema() {
  if (initialized) return
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    target_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    order_idx INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (goal_id) REFERENCES goals(id)
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    title TEXT,
    body TEXT,
    mood TEXT,
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_id TEXT,
    goal_id TEXT,
    url TEXT NOT NULL,
    caption TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (entry_id) REFERENCES journal_entries(id)
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    messages TEXT NOT NULL,
    entries_created TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_milestones_goal ON milestones(goal_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_photos_entry ON photos(entry_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_sessions(user_id)`)
  initialized = true
}

// --- Users ---
export async function upsertUser(user: { id: string; email: string; name: string; image: string }) {
  await ensureSchema()
  await db.execute({
    sql: `INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET name = excluded.name, image = excluded.image`,
    args: [user.id, user.email, user.name, user.image],
  })
}

export async function getUserByEmail(email: string) {
  await ensureSchema()
  const result = await db.execute({ sql: `SELECT * FROM users WHERE email = ?`, args: [email] })
  return result.rows[0] ?? null
}

// --- Goals ---
export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string
  status: string
  target_date: string | null
  created_at: string
  updated_at: string
}

export async function getGoals(userId: string): Promise<Goal[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  })
  return result.rows as unknown as Goal[]
}

export async function getGoal(userId: string, goalId: string): Promise<Goal | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM goals WHERE id = ? AND user_id = ?`,
    args: [goalId, userId],
  })
  return (result.rows[0] as unknown as Goal) ?? null
}

export async function createGoal(
  userId: string,
  data: { title: string; description?: string; category: string; target_date?: string }
): Promise<Goal> {
  await ensureSchema()
  const id = generateId()
  await db.execute({
    sql: `INSERT INTO goals (id, user_id, title, description, category, target_date) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, data.title, data.description ?? null, data.category, data.target_date ?? null],
  })
  return (await getGoal(userId, id))!
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: Partial<{ title: string; description: string; category: string; status: string; target_date: string }>
): Promise<void> {
  await ensureSchema()
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`)
    .join(", ")
  const values = Object.values(data).filter((v): v is string => v !== undefined)
  if (!fields) return
  await db.execute({
    sql: `UPDATE goals SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
    args: [...values, goalId, userId],
  })
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: `DELETE FROM milestones WHERE goal_id = ?`, args: [goalId] })
  await db.execute({ sql: `DELETE FROM goals WHERE id = ? AND user_id = ?`, args: [goalId, userId] })
}

// --- Milestones ---
export interface Milestone {
  id: string
  goal_id: string
  user_id: string
  title: string
  done: number
  order_idx: number
  completed_at: string | null
}

export async function getMilestones(goalId: string): Promise<Milestone[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM milestones WHERE goal_id = ? ORDER BY order_idx ASC`,
    args: [goalId],
  })
  return result.rows as unknown as Milestone[]
}

export async function createMilestone(
  goalId: string,
  userId: string,
  data: { title: string; order_idx?: number }
): Promise<Milestone> {
  await ensureSchema()
  const id = generateId()
  await db.execute({
    sql: `INSERT INTO milestones (id, goal_id, user_id, title, order_idx) VALUES (?, ?, ?, ?, ?)`,
    args: [id, goalId, userId, data.title, data.order_idx ?? 0],
  })
  const result = await db.execute({ sql: `SELECT * FROM milestones WHERE id = ?`, args: [id] })
  return result.rows[0] as unknown as Milestone
}

export async function updateMilestone(
  milestoneId: string,
  userId: string,
  data: { done?: boolean; title?: string }
): Promise<void> {
  await ensureSchema()
  if (data.done !== undefined) {
    await db.execute({
      sql: `UPDATE milestones SET done = ?, completed_at = ? WHERE id = ? AND user_id = ?`,
      args: [data.done ? 1 : 0, data.done ? new Date().toISOString() : null, milestoneId, userId],
    })
  }
  if (data.title !== undefined) {
    await db.execute({
      sql: `UPDATE milestones SET title = ? WHERE id = ? AND user_id = ?`,
      args: [data.title, milestoneId, userId],
    })
  }
}

export async function deleteMilestone(milestoneId: string, userId: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: `DELETE FROM milestones WHERE id = ? AND user_id = ?`, args: [milestoneId, userId] })
}

// --- Journal Entries ---
export interface JournalEntry {
  id: string
  user_id: string
  date: string
  title: string | null
  body: string | null
  mood: string | null
  tags: string | null
  created_at: string
  updated_at: string
}

export async function getJournalEntries(
  userId: string,
  options?: { limit?: number; offset?: number; mood?: string; tag?: string }
): Promise<JournalEntry[]> {
  await ensureSchema()
  let sql = `SELECT * FROM journal_entries WHERE user_id = ?`
  const args: InValue[] = [userId]
  if (options?.mood) { sql += ` AND mood = ?`; args.push(options.mood) }
  sql += ` ORDER BY date DESC`
  if (options?.limit) { sql += ` LIMIT ?`; args.push(options.limit) }
  if (options?.offset) { sql += ` OFFSET ?`; args.push(options.offset) }
  const result = await db.execute({ sql, args })
  return result.rows as unknown as JournalEntry[]
}

export async function getJournalEntryByDate(userId: string, date: string): Promise<JournalEntry | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM journal_entries WHERE user_id = ? AND date = ?`,
    args: [userId, date],
  })
  return (result.rows[0] as unknown as JournalEntry) ?? null
}

export async function getJournalEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM journal_entries WHERE id = ? AND user_id = ?`,
    args: [entryId, userId],
  })
  return (result.rows[0] as unknown as JournalEntry) ?? null
}

export async function upsertJournalEntry(
  userId: string,
  date: string,
  data: { title?: string; body?: string; mood?: string; tags?: string }
): Promise<JournalEntry> {
  await ensureSchema()
  const existing = await getJournalEntryByDate(userId, date)
  if (existing) {
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`)
      .join(", ")
    const values = Object.values(data).filter((v) => v !== undefined)
    if (fields) {
      await db.execute({
        sql: `UPDATE journal_entries SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
        args: [...values, existing.id, userId],
      })
    }
    return (await getJournalEntry(userId, existing.id))!
  } else {
    const id = generateId()
    await db.execute({
      sql: `INSERT INTO journal_entries (id, user_id, date, title, body, mood, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, date, data.title ?? null, data.body ?? null, data.mood ?? null, data.tags ?? null],
    })
    return (await getJournalEntry(userId, id))!
  }
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: `DELETE FROM photos WHERE entry_id = ?`, args: [entryId] })
  await db.execute({ sql: `DELETE FROM journal_entries WHERE id = ? AND user_id = ?`, args: [entryId, userId] })
}

export async function getEntryDatesForMonth(userId: string, year: number, month: number): Promise<string[]> {
  await ensureSchema()
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`
  const to = `${year}-${String(month + 1).padStart(2, "0")}-31`
  const result = await db.execute({
    sql: `SELECT date FROM journal_entries WHERE user_id = ? AND date >= ? AND date <= ?`,
    args: [userId, from, to],
  })
  return result.rows.map((r) => r.date as string)
}

// --- Photos ---
export interface Photo {
  id: string
  user_id: string
  entry_id: string | null
  goal_id: string | null
  url: string
  caption: string | null
  created_at: string
}

export async function getPhotos(userId: string, entryId?: string): Promise<Photo[]> {
  await ensureSchema()
  if (entryId) {
    const result = await db.execute({
      sql: `SELECT * FROM photos WHERE user_id = ? AND entry_id = ? ORDER BY created_at DESC`,
      args: [userId, entryId],
    })
    return result.rows as unknown as Photo[]
  }
  const result = await db.execute({
    sql: `SELECT * FROM photos WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  })
  return result.rows as unknown as Photo[]
}

export async function createPhoto(
  userId: string,
  data: { url: string; entry_id?: string; goal_id?: string; caption?: string }
): Promise<Photo> {
  await ensureSchema()
  const id = generateId()
  await db.execute({
    sql: `INSERT INTO photos (id, user_id, entry_id, goal_id, url, caption) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, data.entry_id ?? null, data.goal_id ?? null, data.url, data.caption ?? null],
  })
  const result = await db.execute({ sql: `SELECT * FROM photos WHERE id = ?`, args: [id] })
  return result.rows[0] as unknown as Photo
}

export async function deletePhoto(userId: string, photoId: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: `DELETE FROM photos WHERE id = ? AND user_id = ?`, args: [photoId, userId] })
}

// --- Stats ---
export async function getStats(userId: string) {
  await ensureSchema()
  const [goals, entries, photos, milestones] = await Promise.all([
    db.execute({ sql: `SELECT category, status, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY category, status`, args: [userId] }),
    db.execute({ sql: `SELECT mood, COUNT(*) as count FROM journal_entries WHERE user_id = ? GROUP BY mood`, args: [userId] }),
    db.execute({ sql: `SELECT COUNT(*) as count FROM photos WHERE user_id = ?`, args: [userId] }),
    db.execute({ sql: `SELECT COUNT(*) as total, SUM(done) as done FROM milestones WHERE user_id = ?`, args: [userId] }),
  ])
  const allGoals = await db.execute({ sql: `SELECT id, category, status FROM goals WHERE user_id = ?`, args: [userId] })
  const allMilestones = await db.execute({
    sql: `SELECT goal_id, done FROM milestones WHERE user_id = ?`,
    args: [userId],
  })
  const recentEntries = await db.execute({
    sql: `SELECT id, date, title, mood, tags FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT 5`,
    args: [userId],
  })
  const upcomingMilestones = await db.execute({
    sql: `SELECT m.id, m.title, m.done, m.goal_id, g.title as goal_title, g.category
          FROM milestones m JOIN goals g ON m.goal_id = g.id
          WHERE m.user_id = ? AND m.done = 0
          ORDER BY m.order_idx ASC LIMIT 5`,
    args: [userId],
  })
  return {
    goalStats: goals.rows,
    moodStats: entries.rows,
    photoCount: (photos.rows[0]?.count as number) ?? 0,
    milestoneStats: milestones.rows[0],
    allGoals: allGoals.rows,
    allMilestones: allMilestones.rows,
    recentEntries: recentEntries.rows,
    upcomingMilestones: upcomingMilestones.rows,
  }
}

// --- Search ---
export async function search(userId: string, query: string) {
  await ensureSchema()
  const like = `%${query}%`
  const [entries, goals] = await Promise.all([
    db.execute({
      sql: `SELECT id, date, title, body, mood, tags FROM journal_entries
            WHERE user_id = ? AND (title LIKE ? OR body LIKE ? OR tags LIKE ?)
            ORDER BY date DESC LIMIT 20`,
      args: [userId, like, like, like],
    }),
    db.execute({
      sql: `SELECT id, title, description, category, status FROM goals
            WHERE user_id = ? AND (title LIKE ? OR description LIKE ?)
            ORDER BY updated_at DESC LIMIT 20`,
      args: [userId, like, like],
    }),
  ])
  return { entries: entries.rows, goals: goals.rows }
}

// --- Chat Sessions ---
export interface ChatSession {
  id: string
  user_id: string
  messages: string
  entries_created: string | null
  created_at: string
}

export async function saveChatSession(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  entriesCreated?: object
): Promise<ChatSession> {
  await ensureSchema()
  const id = generateId()
  await db.execute({
    sql: `INSERT INTO chat_sessions (id, user_id, messages, entries_created) VALUES (?, ?, ?, ?)`,
    args: [id, userId, JSON.stringify(messages), entriesCreated ? JSON.stringify(entriesCreated) : null],
  })
  const result = await db.execute({ sql: `SELECT * FROM chat_sessions WHERE id = ?`, args: [id] })
  return result.rows[0] as unknown as ChatSession
}

export async function getChatSessions(userId: string, limit = 30): Promise<ChatSession[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [userId, limit],
  })
  return result.rows as unknown as ChatSession[]
}
}
