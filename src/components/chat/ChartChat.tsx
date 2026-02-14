import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Send, X, Search, Sparkles, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ChartChatProps {
  patientId: string;
  patientName: string;
}

type MessageRole = "user" | "assistant" | "system";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: string[];
}

let messageCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${++messageCounter}`;
}

export function ChartChat({ patientId, patientName }: ChartChatProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const addMessage = useCallback(
    (role: MessageRole, content: string, sources?: string[]) => {
      const msg: ChatMessage = { id: nextId(), role, content, sources };
      setMessages((prev) => [...prev, msg]);
      return msg.id;
    },
    [],
  );

  const updateMessage = useCallback(
    (id: string, updates: Partial<Pick<ChatMessage, "content" | "sources">>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
    },
    [],
  );

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleSubmit = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);

    // Add user message
    addMessage("user", question);

    // Show searching state
    const searchingId = addMessage("system", t("chartChat.searching", "Searching records..."));

    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        removeMessage(searchingId);
        addMessage("assistant", t("chartChat.authError", "Authentication error. Please sign in again."));
        setLoading(false);
        return;
      }

      // Update to answering state
      updateMessage(searchingId, {
        content: t("chartChat.answering", "Answering..."),
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            patient_id: patientId,
            question,
          }),
        },
      );

      // Remove system message
      removeMessage(searchingId);

      if (!response.ok) {
        addMessage(
          "assistant",
          t("chartChat.error", "Sorry, I couldn't process your question. Please try again."),
        );
        setLoading(false);
        return;
      }

      const data = await response.json();
      addMessage("assistant", data.answer ?? data.message ?? "", data.sources);
    } catch {
      removeMessage(searchingId);
      addMessage(
        "assistant",
        t("chartChat.networkError", "Network error. Please check your connection and try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Floating chat bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-[var(--c-primary)]/20 hover:scale-105 active:scale-95 transition-transform"
          aria-label={t("chartChat.open", "Open Smart Chart")}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[500px] glass-card rounded-2xl shadow-2xl border border-[var(--c-border)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--c-border)] shrink-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-semibold text-foreground leading-tight">
                {t("chartChat.title", "Smart Chart")}
              </h3>
              <p className="text-[11px] text-[var(--c-text-muted)] truncate">
                {patientName}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-[var(--c-surface-alt)] flex items-center justify-center transition-colors"
              aria-label={t("chartChat.close", "Close")}
            >
              <X className="w-4 h-4 text-[var(--c-text-muted)]" />
            </button>
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--c-primary)]/10 flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-[var(--c-primary)]" />
                </div>
                <p className="text-[13px] font-medium text-foreground mb-1">
                  {t("chartChat.welcomeTitle", "Ask about this patient")}
                </p>
                <p className="text-[11px] text-[var(--c-text-muted)] leading-relaxed">
                  {t(
                    "chartChat.welcomeSubtitle",
                    "I can search through medical records, lab results, and clinical notes to answer your questions.",
                  )}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-[var(--c-primary)]/10 text-foreground text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-md">
                      {msg.content}
                    </div>
                  </div>
                )}

                {msg.role === "assistant" && (
                  <div className="flex justify-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--c-surface-alt)] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[var(--c-text-secondary)]" />
                    </div>
                    <div className="max-w-[80%]">
                      <div className="bg-[var(--c-surface-alt)] text-foreground text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-md whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 px-1">
                          {msg.sources.map((source, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--c-text-dim)] bg-[var(--c-surface-alt)] border border-[var(--c-border)] rounded-full px-2 py-0.5"
                            >
                              <Search className="w-2.5 h-2.5" />
                              {source}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {msg.role === "system" && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--c-text-muted)] py-1">
                      {msg.content.includes(t("chartChat.searching", "Searching")) ? (
                        <Search className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      )}
                      <span className="animate-pulse">{msg.content}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="shrink-0 px-3 pb-3 pt-1">
            <div className="flex items-center gap-2 bg-[var(--c-surface-alt)] rounded-xl px-3 py-1.5 border border-[var(--c-border)] focus-within:border-[var(--c-primary)]/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chartChat.placeholder", "Ask a question...")}
                disabled={loading}
                className={cn(
                  "flex-1 bg-transparent text-[13px] text-foreground placeholder:text-[var(--c-text-dim)] outline-none py-1.5",
                  loading && "opacity-50",
                )}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  input.trim() && !loading
                    ? "gradient-primary text-white hover:opacity-90"
                    : "text-[var(--c-text-dim)]",
                )}
                aria-label={t("chartChat.send", "Send")}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
