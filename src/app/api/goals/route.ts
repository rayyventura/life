import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getGoals, createGoal } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const goals = await getGoals(session.user.id)
  return NextResponse.json({ goals })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { title, description, category, target_date } = body
  if (!title || !category) return NextResponse.json({ error: "title and category required" }, { status: 400 })
  const goal = await createGoal(session.user.id, { title, description, category, target_date })
  return NextResponse.json({ goal }, { status: 201 })
}
