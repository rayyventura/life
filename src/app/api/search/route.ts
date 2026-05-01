import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { search } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  if (!q.trim()) return NextResponse.json({ entries: [], goals: [] })
  const results = await search(session.user.id, q.trim())
  return NextResponse.json(results)
}
