import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateAI } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Download, FileText, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer · Workplace AI Co-Pilot" },
      { name: "description", content: "Turn raw transcripts or bullet notes into an executive summary, decisions, and action items." },
      { property: "og:title", content: "Meeting Notes Summarizer" },
      { property: "og:description", content: "Structured summaries with decisions and action items." },
    ],
  }),
  component: NotesPage,
});

interface Summary {
  executive: string;
  decisions: string[];
  actions: { task: string; owner: string; deadline: string }[];
}

function toMarkdown(s: Summary): string {
  const dec = s.decisions.map((d) => `- ${d}`).join("\n") || "- (none)";
  const act =
    s.actions.map((a) => `- **${a.task}** — _${a.owner}_ (due ${a.deadline})`).join("\n") ||
    "- (none)";
  return `# Meeting Summary\n\n## Executive Summary\n${s.executive}\n\n## Decisions Made\n${dec}\n\n## Action Items\n${act}\n`;
}

function NotesPage() {
  const run = useServerFn(generateAI);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  async function summarize() {
    if (!notes.trim()) {
      toast.error("Please paste transcript or notes.");
      return;
    }
    setLoading(true);
    setSummary(null);
    try {
      const { content } = await run({
        data: {
          system:
            "You are an executive assistant. Parse the raw meeting notes and structure them into: 1. Executive Summary (2-3 sentences), 2. Key Decisions Made, 3. Action Items (with Task, Assignee, and Deadline). If information is missing, note it standardly (use 'Unassigned' for missing owners and 'TBD' for missing deadlines).\n\nReturn ONLY valid JSON matching this exact shape, no markdown fences, no commentary:\n{\"executive\": string, \"decisions\": string[], \"actions\": [{\"task\": string, \"owner\": string, \"deadline\": string}]}",
          prompt: notes,
        },
      });
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as Summary;
      setSummary(parsed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to summarize");
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    if (!summary) return;
    await navigator.clipboard.writeText(toMarkdown(summary));
    toast.success("Summary copied");
  }

  function exportMarkdown() {
    if (!summary) return;
    const blob = new Blob([toMarkdown(summary)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting-summary.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Meeting Notes Summarizer
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">From raw notes to a shareable summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">Executive summary, decisions, and action items with owners and deadlines.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Transcript / Notes</CardTitle>
            <CardDescription>Paste raw transcript or bullet notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={18}
              placeholder="Paste meeting transcript or bullet notes here…"
            />
            <Button onClick={summarize} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing…</> : <><Sparkles className="mr-2 h-4 w-4" /> Summarize</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Structured Summary</CardTitle>
              <CardDescription>Review, copy, or export.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copySummary} disabled={!summary}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={exportMarkdown} disabled={!summary}>
                <Download className="mr-2 h-3.5 w-3.5" /> Markdown
              </Button>
            </div>
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
            {!loading && !summary && (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Your structured summary will appear here.
              </div>
            )}
            {summary && !loading && (
              <>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Executive Summary</h3>
                  <p className="text-sm leading-relaxed">{summary.executive}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decisions Made</h3>
                  <ul className="space-y-1.5">
                    {summary.decisions.map((d, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{d}</span>
                      </li>
                    ))}
                    {summary.decisions.length === 0 && <li className="text-sm text-muted-foreground">No decisions recorded.</li>}
                  </ul>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Items</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Task</th>
                          <th className="px-3 py-2 text-left font-medium">Owner</th>
                          <th className="px-3 py-2 text-left font-medium">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {summary.actions.map((a, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{a.task}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.owner}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.deadline}</td>
                          </tr>
                        ))}
                        {summary.actions.length === 0 && (
                          <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No action items.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
