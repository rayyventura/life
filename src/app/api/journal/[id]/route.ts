import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getJournalEntry, upsertJournalEntry, deleteJournalEntry, getJournalEntryByDate } from "@/lib/db"
import { stringifyTags } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // id can be an ISO date (YYYY-MM-DD) or an entry uuid
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(params.id)
  const entry = isDate
    ? await getJournalEntryByDate(session.user.id, params.id)
    : await getJournalEntry(session.user.id, params.id)
  if (!entry) return NextResponse.json({ entry: null })
  return NextResponse.json({ entry })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
  return NextResponse.json({ entry })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await deleteJournalEntry(session.user.id, params.id)
  return NextResponse.json({ ok: true })
}
