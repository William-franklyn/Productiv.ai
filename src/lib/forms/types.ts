import { z } from "zod";

export const fieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "number", "email", "select", "checkbox", "date"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export type FormField = z.infer<typeof fieldSchema>;
