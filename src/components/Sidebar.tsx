"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./Sidebar.module.css"

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

const NAV = [
  { href: "/", label: "Dashboard", icon: "◈" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/journal", label: "Journal", icon: "◻" },
  { href: "/mindmap", label: "Mind Map", icon: "◉" },
  { href: "/gallery", label: "Gallery", icon: "▣" },
  { href: "/search", label: "Search", icon: "◇" },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>life.</div>

      <nav className={styles.nav}>
        {NAV.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className={styles.navLabel}>{label}</span>
              {active && <span className={styles.navDot} />}
            </Link>
          )
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.user}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ""} className={styles.avatar} referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name ?? "Friend"}</span>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        </div>
        <button
          className={styles.signOut}
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
        >
          ⇥
        </button>
      </div>
    </aside>
  )
}
