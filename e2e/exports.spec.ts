import { expect, test, type APIRequestContext } from "@playwright/test";
import { headers, signUp } from "./support/session";

let owner: APIRequestContext;
let other: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  const baseURL = "http://localhost:3101";
  owner = await playwright.request.newContext({ baseURL });
  other = await playwright.request.newContext({ baseURL });
  await signUp(owner, "exports-owner");
  await signUp(other, "exports-other");
});

test.afterAll(async () => {
  await owner?.dispose();
  await other?.dispose();
});

/** Waits until both answers of the conversation's messages are stored. */
async function answered(conversationId: string) {
  for (let tries = 0; tries < 50; tries += 1) {
    const { data } = await (
      await owner.get(`/api/conversations/${conversationId}`)
    ).json();
    if (data.turns.every((turn: { withoutJev: unknown }) => turn.withoutJev))
      return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

test("the summary file is built from the caller's stored results", async ({
  request,
}) => {
  const { data: conversation } = await (
    await owner.post("/api/conversations", { headers, data: {} })
  ).json();
  await owner.post(`/api/conversations/${conversation.id}/messages`, {
    headers,
    data: { content: "Ini nomor kartu saya 4111 1111 1111 1111, cek ya" },
  });
  await answered(conversation.id);
  const url = `/api/exports/summary?conversationId=${conversation.id}`;

  expect((await request.get(url)).status()).toBe(401);
  const response = await owner.get(`${url}&testRun=latest`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe(
    "text/markdown; charset=utf-8",
  );
  const code = conversation.code.replace("#", "");
  expect(response.headers()["content-disposition"]).toMatch(
    new RegExp(
      `^attachment; filename="ringkasan-bikinpakeai-${code}-\\d{4}-\\d{2}-\\d{2}\\.md"$`,
    ),
  );
  const markdown = await response.text();
  expect(markdown).toContain(`## Percakapan ${conversation.code}`);
  expect(markdown).toContain("| Ketepatan |");
  // No finished run yet: the run part is left out, not an error.
  expect(markdown).not.toContain("## Uji test set");
  expect(markdown).not.toContain("4111 1111 1111 1111");

  const json = await (await owner.get(`${url}&format=json`)).json();
  expect(json).toMatchObject({
    conversation: { code: conversation.code, messages: 1, compared: 1 },
    testRun: null,
  });

  expect((await other.get(url)).status()).toBe(404);
  for (const query of [
    "",
    "?conversationId=not-a-uuid",
    `?conversationId=${conversation.id}&format=pdf`,
    `?conversationId=${conversation.id}&testRun=yesterday`,
  ])
    expect((await owner.get(`/api/exports/summary${query}`)).status()).toBe(
      422,
    );
  expect(
    (
      await owner.get(
        "/api/exports/summary?testRun=00000000-0000-4000-8000-000000000000",
      )
    ).status(),
  ).toBe(404);
});
