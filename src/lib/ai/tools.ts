import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchKnowledge } from "@/lib/knowledge/retrieval";
import { logActivity } from "@/lib/activity";
import { sendMeetingInvite, sendMeetingCancellation } from "@/lib/email/meeting-invite";

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

        await logActivity(ctx.supabase, {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          action: "created_task",
          detail: `Assistant created task: ${title}`,
        });

        return { ok: true as const, taskId: data.id, title };
      },
    }),

    schedule_meeting: tool({
      description:
        "Schedule a meeting for the team, at a specific date and time. If the user gives an external attendee's email, invite them — they'll get an actual calendar invite by email.",
      inputSchema: z.object({
        title: z.string(),
        startsAt: z.string().describe("ISO 8601 date-time, e.g. 2026-09-20T14:00:00"),
        durationMinutes: z.number().optional().describe("Defaults to 30 if not given"),
        notes: z.string().optional(),
        attendeeEmail: z.string().email().optional().describe("External attendee to email an invite to, if given"),
      }),
      execute: async ({ title, startsAt, durationMinutes, notes, attendeeEmail }) => {
        const duration = durationMinutes ?? 30;
        const { data, error } = await ctx.supabase
          .from("meetings")
          .insert({
            organization_id: ctx.orgId,
            created_by: ctx.userId,
            title,
            starts_at: startsAt,
            duration_minutes: duration,
            notes: notes ?? null,
            attendee_email: attendeeEmail ?? null,
          })
          .select("id")
          .single();

        if (error) return { ok: false as const, error: error.message };

        await logActivity(ctx.supabase, {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          action: "scheduled_meeting",
          detail: `Assistant scheduled meeting: ${title}`,
        });

        let emailSent = false;
        if (attendeeEmail) {
          const result = await sendMeetingInvite({
            meetingId: data.id,
            title,
            startsAt,
            durationMinutes: duration,
            notes,
            attendeeEmail,
          });
          emailSent = result.sent;
        }

        return { ok: true as const, meetingId: data.id, title, startsAt, attendeeEmail, emailSent };
      },
    }),

    list_meetings: tool({
      description: "List the team's upcoming meetings.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await ctx.supabase
          .from("meetings")
          .select("id, title, starts_at, duration_minutes, attendee_email")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(20);

        if (error) return { ok: false as const, error: error.message };
        return { ok: true as const, meetings: data };
      },
    }),

    cancel_meeting: tool({
      description:
        "Cancel (delete) an upcoming meeting by matching its title. If more than one meeting matches, this returns the candidates instead of guessing which one to cancel.",
      inputSchema: z.object({
        titleQuery: z.string().describe("Text to match against upcoming meeting titles"),
      }),
      execute: async ({ titleQuery }) => {
        const { data, error } = await ctx.supabase
          .from("meetings")
          .select("id, title, starts_at, duration_minutes, notes, attendee_email")
          .ilike("title", `%${titleQuery}%`)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true });

        if (error) return { ok: false as const, reason: "error" as const, error: error.message };
        if (!data || data.length === 0) {
          return { ok: false as const, reason: "not_found" as const };
        }
        if (data.length > 1) {
          return { ok: false as const, reason: "ambiguous" as const, candidates: data };
        }

        const meeting = data[0];
        const { error: deleteError } = await ctx.supabase
          .from("meetings")
          .delete()
          .eq("id", meeting.id);
        if (deleteError) return { ok: false as const, reason: "error" as const, error: deleteError.message };

        await logActivity(ctx.supabase, {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          action: "cancelled_meeting",
          detail: `Assistant cancelled meeting: ${meeting.title}`,
        });

        if (meeting.attendee_email) {
          await sendMeetingCancellation({
            meetingId: meeting.id,
            title: meeting.title,
            startsAt: meeting.starts_at,
            durationMinutes: meeting.duration_minutes,
            notes: meeting.notes,
            attendeeEmail: meeting.attendee_email,
          });
        }

        return { ok: true as const, title: meeting.title };
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
