import { z } from "zod";

export const ticketIdSchema = z.string().uuid();

export const listTicketsSchema = z
  .object({
    filter: z.enum(["active", "done", "all"]).default("active"),
    sort: z.enum(["urgency", "frustration", "waiting"]).default("urgency"),
    q: z.string().trim().max(100).default(""),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type ListTicketsInput = z.infer<typeof listTicketsSchema>;

export const replyTicketSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
    close: z.boolean().default(false),
  })
  .strict();

export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;

export const updateTicketSchema = z
  .object({ status: z.enum(["open", "claimed", "closed"]) })
  .strict();

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
