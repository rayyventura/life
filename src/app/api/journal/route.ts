import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getJournalEntries, upsertJournalEntry, getEntryDatesForMonth } from "@/lib/db"
import { stringifyTags } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")
  const year = searchParams.get("year")
  const limit = searchParams.get("limit")
  const mood = searchParams.get("mood")
  if (month && year) {
    const dates = await getEntryDatesForMonth(session.user.id, parseInt(year), parseInt(month))
    return NextResponse.json({ dates })
  }
  const entries = await getJournalEntries(session.user.id, {
    limit: limit ? parseInt(limit) : undefined,
    mood: mood ?? undefined,
  })
  return NextResponse.json({ entries })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { date, title, body: text, mood, tags } = body
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 })
  const entry = await upsertJournalEntry(session.user.id, date, {
    title,
    body: text,
    mood,
    tags: tags ? stringifyTags(tags) : undefined,
  })
  return NextResponse.json({ entry }, { status: 201 })
}
