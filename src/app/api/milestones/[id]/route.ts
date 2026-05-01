import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { updateMilestone, deleteMilestone } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  await updateMilestone(params.id, session.user.id, body)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await deleteMilestone(params.id, session.user.id)
  return NextResponse.json({ ok: true })
}
