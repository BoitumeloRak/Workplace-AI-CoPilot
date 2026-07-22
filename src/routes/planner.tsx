import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateAI } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ListChecks, Loader2, Sparkles, Clock, Lightbulb, Copy } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner · Workplace AI Co-Pilot" },
      { name: "description", content: "Prioritize your day with an Eisenhower matrix, time estimates, and optimization tips." },
      { property: "og:title", content: "AI Task Planner & Prioritizer" },
      { property: "og:description", content: "Eisenhower matrix and time-blocked schedule." },
    ],
  }),
  component: PlannerPage,
});

interface TaskItem { task: string; estimate: string; note?: string }
interface Plan {
  matrix: {
    urgentImportant: TaskItem[];
    notUrgentImportant: TaskItem[];
    urgentNotImportant: TaskItem[];
    notUrgentNotImportant: TaskItem[];
  };
  schedule: { time: string; task: string }[];
  tips: string[];
}

const quadrantMeta = [
  { key: "urgentImportant", label: "Do Now", sub: "Urgent · Important", tone: "bg-destructive/15 border-destructive/40 text-destructive-foreground" },
  { key: "notUrgentImportant", label: "Schedule", sub: "Important · Not Urgent", tone: "bg-primary/15 border-primary/40" },
  { key: "urgentNotImportant", label: "Delegate", sub: "Urgent · Not Important", tone: "bg-amber-500/15 border-amber-500/40" },
  { key: "notUrgentNotImportant", label: "Eliminate", sub: "Not Urgent · Not Important", tone: "bg-muted border-border" },
] as const;

function planToMarkdown(p: Plan): string {
  const q = (label: string, items: TaskItem[]) =>
    `### ${label}\n${items.length ? items.map((i) => `- **${i.task}** (${i.estimate})${i.note ? ` — ${i.note}` : ""}`).join("\n") : "- (none)"}`;
  const sched = p.schedule.map((s) => `- ${s.time} — ${s.task}`).join("\n") || "- (none)";
  const tips = p.tips.map((t) => `- ${t}`).join("\n") || "- (none)";
  return `# Daily Plan\n\n## Eisenhower Matrix\n${q("Do Now", p.matrix.urgentImportant)}\n\n${q("Schedule", p.matrix.notUrgentImportant)}\n\n${q("Delegate", p.matrix.urgentNotImportant)}\n\n${q("Eliminate", p.matrix.notUrgentNotImportant)}\n\n## Time-Blocked Schedule\n${sched}\n\n## Optimization Tips\n${tips}\n`;
}

function PlannerPage() {
  const run = useServerFn(generateAI);
  const [tasks, setTasks] = useState("");
  const [deadlines, setDeadlines] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!tasks.trim()) {
      toast.error("Please list your tasks.");
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const { content } = await run({
        data: {
          system:
            "You are an agile productivity consultant. Organize the provided tasks into a structured daily plan using the Eisenhower Matrix (High Priority = urgent & important, Scheduled = important & not urgent, Delegated/Quick Wins = urgent & not important, and low-value items = not urgent & not important). Provide actionable time-blocking advice.\n\nReturn ONLY valid JSON, no markdown fences, matching:\n{\"matrix\":{\"urgentImportant\":[{\"task\":string,\"estimate\":string,\"note\":string}],\"notUrgentImportant\":[...],\"urgentNotImportant\":[...],\"notUrgentNotImportant\":[...]},\"schedule\":[{\"time\":string,\"task\":string}],\"tips\":string[]}\nestimate must be like '30m' or '1h 30m'. schedule covers a workday (09:00-18:00) using 30-60 min blocks. Provide 3-5 practical time-blocking / optimization tips.",
          prompt: `Tasks / goals:\n${tasks}\n\nUrgent deadlines:\n${deadlines || "(none specified)"}`,
        },
      });
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as Plan;
      setPlan(parsed);
      setDraft(planToMarkdown(parsed));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to plan");
    } finally {
      setLoading(false);
    }
  }

  async function copyPlan() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    toast.success("Plan copied");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" /> AI Task Planner & Prioritizer
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Focus on what actually moves the needle</h1>
        <p className="mt-1 text-sm text-muted-foreground">An Eisenhower matrix, a time-blocked day, and tips to compress your workload.</p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Your workload</CardTitle>
          <CardDescription>List tasks and any hard deadlines. One per line works best.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tasks / goals</Label>
            <Textarea rows={8} value={tasks} onChange={(e) => setTasks(e.target.value)}
              placeholder="- Finalize Q3 board deck&#10;- Review PR from Ana&#10;- Prep for client call…" />
          </div>
          <div className="space-y-2">
            <Label>Urgent deadlines</Label>
            <Textarea rows={8} value={deadlines} onChange={(e) => setDeadlines(e.target.value)}
              placeholder="- Board deck due Thu 5pm&#10;- Vendor contract signed by EOD…" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={generate} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your plan…</> : <><Sparkles className="mr-2 h-4 w-4" /> Prioritize & Schedule</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!plan && !loading && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Your prioritized matrix and time-blocked schedule will appear here.
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0,1,2,3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}
        </div>
      )}

      {plan && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copyPlan} disabled={!draft}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy Plan
            </Button>
          </div>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Eisenhower Matrix</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {quadrantMeta.map((q) => {
                const items = plan.matrix[q.key];
                return (
                  <div key={q.key} className={`rounded-lg border p-4 ${q.tone}`}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold">{q.label}</h3>
                      <span className="text-[11px] uppercase tracking-wider opacity-70">{q.sub}</span>
                    </div>
                    <ul className="space-y-2">
                      {items.length === 0 && <li className="text-xs opacity-60">Nothing here.</li>}
                      {items.map((it, i) => (
                        <li key={i} className="rounded-md bg-background/50 p-2.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium">{it.task}</span>
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{it.estimate}</span>
                          </div>
                          {it.note && <p className="mt-1 text-xs text-muted-foreground">{it.note}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Time-Blocked Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {plan.schedule.map((s, i) => (
                    <li key={i} className="flex items-baseline gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm">
                      <span className="w-24 font-mono text-xs text-muted-foreground">{s.time}</span>
                      <span>{s.task}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4" /> Optimization Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Editable draft (Markdown)</CardTitle>
              <CardDescription>Tweak the plan before copying.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={16} className="font-mono text-xs leading-relaxed" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
    </div>
  );
}
