import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TutorInsights = {
  summary: string;
  strengths: { theme: string; evidence: string }[];
  improvements: { theme: string; evidence: string }[];
  discussion_points: string[];
};

const RUN_ID = "X-Lovable-AIG-Run-ID";

export const analyzeTutorFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ tutorId: z.string().uuid(), feedbackIds: z.array(z.string().uuid()).min(1).max(30) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<TutorInsights> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("feedback")
      .select("id, session_date, slot, overall_score, uniform_status, notes, feedback_comments(category, type, comment_text)")
      .eq("tutor_id", data.tutorId)
      .in("id", data.feedbackIds)
      .order("session_date", { ascending: true });
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("No feedback entries you can access for this tutor.");

    const text = rows
      .map((r) => {
        const c = (r.feedback_comments ?? []) as { category: string; type: string; comment_text: string }[];
        return [
          `Session ${r.session_date} (${r.slot}) — overall ${r.overall_score}%, uniform: ${r.uniform_status ?? "n/a"}`,
          ...c.map((x) => `  [${x.type === "positive" ? "+" : "-"}] ${x.category}: ${x.comment_text}`),
          r.notes ? `  Notes: ${r.notes}` : "",
        ].filter(Boolean).join("\n");
      })
      .join("\n\n");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    let runId: string | undefined;
    const openai = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: async (input, init) => {
        const h = new Headers(init?.headers);
        if (runId) h.set(RUN_ID, runId);
        const res = await fetch(input, { ...init, headers: h });
        runId ??= res.headers.get(RUN_ID) ?? undefined;
        if (res.status === 402) throw new Error("AI credits are used up. Add credits in workspace billing.");
        if (res.status === 429) throw new Error("AI is busy right now. Please try again in a minute.");
        return res;
      },
    });

    const result = streamText({
      model: openai.responses("openai/gpt-6-astra"),
      system:
        "You are a teaching-quality coach. Analyze a tutor's session feedback and find RECURRING patterns (things appearing in 2+ sessions take priority). " +
        "Reply ONLY with JSON: {\"summary\": string, \"strengths\": [{\"theme\": string, \"evidence\": string}], \"improvements\": [{\"theme\": string, \"evidence\": string}], \"discussion_points\": string[]}. " +
        "Up to 5 items per list. Evidence cites how often/when it appeared. Discussion points are concrete questions or topics for the mentor's next 1:1 with the tutor. Be specific and supportive.",
      prompt: `Feedback entries (oldest first):\n\n${text}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const out = await result.text;
    const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
    try {
      const p = JSON.parse(json) as Partial<TutorInsights>;
      return {
        summary: p.summary ?? "",
        strengths: (p.strengths ?? []).slice(0, 5),
        improvements: (p.improvements ?? []).slice(0, 5),
        discussion_points: (p.discussion_points ?? []).slice(0, 5),
      };
    } catch {
      throw new Error("The AI reply could not be read. Please try again.");
    }
  });
