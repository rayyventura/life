import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getGoal, updateGoal, deleteGoal } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const goal = await getGoal(session.user.id, params.id)
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ goal })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  await updateGoal(session.user.id, params.id, body)
  const goal = await getGoal(session.user.id, params.id)
  return NextResponse.json({ goal })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await deleteGoal(session.user.id, params.id)
  return NextResponse.json({ ok: true })
}
