import { auth } from "@/auth"
import Dashboard from "@/components/Dashboard"
import AIChat from "@/components/AIChat"

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? "Friend"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <AIChat userName={name} />
      <Dashboard userName={name} />
    </div>
  )
}
