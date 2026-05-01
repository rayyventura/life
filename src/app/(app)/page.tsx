import { auth } from "@/auth"
import Dashboard from "@/components/Dashboard"

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? "Friend"
  return (
    <div>
      <Dashboard userName={name} />
    </div>
  )
}
