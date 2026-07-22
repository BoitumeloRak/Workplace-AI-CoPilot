import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  system: z.string(),
  prompt: z.string().min(1),
});

const ChatInput = z.object({
  system: z.string(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
});

async function callGateway(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", ...body }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in your workspace billing.");
    throw new Error(`AI request failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export const generateAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const content = await callGateway({
      messages: [
        { role: "system", content: data.system },
        { role: "user", content: data.prompt },
      ],
    });
    return { content };
  });

export const chatAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const content = await callGateway({
      messages: [{ role: "system", content: data.system }, ...data.messages],
    });
    return { content };
  });
