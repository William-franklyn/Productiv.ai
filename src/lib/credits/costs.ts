export type ChargeableAction = "answer" | "task" | "meeting" | "email";

// Report generation isn't a feature of this app yet — add it here (and to
// the usage_events action check constraint) if that ships later.
export const CREDIT_COSTS: Record<ChargeableAction, number> = {
  answer: 1,
  task: 1,
  meeting: 2,
  email: 2,
};
