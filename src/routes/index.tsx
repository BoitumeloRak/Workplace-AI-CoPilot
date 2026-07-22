import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateAI } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Mail, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator · Workplace AI Co-Pilot" },
      { name: "description", content: "Draft polished, on-tone emails in seconds with AI-generated subject lines and bodies." },
      { property: "og:title", content: "Smart Email Generator · Workplace AI Co-Pilot" },
      { property: "og:description", content: "Draft polished, on-tone emails in seconds with AI-generated subject lines and bodies." },
    ],
  }),
  component: EmailPage,
});

const audiences = ["Client", "Manager", "Team"];
const tones = ["Formal", "Persuasive", "Direct", "Friendly"];

function parseEmail(raw: string): { subject: string; body: string } {
  const m = raw.match(/subject\s*:\s*(.+)/i);
  const subject = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  const body = raw.replace(/subject\s*:\s*.+\n+/i, "").trim();
  return { subject, body };
}

function EmailPage() {
  const run = useServerFn(generateAI);
  const [audience, setAudience] = useState("Client");
  const [tone, setTone] = useState("Formal");
  const [context, setContext] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate(overrideTone?: string) {
    if (!context.trim()) {
      toast.error("Please add some key context or points.");
      return;
    }
    const useTone = overrideTone ?? tone;
    setLoading(true);
    try {
      const { content } = await run({
        data: {
          system:
            "You are an executive communications assistant. Draft a concise, professional email based on the context, audience, and tone provided. Format the output with a clear Subject Line and Email Body. Avoid fluff or generic boilerplate.\n\nReturn ONLY in this exact format, no preamble, no markdown fences, no commentary:\nSubject: <one line subject>\n\n<email body with greeting, paragraphs, and signoff>",
          prompt: `Audience: ${audience}\nTone: ${useTone}\nKey context/points:\n${context}`,
        },
      });
      const parsed = parseEmail(content);
      setSubject(parsed.subject);
      setBody(parsed.body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate email");
    } finally {
      setLoading(false);
    }
  }

  async function copyEmail() {
    if (!subject && !body) return;
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Email copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Smart Email Generator
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Draft on-tone emails in seconds</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick your audience and tone, drop key points, and get a ready-to-send draft.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>Provide the context for the email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {audiences.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Key context / points</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={8}
                placeholder="e.g. Follow up on Q3 budget proposal. Need approval by Friday. Highlight 12% cost reduction."
              />
            </div>
            <Button onClick={() => generate()} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Email</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Generated Email</CardTitle>
              <CardDescription>Review, refine, and copy.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={copyEmail} disabled={!subject && !body}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy Email
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!subject && !body && !loading ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Your generated email will appear here.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={loading ? "…" : ""} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Body</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="font-[15px] leading-relaxed" />
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">Switch tone:</span>
                  {tones.map((t) => (
                    <Button
                      key={t}
                      variant={t === tone ? "default" : "outline"}
                      size="sm"
                      disabled={loading}
                      onClick={() => { setTone(t); void generate(t); }}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
