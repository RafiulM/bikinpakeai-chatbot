import { z } from "zod";
import { VIEW_IDS } from "@/lib/lab/types";

export const MAX_MESSAGE_LENGTH = 2000;

export const conversationIdSchema = z.string().uuid();

export const createConversationSchema = z.object({}).strict();

export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .strict();

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listConversationsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type ListConversationsInput = z.infer<typeof listConversationsSchema>;

export const listSuggestionsSchema = z
  .object({ limit: z.coerce.number().int().min(1).max(12).default(4) })
  .strict();

export const updateConversationSchema = z
  .object({ activeView: z.enum(VIEW_IDS) })
  .strict();

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
