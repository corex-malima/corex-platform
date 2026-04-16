"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { fetchJson } from "@/lib/fetch-json";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DashboardSummary {
  activeCount: number;
  plannedCount: number;
  historyCount: number;
  totalStems: number;
  areas: string[];
  varieties: string[];
  today?: string;
  [key: string]: unknown;
}

interface ChatbotModalProps {
  summary?: DashboardSummary;
}

export function ChatbotModal({ summary }: ChatbotModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetchJson<{ content: string }>(
        "/api/chat",
        "Error al procesar tu pregunta.",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [...messages, userMessage],
            context: summary,
          }),
        }
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Perdón, hubo un error al procesar tu pregunta. Intenta de nuevo.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!summary) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg transition-all hover:shadow-xl hover:scale-110 dark:from-slate-800 dark:to-slate-700"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl rounded-2xl border border-border/50 bg-card shadow-2xl flex flex-col h-[min(560px,75dvh)] backdrop-blur-sm">
          {/* Header */}
          <div className="border-b border-border/30 bg-gradient-to-r from-slate-900/5 dark:from-slate-800/10 to-slate-900/8 dark:to-slate-800/15 p-4 rounded-t-2xl">
            <h3 className="font-semibold text-foreground">Asistente Dashboard</h3>
            <p className="text-xs text-muted-foreground">Pregunta sobre métricas e interpretaciones</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div className="space-y-2">
                  <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Pregunta sobre ciclos, rendimiento, área o cualquier métrica del dashboard
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white dark:bg-slate-900 rounded-br-none"
                          : "bg-muted text-muted-foreground border border-border/30 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted border border-border/30 rounded-lg px-3 py-2 rounded-bl-none">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border/30 bg-card p-3 rounded-b-2xl">
            <div className="flex gap-2">
              <Input
                placeholder="Pregunta algo..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
