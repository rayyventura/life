"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import styles from "./AIChat.module.css"

interface Message {
  role: "user" | "assistant"
  content: string
  created?: { journal?: { date: string; title: string }; goalNotes?: string[] }
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export default function AIChat({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState("")
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMsg: Message = { role: "user", content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setLiveTranscript("")
    setIsLoading(true)
    setExpanded(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply ?? "Tell me more.",
        created: data.created,
      }
      setMessages((ms) => [...ms, assistantMsg])
    } catch {
      setMessages((ms) => [...ms, { role: "assistant", content: "Something went wrong. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || "en-US"
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("")
      setLiveTranscript(transcript)
      setInput(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      const final = recognitionRef.current ? input || liveTranscript : ""
      // Give a brief moment for state to settle
      setTimeout(() => {
        setInput((cur) => { if (cur.trim()) send(cur); return cur })
      }, 100)
    }

    recognition.onerror = () => setIsListening(false)

    recognition.start()
  }, [input, liveTranscript, send])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const firstName = userName.split(" ")[0]

  return (
    <div className={`${styles.root} ${expanded ? styles.expanded : ""}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.pulse} data-listening={isListening} />
          <div>
            <h2 className={styles.title}>
              {messages.length === 0
                ? `How was your ${timeGreeting}, ${firstName}?`
                : "Continue the conversation"}
            </h2>
            <p className={styles.subtitle}>
              {isListening ? "Listening…" : "Speak or type — I'll save everything across your journal and goals."}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            className={styles.toggleBtn}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {/* Chat history */}
      {expanded && messages.length > 0 && (
        <div className={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.msg} ${msg.role === "user" ? styles.userMsg : styles.aiMsg}`}>
              {msg.role === "assistant" && <span className={styles.aiIcon}>✦</span>}
              <div className={styles.msgContent}>
                <p className={styles.msgText}>{msg.content}</p>
                {msg.created?.journal && (
                  <div className={styles.createdCard}>
                    <span className={styles.createdIcon}>◻</span>
                    <span>Journal entry saved: <em>{msg.created.journal.title}</em></span>
                  </div>
                )}
                {msg.created?.goalNotes?.map((note, j) => (
                  <div key={j} className={styles.createdCard}>
                    <span className={styles.createdIcon}>◎</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.msg} ${styles.aiMsg}`}>
              <span className={styles.aiIcon}>✦</span>
              <div className={styles.thinking}>
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input area */}
      <div className={styles.inputArea}>
        {/* Live transcript hint */}
        {isListening && liveTranscript && (
          <p className={styles.liveTranscript}>{liveTranscript}</p>
        )}

        <div className={styles.inputRow}>
          {/* Voice button */}
          {voiceSupported && (
            <button
              className={`${styles.micBtn} ${isListening ? styles.micActive : ""}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? "Stop recording" : "Start voice input"}
              disabled={isLoading}
            >
              {isListening ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder={isListening ? "Listening…" : "Describe your day, a thought, a win, a struggle…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            disabled={isLoading || isListening}
          />

          <button
            className={styles.sendBtn}
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "→"}
          </button>
        </div>

        {messages.length > 0 && (
          <div className={styles.sessionActions}>
            <button
              className={styles.clearBtn}
              onClick={() => { setMessages([]); setExpanded(false) }}
            >
              Start new session
            </button>
            <a href="/insights" className={styles.insightsLink}>
              View all sessions →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
