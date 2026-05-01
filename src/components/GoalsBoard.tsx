"use client"

import { useState, useTransition } from "react"
import styles from "./GoalsBoard.module.css"
import { categoryColor, categoryLabel, formatDate } from "@/lib/utils"
import type { Goal, Milestone } from "@/lib/db"

const CATEGORIES = ["all", "career", "health", "finance", "relationships", "growth", "learning", "creative"]
const STATUSES = ["active", "completed", "paused"]

interface GoalWithMilestones extends Goal {
  milestones: Milestone[]
}

interface GoalsBoardProps {
  initialGoals: GoalWithMilestones[]
}

function GoalForm({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void
  onSave: (goal: Goal) => void
  initial?: Partial<Goal>
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "career",
    target_date: initial?.target_date ?? "",
    status: initial?.status ?? "active",
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const method = initial?.id ? "PATCH" : "POST"
    const url = initial?.id ? `/api/goals/${initial.id}` : "/api/goals"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const { goal } = await res.json()
    onSave(goal)
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{initial?.id ? "Edit goal" : "New goal"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className={styles.formGrid}>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="label">Goal title</label>
            <input
              className="input"
              placeholder="What do you want to achieve?"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              placeholder="Why does this matter to you?"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ minHeight: "80px" }}
            />
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <select
              className="select input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Target date</label>
            <input
              type="date"
              className="input"
              value={form.target_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
              style={{ colorScheme: "dark" }}
            />
          </div>
          {initial?.id && (
            <div className="form-group">
              <label className="label">Status</label>
              <select
                className="select input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className={styles.formActions}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save goal"}
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: GoalWithMilestones
  onUpdate: (g: Goal) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [milestones, setMilestones] = useState(goal.milestones)
  const [newMs, setNewMs] = useState("")
  const [, startT] = useTransition()
  const color = categoryColor(goal.category)
  const done = milestones.filter((m) => m.done).length
  const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0

  const toggleMilestone = (id: string, current: number) => {
    const next = !current
    setMilestones((ms) => ms.map((m) => m.id === id ? { ...m, done: next ? 1 : 0 } : m))
    startT(async () => {
      await fetch(`/api/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      })
    })
  }

  const addMilestone = async () => {
    if (!newMs.trim()) return
    const res = await fetch(`/api/goals/${goal.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newMs.trim(), order_idx: milestones.length }),
    })
    const { milestone } = await res.json()
    setMilestones((ms) => [...ms, milestone])
    setNewMs("")
  }

  const deleteMilestone = async (id: string) => {
    setMilestones((ms) => ms.filter((m) => m.id !== id))
    await fetch(`/api/milestones/${id}`, { method: "DELETE" })
  }

  const deleteGoal = async () => {
    if (!confirm(`Delete "${goal.title}"?`)) return
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" })
    onDelete(goal.id)
  }

  return (
    <>
      {editing && (
        <GoalForm
          initial={goal}
          onClose={() => setEditing(false)}
          onSave={(g) => { onUpdate(g); setEditing(false) }}
        />
      )}
      <div className={styles.card} data-status={goal.status}>
        <div className={styles.cardHeader}>
          <span className="badge" style={{ color, borderColor: color + "44", background: color + "11" }}>
            {categoryLabel(goal.category).replace("Personal ", "")}
          </span>
          <span className={styles.statusBadge} data-status={goal.status}>{goal.status}</span>
        </div>

        <h3 className={styles.cardTitle}>{goal.title}</h3>
        {goal.description && <p className={styles.cardDesc}>{goal.description}</p>}

        {milestones.length > 0 && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className={styles.progressPct} style={{ color }}>{pct}%</span>
          </div>
        )}

        <div className={styles.cardMeta}>
          {goal.target_date && (
            <span className={styles.metaItem}>↗ {formatDate(goal.target_date)}</span>
          )}
          {milestones.length > 0 && (
            <span className={styles.metaItem}>{done}/{milestones.length} milestones</span>
          )}
        </div>

        <div className={styles.cardActions}>
          <button
            className={`btn btn-ghost ${styles.expandBtn}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "↑ Collapse" : "↓ Milestones"}
          </button>
          <button className="btn btn-ghost" onClick={() => setEditing(true)} style={{ fontSize: "0.8rem" }}>Edit</button>
          <button className="btn btn-danger" onClick={deleteGoal} style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem" }}>✕</button>
        </div>

        {expanded && (
          <div className={styles.milestones}>
            {milestones.map((m) => (
              <div key={m.id} className={styles.milestoneRow}>
                <button
                  className={`${styles.checkbox} ${m.done ? styles.checked : ""}`}
                  style={m.done ? { borderColor: color, background: color + "22" } : {}}
                  onClick={() => toggleMilestone(m.id, m.done)}
                >
                  {m.done && <span style={{ color }}>✓</span>}
                </button>
                <span className={`${styles.milestoneText} ${m.done ? styles.doneText : ""}`}>
                  {m.title}
                </span>
                <button
                  className={styles.deleteMs}
                  onClick={() => deleteMilestone(m.id)}
                >×</button>
              </div>
            ))}
            <div className={styles.addMs}>
              <input
                className="input"
                placeholder="Add milestone…"
                value={newMs}
                onChange={(e) => setNewMs(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMilestone()}
                style={{ fontSize: "0.82rem" }}
              />
              <button className="btn btn-outline" onClick={addMilestone} style={{ fontSize: "0.82rem" }}>+</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function GoalsBoard({ initialGoals }: GoalsBoardProps) {
  const [goals, setGoals] = useState<GoalWithMilestones[]>(initialGoals)
  const [filter, setFilter] = useState("all")
  const [creating, setCreating] = useState(false)

  const filtered = filter === "all" ? goals : goals.filter((g) => g.category === filter)

  const updateGoal = (updated: Goal) => {
    setGoals((gs) => gs.map((g) => g.id === updated.id ? { ...g, ...updated } : g))
  }

  const deleteGoal = (id: string) => {
    setGoals((gs) => gs.filter((g) => g.id !== id))
  }

  return (
    <div className={styles.root}>
      {creating && (
        <GoalForm
          onClose={() => setCreating(false)}
          onSave={(g) => {
            setGoals((gs) => [{ ...g, milestones: [] }, ...gs])
            setCreating(false)
          }}
        />
      )}

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ""}`}
              onClick={() => setFilter(cat)}
              style={filter === cat && cat !== "all" ? { color: categoryColor(cat) } : {}}
            >
              {cat === "all" ? "All" : categoryLabel(cat).replace("Personal ", "")}
            </button>
          ))}
        </div>
        <button className="btn btn-gold" onClick={() => setCreating(true)}>+ New goal</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">◎</span>
          <p className="empty-text">No goals here yet.</p>
          <button className="btn btn-outline" onClick={() => setCreating(true)}>Add your first goal</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onDelete={deleteGoal} />
          ))}
        </div>
      )}
    </div>
  )
}
