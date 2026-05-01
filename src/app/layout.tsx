import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "life. — your second brain",
  description: "Track your long-term goals, journal your days, and build your life story.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
