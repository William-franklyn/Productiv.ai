import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchKnowledge } from "@/lib/knowledge/retrieval";

export function buildTools(ctx: {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
}) {
  return {
    search_knowledge: tool({
      description:
        "Search the team's uploaded knowledge base for passages relevant to a question. Always use this before answering anything that could be grounded in the team's documents.",
      inputSchema: z.object({
        query: z.string().describe("The search query, in natural language"),
      }),
      execute: async ({ query }) => {
        const chunks = await searchKnowledge(ctx.supabase, query);
        if (chunks.length === 0) {
          return { found: false as const };
        }
        return {
          found: true as const,
          chunks: chunks.map((c) => ({
            sourceId: c.sourceId,
            sourceName: c.sourceName,
            content: c.content,
          })),
        };
      },
    }),

    create_task: tool({
      description:
        "Create a task for the team — an action item or to-do to track.",
      inputSchema: z.object({
        title: z.string(),
        dueDate: z
          .string()
          .optional()
          .describe("ISO date (YYYY-MM-DD), if the user gave one"),
      }),
      execute: async ({ title, dueDate }) => {
        const { data, error } = await ctx.supabase
          .from("tasks")
          .insert({
            organization_id: ctx.orgId,
            created_by: ctx.userId,
            title,
            due_date: dueDate ?? null,
          })
          .select("id")
          .single();

        if (error) return { ok: false as const, error: error.message };
        return { ok: true as const, taskId: data.id, title };
      },
    }),

    generate_chart: tool({
      description:
        "Render a chart or a single stat tile from numeric data for the user. Use this any time the user asks to visualize, chart, plot, graph, or break down numbers — including data they just gave you in the conversation.",
      inputSchema: z.object({
        kind: z.enum(["bar", "line", "stat"]),
        title: z.string(),
        categoryKey: z
          .string()
          .optional()
          .describe("The data field to use as the x-axis / category, for bar and line"),
        series: z
          .array(z.object({ key: z.string(), label: z.string() }))
          .optional()
          .describe("Numeric fields to plot, for bar and line"),
        data: z
          .array(z.record(z.string(), z.union([z.string(), z.number()])))
          .optional()
          .describe("Rows of data, for bar and line"),
        value: z.number().optional().describe("The number to show, for a stat tile"),
        unit: z.string().optional().describe("e.g. \"$\", \"%\", \"users\""),
      }),
      execute: async (spec) => spec,
    }),
  };
}
