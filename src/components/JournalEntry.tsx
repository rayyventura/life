"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import styles from "./JournalEntry.module.css"
import { formatDate, parseTags, stringifyTags, moodLabel } from "@/lib/utils"
import type { JournalEntry, Photo } from "@/lib/db"

const MOODS = ["amazing", "good", "okay", "low", "rough"] as const
const MOOD_SYMBOLS: Record<string, string> = {
  amazing: "✦", good: "◉", okay: "◎", low: "◌", rough: "○",
}
const MOOD_COLORS: Record<string, string> = {
  amazing: "#c4a882", good: "#7c9e87", okay: "#a8c4c4", low: "#a8a8c4", rough: "#c48282",
}

interface JournalEntryEditorProps {
  date: string
  initialEntry: JournalEntry | null
  initialPhotos: Photo[]
}

export default function JournalEntryEditor({ date, initialEntry, initialPhotos }: JournalEntryEditorProps) {
  const [title, setTitle] = useState(initialEntry?.title ?? "")
  const [body, setBody] = useState(initialEntry?.body ?? "")
  const [mood, setMood] = useState<string>(initialEntry?.mood ?? "")
  const [tags, setTags] = useState<string[]>(parseTags(initialEntry?.tags ?? null))
  const [tagInput, setTagInput] = useState("")
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [entryId, setEntryId] = useState(initialEntry?.id ?? "")

  const save = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/journal/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, title, body, mood: mood || null, tags: tags.length ? tags : undefined }),
    })
    const { entry } = await res.json()
    if (entry?.id) setEntryId(entry.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [date, title, body, mood, tags])

  // Auto-save debounce
  useEffect(() => {
    if (!title && !body && !mood) return
    const timer = setTimeout(() => save(), 1500)
    return () => clearTimeout(timer)
  }, [title, body, mood, save])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((ts) => [...ts, t])
    setTagInput("")
  }

  const removeTag = (t: string) => setTags((ts) => ts.filter((x) => x !== t))

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    if (entryId) fd.append("entry_id", entryId)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const { photo } = await res.json()
    if (photo) setPhotos((ps) => [...ps, photo])
    setUploading(false)
  }

  const removePhoto = async (photoId: string) => {
    setPhotos((ps) => ps.filter((p) => p.id !== photoId))
    await fetch(`/api/photos?id=${photoId}`, { method: "DELETE" })
  }

  return (
    <div className={styles.root}>
      <div className={styles.dateHeader}>
        <span className={styles.dateLabel}>{formatDate(date)}</span>
        <div className={styles.saveStatus}>
          {saving && <span className={styles.saving}>saving…</span>}
          {saved && <span className={styles.saved}>✓ saved</span>}
        </div>
      </div>

      {/* Mood selector */}
      <div className={styles.moodStrip}>
        {MOODS.map((m) => (
          <button
            key={m}
            className={`${styles.moodBtn} ${mood === m ? styles.moodActive : ""}`}
            style={mood === m ? { color: MOOD_COLORS[m], borderColor: MOOD_COLORS[m] } : {}}
            onClick={() => setMood(mood === m ? "" : m)}
            title={moodLabel(m)}
          >
            <span className={styles.moodSymbol}>{MOOD_SYMBOLS[m]}</span>
            <span className={styles.moodName}>{moodLabel(m)}</span>
          </button>
        ))}
      </div>

      <input
        className={styles.titleInput}
        placeholder="What's the title of today's story?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className={styles.bodyInput}
        placeholder="Write anything. Your thoughts, your wins, your struggles, what you noticed, who you spoke to, what you felt…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {/* Tags */}
      <div className={styles.tagRow}>
        <div className={styles.tags}>
          {tags.map((t) => (
            <span key={t} className={styles.tag}>
              #{t}
              <button className={styles.removeTag} onClick={() => removeTag(t)}>×</button>
            </span>
          ))}
        </div>
        <div className={styles.tagInputWrap}>
          <input
            className={styles.tagInput}
            placeholder="Add tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() } }}
          />
        </div>
      </div>

      {/* Photo upload */}
      <div className={styles.photoSection}>
        <div className={styles.photoHeader}>
          <span className={styles.photoLabel}>Memories</span>
          <label className={`btn btn-outline ${styles.uploadBtn}`}>
            {uploading ? "Uploading…" : "+ Photo"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              disabled={uploading}
            />
          </label>
        </div>

        {photos.length > 0 && (
          <div className={styles.photoGrid}>
            {photos.map((photo) => (
              <div key={photo.id} className={styles.photoWrap}>
                <Image
                  src={photo.url}
                  alt={photo.caption ?? "Memory"}
                  width={200}
                  height={150}
                  className={styles.photo}
                />
                <button className={styles.removePhoto} onClick={() => removePhoto(photo.id)}>×</button>
                {photo.caption && <span className={styles.caption}>{photo.caption}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className="btn btn-gold" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save entry"}
        </button>
      </div>
    </div>
  )
}
