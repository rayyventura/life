"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import styles from "./MindMap.module.css"
import { categoryColor, categoryLabel } from "@/lib/utils"

interface MindMapGoal { id: string; title: string; category: string; status: string }

const CATEGORIES = ["career", "health", "finance", "relationships", "growth", "learning", "creative"]
const CX = 500
const CY = 380
const BRANCH_R = 200
const LEAF_R = 340

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
}

export default function MindMap({ goals }: { goals: MindMapGoal[] }) {
  const router = useRouter()

  const goalsByCategory = useMemo(() => {
    const map: Record<string, MindMapGoal[]> = {}
    for (const cat of CATEGORIES) map[cat] = []
    for (const g of goals) {
      if (map[g.category]) map[g.category].push(g)
    }
    return map
  }, [goals])

  const angleStep = 360 / CATEGORIES.length

  return (
    <div className={styles.root}>
      <div className={styles.legend}>
        {CATEGORIES.map((cat) => (
          <div key={cat} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: categoryColor(cat) }} />
            <span className={styles.legendLabel}>{categoryLabel(cat).replace("Personal ", "")}</span>
            <span className={styles.legendCount}>{goalsByCategory[cat].length}</span>
          </div>
        ))}
      </div>

      <svg viewBox="0 0 1000 760" className={styles.svg} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {CATEGORIES.map((cat, catIdx) => {
          const angle = catIdx * angleStep
          const catPt = polarToCartesian(CX, CY, BRANCH_R, angle)
          const color = categoryColor(cat)
          const catGoals = goalsByCategory[cat]

          return (
            <g key={cat}>
              {/* Branch line: center → category */}
              <path
                d={cubicBezier(CX, CY, catPt.x, catPt.y)}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.4"
                className={styles.branchLine}
              />

              {/* Category node */}
              <circle
                cx={catPt.x}
                cy={catPt.y}
                r="28"
                fill={color + "18"}
                stroke={color}
                strokeWidth="1.5"
                className={styles.catNode}
              />
              <text
                x={catPt.x}
                y={catPt.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                className={styles.catLabel}
              >
                {categoryLabel(cat).replace("Personal ", "").slice(0, 6)}
              </text>

              {/* Goal leaves */}
              {catGoals.slice(0, 4).map((goal, gIdx) => {
                const totalLeaves = Math.min(catGoals.length, 4)
                const spread = totalLeaves > 1 ? 22 : 0
                const leafAngle = angle + (gIdx - (totalLeaves - 1) / 2) * spread
                const leafPt = polarToCartesian(CX, CY, LEAF_R, leafAngle)

                return (
                  <g key={goal.id} className={styles.leafGroup} onClick={() => router.push("/goals")}>
                    {/* Leaf line: category → goal */}
                    <path
                      d={cubicBezier(catPt.x, catPt.y, leafPt.x, leafPt.y)}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity="0.25"
                      strokeDasharray="4 3"
                    />
                    {/* Goal node */}
                    <circle
                      cx={leafPt.x}
                      cy={leafPt.y}
                      r="22"
                      fill={goal.status === "completed" ? color + "30" : color + "10"}
                      stroke={color}
                      strokeWidth={goal.status === "completed" ? "1.5" : "1"}
                      strokeOpacity={goal.status === "completed" ? "0.8" : "0.4"}
                    />
                    {goal.status === "completed" && (
                      <text x={leafPt.x} y={leafPt.y + 1} textAnchor="middle" dominantBaseline="middle" fill={color} className={styles.doneCheck}>✓</text>
                    )}
                    {/* Truncated goal title */}
                    <foreignObject
                      x={leafPt.x - 44}
                      y={leafPt.y + 26}
                      width="88"
                      height="30"
                    >
                      <div
                        style={{
                          fontSize: "9px",
                          color: color,
                          textAlign: "center",
                          lineHeight: 1.3,
                          opacity: 0.8,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {goal.title}
                      </div>
                    </foreignObject>
                  </g>
                )
              })}

              {/* +N indicator if more goals */}
              {catGoals.length > 4 && (
                <text
                  x={catPt.x}
                  y={catPt.y + 38}
                  textAnchor="middle"
                  fill={color}
                  className={styles.moreGoals}
                >
                  +{catGoals.length - 4} more
                </text>
              )}
            </g>
          )
        })}

        {/* Center node */}
        <circle cx={CX} cy={CY} r="44" fill="var(--ink-muted)" stroke="var(--gold)" strokeWidth="1.5" filter="url(#glow)" />
        <text x={CX} y={CY - 6} textAnchor="middle" fill="var(--gold)" className={styles.centerLabel}>life.</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fill="var(--bone-dim)" className={styles.centerSub}>{goals.length} goals</text>
      </svg>
    </div>
  )
}
