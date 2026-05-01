import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = request.nextUrl
      if (pathname.startsWith("/login")) {
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl))
        return true
      }
      if (pathname.startsWith("/api/auth")) return true
      return isLoggedIn
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
}
