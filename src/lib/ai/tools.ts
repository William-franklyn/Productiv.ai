import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchKnowledge } from "@/lib/knowledge/retrieval";
import { logActivity } from "@/lib/activity";
import { sendMeetingInvite, sendMeetingCancellation } from "@/lib/email/meeting-invite";
import { summarizeDataset, groupByAggregate, type Aggregate } from "@/lib/knowledge/analyze";
import type { Dataset } from "@/lib/knowledge/tabular";

export function buildTools(ctx: {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
  userEmail?: string | null;
}) {
  return {
    search_knowledge: tool({
      description:
        "Search the team's uploaded knowledge base for passages relevant to a question. Always use this before answering anything that could be grounded in the team's documents.",
      inputSchema: z.object({
        query: z.string().describe("The search query, in natural language"),
      }),
      execute: async ({ query }) => {
        const chunks = await searchKnowledge(ctx.supabase, ctx.orgId, query);
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
          .eq("organization_id", ctx.orgId)
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
          .eq("organization_id", ctx.orgId)
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
          .eq("id", meeting.id)
          .eq("organization_id", ctx.orgId);
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

    draft_email: tool({
      description:
        "Draft an email for the user to review, edit, and send themselves. This NEVER sends anything — it only creates a draft that opens in a review panel. Use it whenever the user asks you to write, draft, or compose an email.",
      inputSchema: z.object({
        to: z.string().optional().describe("Recipient email address, if the user gave one — otherwise leave blank"),
        subject: z.string(),
        body: z.string().describe("Plain-text email body"),
      }),
      execute: async ({ to, subject, body }) => {
        const { data, error } = await ctx.supabase
          .from("email_drafts")
          .insert({
            organization_id: ctx.orgId,
            created_by: ctx.userId,
            to_email: to ?? "",
            subject,
            body,
            reply_to_email: ctx.userEmail ?? null,
          })
          .select("id")
          .single();

        if (error) return { ok: false as const, error: error.message };

        await logActivity(ctx.supabase, {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          action: "drafted_email",
          detail: `Assistant drafted email: ${subject}`,
        });

        return { ok: true as const, draftId: data.id, to: to ?? "", subject };
      },
    }),

    analyze_data: tool({
      description:
        "Compute real statistics over an uploaded data file (CSV or a JSON array of records) — sums, averages, min/max, and grouped breakdowns. Use this instead of search_knowledge whenever the question requires math across every row (totals, averages, \"which X has the highest Y\") rather than finding relevant passages. Follow up with generate_chart to visualize the result if useful.",
      inputSchema: z.object({
        sourceName: z.string().describe("Name (or partial name) of the uploaded data file to analyze"),
        groupBy: z.string().optional().describe("Column to break the metric down by, e.g. 'region' or 'quarter'"),
        metric: z.string().optional().describe("Numeric column to aggregate — required if groupBy is given"),
        aggregate: z
          .enum(["sum", "avg", "min", "max", "count"])
          .optional()
          .describe("How to aggregate the metric within each group. Defaults to sum."),
      }),
      execute: async ({ sourceName, groupBy, metric, aggregate }) => {
        const { data: matches, error } = await ctx.supabase
          .from("knowledge_sources")
          .select("id, name, dataset")
          .eq("organization_id", ctx.orgId)
          .not("dataset", "is", null)
          .ilike("name", `%${sourceName}%`);

        if (error) return { ok: false as const, reason: "error" as const, error: error.message };
        if (!matches || matches.length === 0) {
          return { ok: false as const, reason: "not_found" as const };
        }
        if (matches.length > 1) {
          return {
            ok: false as const,
            reason: "ambiguous" as const,
            candidates: matches.map((m) => m.name),
          };
        }

        const source = matches[0];
        const dataset = source.dataset as Dataset;
        const columnSummary = summarizeDataset(dataset);

        if (groupBy && metric) {
          if (!dataset.columns.includes(groupBy) || !dataset.columns.includes(metric)) {
            return {
              ok: false as const,
              reason: "unknown_column" as const,
              columns: dataset.columns,
            };
          }
          const grouped = groupByAggregate(dataset, groupBy, metric, (aggregate ?? "sum") as Aggregate);
          return {
            ok: true as const,
            sourceName: source.name,
            rowCount: dataset.rows.length,
            columns: dataset.columns,
            groupBy: { column: groupBy, metric, aggregate: aggregate ?? "sum", rows: grouped },
          };
        }

        return {
          ok: true as const,
          sourceName: source.name,
          rowCount: dataset.rows.length,
          columns: dataset.columns,
          summary: columnSummary,
        };
      },
    }),

    restrict_source_access: tool({
      description:
        "Restrict specific workspace members from accessing an uploaded knowledge source, or clear restrictions so everyone can access it again. Everyone in the workspace can access a source by default — this only adds or removes names from a deny-list on top of that.",
      inputSchema: z.object({
        sourceName: z.string().describe("Name (or partial name) of the uploaded document"),
        restrictNames: z
          .array(z.string())
          .optional()
          .describe("Names of members to restrict from this source"),
        clearAll: z
          .boolean()
          .optional()
          .describe("Set true to remove all restrictions on this source instead"),
      }),
      execute: async ({ sourceName, restrictNames, clearAll }) => {
        const { data: sourceMatches, error: sourceError } = await ctx.supabase
          .from("knowledge_sources")
          .select("id, name")
          .eq("organization_id", ctx.orgId)
          .ilike("name", `%${sourceName}%`);

        if (sourceError) return { ok: false as const, reason: "error" as const, error: sourceError.message };
        if (!sourceMatches || sourceMatches.length === 0) {
          return { ok: false as const, reason: "source_not_found" as const };
        }
        if (sourceMatches.length > 1) {
          return {
            ok: false as const,
            reason: "source_ambiguous" as const,
            candidates: sourceMatches.map((s) => s.name),
          };
        }
        const source = sourceMatches[0];

        if (clearAll) {
          await ctx.supabase.from("knowledge_source_restrictions").delete().eq("source_id", source.id);
          return { ok: true as const, sourceName: source.name, cleared: true as const };
        }

        if (!restrictNames || restrictNames.length === 0) {
          return { ok: false as const, reason: "no_names_given" as const };
        }

        const { data: memberRows } = await ctx.supabase
          .from("memberships")
          .select("user_id, profiles(full_name)")
          .eq("organization_id", ctx.orgId);

        const members = (memberRows ?? []).map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return { userId: row.user_id, fullName: profile?.full_name ?? "" };
        });

        const matchedUserIds: string[] = [];
        const unmatched: string[] = [];
        for (const name of restrictNames) {
          const matches = members.filter((m) =>
            m.fullName.toLowerCase().includes(name.toLowerCase()),
          );
          if (matches.length === 1) matchedUserIds.push(matches[0].userId);
          else unmatched.push(name);
        }

        if (unmatched.length > 0) {
          return {
            ok: false as const,
            reason: "member_not_found" as const,
            unmatched,
            availableNames: members.map((m) => m.fullName).filter(Boolean),
          };
        }

        await ctx.supabase.from("knowledge_source_restrictions").upsert(
          matchedUserIds.map((userId) => ({
            source_id: source.id,
            organization_id: ctx.orgId,
            restricted_user_id: userId,
          })),
          { onConflict: "source_id,restricted_user_id", ignoreDuplicates: true },
        );

        await logActivity(ctx.supabase, {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          action: "restricted_source",
          detail: `Restricted access to ${source.name} for ${restrictNames.join(", ")}`,
        });

        return { ok: true as const, sourceName: source.name, restrictedCount: matchedUserIds.length };
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
