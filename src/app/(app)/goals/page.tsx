import { auth } from "@/auth"
import { getGoals, getMilestones } from "@/lib/db"
import GoalsBoard from "@/components/GoalsBoard"

export default async function GoalsPage() {
  const session = await auth()
  const userId = session!.user.id
  const goals = await getGoals(userId)
  const goalsWithMilestones = await Promise.all(
    goals.map(async (g) => ({ ...g, milestones: await getMilestones(g.id) }))
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Goals</h1>
        <p className="page-subtitle">Track what you are building toward.</p>
      </div>
      <GoalsBoard initialGoals={goalsWithMilestones} />
    </div>
  )
}
