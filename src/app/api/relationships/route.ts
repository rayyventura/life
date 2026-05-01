import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getRelationshipEntries, createRelationshipEntry } from "@/lib/db"
import { todayISO } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const entries = await getRelationshipEntries(session.user.id, 50)
  return NextResponse.json({ entries })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as { person?: string; note?: string; sentiment?: string; date?: string }
  if (!body.person?.trim() || !body.note?.trim()) {
    return NextResponse.json({ error: "person and note are required" }, { status: 400 })
  }

  const entry = await createRelationshipEntry(session.user.id, {
    date: body.date ?? todayISO(),
    person: body.person.trim(),
    note: body.note.trim(),
    sentiment: body.sentiment,
    source: "manual",
  })

  return NextResponse.json({ entry }, { status: 201 })
}
