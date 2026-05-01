import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getStats } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const stats = await getStats(session.user.id)
  return NextResponse.json({ stats })
}
