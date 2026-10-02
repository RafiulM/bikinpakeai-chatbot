import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { notes, user } from "@/db/schema";
import type {
  CreateNoteInput,
  ListNotesInput,
  UpdateNoteInput,
} from "@/validators/notes";

// Public fields are selected explicitly; ownership comes from the verified session.
const fields = {
  id: notes.id,
  title: notes.title,
  content: notes.content,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
};

export async function listNotes(
  userId: string,
  { limit, offset }: ListNotesInput,
) {
  const rows = await db
    .select(fields)
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt), desc(notes.id))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function getNote(userId: string, id: string) {
  const [note] = await db
    .select(fields)
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .limit(1);
  return note;
}

export async function createNote(userId: string, input: CreateNoteInput) {
  const [note] = await db
    .insert(notes)
    .values({ title: input.title, content: input.content, userId })
    .returning(fields);
  return note;
}

export async function updateNote(
  userId: string,
  id: string,
  input: UpdateNoteInput,
) {
  const [note] = await db
    .update(notes)
    .set({ title: input.title, content: input.content })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning(fields);
  return note;
}

export async function deleteNote(userId: string, id: string) {
  const [deleted] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id });
  return Boolean(deleted);
}

// --- Cross-account reads and writes ----------------------------------------
// Everything below deliberately skips the ownership filter, so it is only safe
// behind a permission check. Call these from routes wrapped in
// withApiPermission, or route loaders guarded by hasPermissionFn — never from a
// handler that merely has a session. The "Any" suffix marks that reach.

export async function listAnyNotes({ limit, offset }: ListNotesInput) {
  const rows = await db
    .select({ ...fields, ownerName: user.name, ownerEmail: user.email })
    .from(notes)
    .innerJoin(user, eq(user.id, notes.userId))
    .orderBy(desc(notes.createdAt), desc(notes.id))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function deleteAnyNote(id: string) {
  const [deleted] = await db
    .delete(notes)
    .where(eq(notes.id, id))
    .returning({ id: notes.id });
  return Boolean(deleted);
}
