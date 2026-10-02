import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 2000;

export const conversationIdSchema = z.string().uuid();

export const createConversationSchema = z.object({}).strict();

export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .strict();

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
