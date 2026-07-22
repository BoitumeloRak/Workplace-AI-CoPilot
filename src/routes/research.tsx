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
import { Copy, Search, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant · Workplace AI Co-Pilot" },
      { name: "description", content: "Get structured research briefs on any topic with key findings, insights, and sources to explore." },
      { property: "og:title", content: "AI Research Assistant" },
      { property: "og:description", content: "Structured research briefs in seconds." },
    ],
  }),
  component: ResearchPage,
});

interface Brief {
  overview: string;
  keyFindings: string[];
  insights: string[];
  considerations: string[];
  suggestedSources: string[];
}

const depths = ["Quick Brief", "Standard", "Deep Dive"];

function toMarkdown(topic: string, b: Brief): string {
  return `# Research Brief: ${topic}\n\n## Overview\n${b.overview}\n\n## Key Findings\n${b.keyFindings.map((x) => `- ${x}`).join("\n")}\n\n## Insights\n${b.insights.map((x) => `- ${x}`).join("\n")}\n\n## Considerations\n${b.considerations.map((x) => `- ${x}`).join("\n")}\n\n## Suggested Sources to Explore\n${b.suggestedSources.map((x) => `- ${x}`).join("\n")}\n`;
}

function ResearchPage() {
  const run = useServerFn(generateAI);
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("Standard");
  const [focus, setFocus] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);

  async function research() {
    if (!topic.trim()) {
      toast.error("Please enter a research topic.");
      return;
    }
    setLoading(true);
    setBrief(null);
    try {
      const { content } = await run({
        data: {
          system:
            "You are a senior research analyst. Produce a structured research brief on the requested topic. Be factual, concise, and neutral. Flag uncertainty where relevant. Do not fabricate specific statistics — describe them qualitatively when unsure.\n\nReturn ONLY valid JSON matching this exact shape, no markdown fences, no commentary:\n{\"overview\": string, \"keyFindings\": string[], \"insights\": string[], \"considerations\": string[], \"suggestedSources\": string[]}",
          prompt: `Topic: ${topic}\nDepth: ${depth}\nFocus / angle: ${focus || "General overview"}`,
        },
      });
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      setBrief(JSON.parse(cleaned) as Brief);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  }

  async function copyBrief() {
    if (!brief) return;
    await navigator.clipboard.writeText(toMarkdown(topic, brief));
    toast.success("Research brief copied");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Search className="h-3.5 w-3.5" /> AI Research Assistant
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Structured briefs on any topic</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview, findings, insights, and where to dig deeper.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>Define scope and focus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. B2B pricing models in vertical SaaS" />
            </div>
            <div className="space-y-2">
              <Label>Depth</Label>
              <Select value={depth} onValueChange={setDepth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {depths.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Focus / angle (optional)</Label>
              <Textarea value={focus} onChange={(e) => setFocus(e.target.value)} rows={5} placeholder="e.g. Focus on mid-market segment and competitive positioning." />
            </div>
            <Button onClick={research} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Brief</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Research Brief</CardTitle>
              <CardDescription>Review and copy.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={copyBrief} disabled={!brief}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && (
              <div className="space-y-3">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
                <div className="h-16 animate-pulse rounded bg-muted" />
              </div>
            )}
            {!loading && !brief && (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Your research brief will appear here.
              </div>
            )}
            {brief && !loading && (
              <>
                <Section title="Overview"><p className="text-sm leading-relaxed">{brief.overview}</p></Section>
                <BulletSection title="Key Findings" items={brief.keyFindings} />
                <BulletSection title="Insights" items={brief.insights} />
                <BulletSection title="Considerations & Risks" items={brief.considerations} />
                <BulletSection title="Suggested Sources to Explore" items={brief.suggestedSources} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="space-y-1.5">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="leading-relaxed">{x}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">None provided.</li>}
      </ul>
    </Section>
  );
}
