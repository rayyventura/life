import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getPhotos, deletePhoto } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const entryId = searchParams.get("entry_id") ?? undefined
  const photos = await getPhotos(session.user.id, entryId)
  return NextResponse.json({ photos })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await deletePhoto(session.user.id, id)
  return NextResponse.json({ ok: true })
}
