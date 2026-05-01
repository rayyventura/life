import { auth } from "@/auth"
import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { getGoals, upsertJournalEntry, createMilestone, saveChatSession, getMilestones } from "@/lib/db"
import { todayISO, categoryLabel, stringifyTags } from "@/lib/utils"

export const dynamic = "force-dynamic"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface ChatMessage { role: "user" | "assistant" | "system"; content: string }

interface AIResponse {
  reply: string
  shouldSave: boolean
  journal?: {
    title: string
    body: string
    mood: "amazing" | "good" | "okay" | "low" | "rough"
    tags: string[]
  }
  goalUpdates?: Array<{
    category: string
    note: string
  }>
}

function buildSystemPrompt(goals: Array<{ title: string; category: string; status: string }>, today: string): string {
  const activeGoals = goals.filter((g) => g.status === "active")
  const goalList = activeGoals.length
    ? activeGoals.map((g) => `- ${categoryLabel(g.category)}: "${g.title}"`).join("\n")
    : "No active goals yet."

  return `You are a warm, compassionate life journaling companion. The user describes their day, thoughts, experiences, and progress through voice or text.

Your role:
1. Respond conversationally — be warm, curious, and supportive. Ask one meaningful follow-up question if helpful.
2. Extract structured life entries from the FULL conversation so far.
3. Write journal entries in first person, capturing the user's voice authentically.

Today's date: ${today}

User's active goals:
${goalList}

ALWAYS respond with valid JSON in this exact shape:
{
  "reply": "Your warm, conversational response (2-4 sentences). Ask a follow-up if it helps depth.",
  "shouldSave": true or false (true when conversation has meaningful content worth preserving),
  "journal": {
    "title": "A poetic, personal title for this day",
    "body": "A rich, reflective journal entry written in first person based on everything shared. 2-5 paragraphs. Capture emotions, specific details, insights.",
    "mood": "amazing|good|okay|low|rough",
    "tags": ["tag1", "tag2"]
  },
  "goalUpdates": [
    {
      "category": "career|health|finance|relationships|growth|learning|creative",
      "note": "Specific progress note for this goal category"
    }
  ]
}

If shouldSave is false (e.g., user just said "hi"), omit journal and goalUpdates.
goalUpdates should only include categories actually mentioned in the conversation.
The journal body should weave together everything the user has shared — make it worth re-reading years from now.`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messages } = await req.json() as { messages: ChatMessage[] }
  if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 })

  const userId = session.user.id
  const today = todayISO()

  const goals = await getGoals(userId)
  const systemPrompt = buildSystemPrompt(goals, today)

  // Call Groq
  let aiData: AIResponse
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2048,
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"
    aiData = JSON.parse(raw) as AIResponse
  } catch (err) {
    console.error("Groq error:", err)
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 })
  }

  const created: { journal?: { date: string; title: string }; goalNotes: string[] } = {
    goalNotes: [],
  }

  // Auto-create entries if AI says we have enough
  if (aiData.shouldSave) {
    // Save journal entry
    if (aiData.journal) {
      try {
        await upsertJournalEntry(userId, today, {
          title: aiData.journal.title,
          body: aiData.journal.body,
          mood: aiData.journal.mood,
          tags: stringifyTags(aiData.journal.tags ?? []),
        })
        created.journal = { date: today, title: aiData.journal.title }
      } catch (e) {
        console.error("Failed to save journal:", e)
      }
    }

    // Save goal notes as milestones
    if (aiData.goalUpdates?.length) {
      for (const update of aiData.goalUpdates) {
        const matchingGoal = goals.find((g) => g.category === update.category && g.status === "active")
        if (matchingGoal) {
          try {
            const existingMs = await getMilestones(matchingGoal.id)
            await createMilestone(matchingGoal.id, userId, {
              title: `📝 ${today}: ${update.note}`,
              order_idx: existingMs.length,
            })
            created.goalNotes.push(`${categoryLabel(update.category)}: ${update.note}`)
          } catch (e) {
            console.error("Failed to save goal note:", e)
          }
        }
      }
    }

    // Persist chat session
    try {
      await saveChatSession(userId, messages, created)
    } catch (e) {
      console.error("Failed to save session:", e)
    }
  }

  return NextResponse.json({
    reply: aiData.reply ?? "Tell me more about your day.",
    created,
    shouldSave: aiData.shouldSave,
  })
}
