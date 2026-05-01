import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createPhoto } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const entryId = formData.get("entry_id") as string | null
  const goalId = formData.get("goal_id") as string | null
  const caption = formData.get("caption") as string | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  const blob = await put(`life-journal/${session.user.id}/${Date.now()}-${file.name}`, file, {
    access: "public",
  })
  const photo = await createPhoto(session.user.id, {
    url: blob.url,
    entry_id: entryId ?? undefined,
    goal_id: goalId ?? undefined,
    caption: caption ?? undefined,
  })
  return NextResponse.json({ photo, url: blob.url }, { status: 201 })
}
