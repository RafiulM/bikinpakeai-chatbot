import { z } from "zod";

const title = z.string().trim().min(1).max(160);
const content = z.string().max(10_000);

export const createNoteSchema = z
  .object({ title, content: content.default("") })
  .strict();
export const updateNoteSchema = z
  .object({ title: title.optional(), content: content.optional() })
  .strict()
  .refine(
    (value) => value.title !== undefined || value.content !== undefined,
    "Provide a title or content to update.",
  );
export const noteIdSchema = z.string().uuid();
export const listNotesSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesInput = z.infer<typeof listNotesSchema>;
