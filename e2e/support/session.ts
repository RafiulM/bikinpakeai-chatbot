import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { expect, type APIRequestContext } from "@playwright/test";

// npm run test:e2e picks the ports (3101/3102 unless taken) and passes them in.
const port = Number(process.env.E2E_PORT || 3101);
export const origin = `http://localhost:${port}`;
/** Second app whose OpenRouter endpoint is unreachable (pipeline failures). */
export const failureOrigin = `http://localhost:${port + 1}`;
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
  // The real auth server limits rapid signups. Honor its retry window, a few
  // times, since many spec files sign up accounts back to back.
  for (let retry = 0; response.status() === 429 && retry < 3; retry += 1) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((Math.min(seconds, 30) + 0.2) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  expect(response.status()).toBe(200);
  return data;
}

/** Cookie header for streaming requests made outside Playwright's client. */
export async function cookieHeader(client: APIRequestContext) {
  const { cookies } = await client.storageState();
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

/** Reads server-sent events until `count` events arrive or the timeout hits. */
export async function readEvents(
  url: string,
  cookie: string,
  count: number,
  timeoutMs = 8000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const events: { event: string; data: unknown }[] = [];
  try {
    const response = await fetch(url, {
      headers: { cookie, accept: "text/event-stream" },
      signal: controller.signal,
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (events.length < count) {
      // Reaching the timeout simply ends the read with what arrived so far.
      const chunk = await reader
        .read()
        .catch(() => ({ done: true, value: undefined }));
      const { value, done } = chunk;
      if (done || !value) break;
      buffer += decoder.decode(value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const event = /^event: (.*)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (event && data) events.push({ event, data: JSON.parse(data) });
      }
    }
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      events,
    };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
