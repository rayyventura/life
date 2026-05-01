import { auth } from "@/auth"
import { getGoals } from "@/lib/db"
import MindMap from "@/components/MindMap"

export default async function MindMapPage() {
  const session = await auth()
  const goals = await getGoals(session!.user.id)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mind Map</h1>
        <p className="page-subtitle">See all your goals at once.</p>
      </div>
      <MindMap goals={goals} />
    </div>
  )
}
