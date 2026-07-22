import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatAI } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bot, Copy, Loader2, Send, Sparkles, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Assistant Chat · Workplace AI Co-Pilot" },
      { name: "description", content: "Chat with your AI workplace assistant — ask questions, brainstorm, and draft on the fly." },
      { property: "og:title", content: "AI Assistant Chat" },
      { property: "og:description", content: "Your always-on AI workplace assistant." },
    ],
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM =
  "You are Workplace AI Co-Pilot, a professional, concise assistant for knowledge workers. Give clear, actionable answers. Use short paragraphs and bullet lists when helpful. Ask a clarifying question only when strictly necessary. Never invent facts — say when something is uncertain.";

const suggestions = [
  "Draft a follow-up email to a client who missed our meeting.",
  "Summarize the key differences between OKRs and KPIs.",
  "Give me a 30-minute agenda for a weekly team stand-up.",
  "Help me prepare for a difficult 1:1 conversation.",
];

function ChatPage() {
  const run = useServerFn(chatAI);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { content: reply } = await run({ data: { system: SYSTEM, messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reach assistant");
      setMessages(next.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Bot className="h-3.5 w-3.5" /> AI Assistant Chat
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your always-on co-pilot</h1>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setMessages([])}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> New chat
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/40">
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
            {messages.length === 0 && !loading && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">How can I help today?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ask anything, or try one of these:</p>
                <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {loading && (
              <div className="flex gap-3">
                <Avatar role="assistant" />
                <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-background/40 p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message your co-pilot… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="max-h-40 min-h-[44px] resize-none"
            />
            <Button onClick={() => void send()} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
        role === "assistant"
          ? "bg-primary/15 text-primary ring-primary/25"
          : "bg-accent text-accent-foreground ring-border",
      )}
    >
      {role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={msg.role} />
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground",
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}
