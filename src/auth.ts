import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { upsertUser } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.id || !user.email) return false
      try {
        await upsertUser({
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          image: user.image ?? "",
        })
      } catch (e) {
        console.error("Failed to upsert user:", e)
        return false
      }
      return true
    },
  },
})
