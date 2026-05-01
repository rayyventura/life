import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getMilestones, createMilestone } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const milestones = await getMilestones(params.id)
  return NextResponse.json({ milestones })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { title, order_idx } = await req.json()
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })
  const milestone = await createMilestone(params.id, session.user.id, { title, order_idx })
  return NextResponse.json({ milestone }, { status: 201 })
}
