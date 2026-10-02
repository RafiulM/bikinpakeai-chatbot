import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { expect, type APIRequestContext } from "@playwright/test";

export const origin = "http://localhost:3101";
export const headers = { Origin: origin };

/** Creates a fresh account on the real auth server and keeps its cookie. */
export async function signUp(client: APIRequestContext, prefix = "lab") {
  const data = {
    name: "Lab Tester",
    email: `${prefix}-${randomUUID()}@example.com`,
    password: "Lab-test-password-123!",
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    // The real auth server limits rapid signups. Honor its retry window once.
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((Math.min(seconds, 10) + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  expect(response.status()).toBe(200);
  return data;
}
