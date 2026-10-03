import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { headers, origin, signUp } from "./support/session";

let owner: APIRequestContext;
let other: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  const baseURL = origin;
  owner = await playwright.request.newContext({ baseURL });
  other = await playwright.request.newContext({ baseURL });
  await signUp(owner, "test-sets-owner");
  await signUp(other, "test-sets-other");
});

test.afterAll(async () => {
  await owner?.dispose();
  await other?.dispose();
});

async function userId(client: APIRequestContext) {
  const session = await (await client.get("/api/auth/get-session")).json();
  return session.user.id as string;
}

test("test sets list built-in sets and only the caller's uploads", async ({
  request,
}) => {
  expect((await request.get("/api/test-sets")).status()).toBe(401);

  const db = testDb();
  try {
    const [set] = (
      await db.query(
        "INSERT INTO test_sets (user_id, name, description) VALUES ($1, 'Unggahan saya', 'Diunggah dari berkas.') RETURNING id",
        [await userId(owner)],
      )
    ).rows;
    await db.query(
      "INSERT INTO test_cases (test_set_id, position, input_text, expected_label) VALUES ($1, 1, 'Ini nomor kartu saya', 'masked'), ($1, 2, 'Lupa password', 'akses_akun'), ($1, 3, 'Kartu lagi', 'masked')",
      [set.id],
    );

    const mine = await (await owner.get("/api/test-sets")).json();
    expect(mine.meta.total).toBe(4);
    expect(
      mine.data.map((item: { name: string }) => item.name).slice(0, 3),
    ).toEqual(["Support umum", "Keamanan & injeksi", "Eskalasi & frustrasi"]);
    expect(mine.data[0]).toMatchObject({ caseCount: 60, builtIn: true });
    expect(mine.data[3]).toEqual({
      id: set.id,
      name: "Unggahan saya",
      description: "Diunggah dari berkas.",
      caseCount: 3,
      categories: ["Data sensitif", "Akses akun"],
      builtIn: false,
    });

    const theirs = await (await other.get("/api/test-sets")).json();
    expect(theirs.meta.total).toBe(3);
    expect(theirs.data.some((item: { id: string }) => item.id === set.id)).toBe(
      false,
    );
  } finally {
    await db.end();
  }
});

test("uploading a labelled set validates it and keeps it private", async ({
  request,
}) => {
  const body = {
    name: "  Kasus kartu  ",
    cases: [
      { inputText: "Ini nomor kartu saya 4111", expectedLabel: "masked" },
      { inputText: "Lupa password PRDTask", expectedLabel: "akses_akun" },
    ],
  };
  expect(
    (await request.post("/api/test-sets", { headers, data: body })).status(),
  ).toBe(401);
  expect(
    (
      await owner.post("/api/test-sets", {
        headers: { Origin: "https://evil.example" },
        data: body,
      })
    ).status(),
  ).toBe(403);

  const response = await owner.post("/api/test-sets", { headers, data: body });
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  expect(data).toMatchObject({
    name: "Kasus kartu",
    caseCount: 2,
    builtIn: false,
  });

  const db = testDb();
  try {
    const rows = await db.query(
      "SELECT s.user_id, c.position, c.expected_label, c.category FROM test_sets s JOIN test_cases c ON c.test_set_id = s.id WHERE s.id = $1 ORDER BY c.position",
      [data.id],
    );
    expect(rows.rows).toEqual([
      {
        user_id: await userId(owner),
        position: 1,
        expected_label: "masked",
        category: null,
      },
      {
        user_id: await userId(owner),
        position: 2,
        expected_label: "akses_akun",
        category: "akses_akun",
      },
    ]);
  } finally {
    await db.end();
  }

  const theirs = await (await other.get("/api/test-sets")).json();
  expect(theirs.data.some((item: { id: string }) => item.id === data.id)).toBe(
    false,
  );

  for (const invalid of [
    { ...body, name: " " },
    { ...body, cases: [] },
    { ...body, cases: [{ inputText: "x", expectedLabel: "lainnya" }] },
    { ...body, cases: [{ inputText: "x".repeat(2001), expectedLabel: "bug" }] },
    {
      ...body,
      cases: Array.from({ length: 101 }, () => body.cases[0]),
    },
    { ...body, userId: "someone-else" },
  ]) {
    const rejected = await owner.post("/api/test-sets", {
      headers,
      data: invalid,
    });
    expect(rejected.status()).toBe(422);
  }
});

test("a test run processes every message on both versions and stays private", async ({
  request,
}) => {
  const setId = (await (await owner.get("/api/test-sets")).json()).data[0].id;
  expect(
    (
      await request.post("/api/test-runs", {
        headers,
        data: { testSetId: setId },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await owner.post("/api/test-runs", {
        headers: { Origin: "https://evil.example" },
        data: { testSetId: setId },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await owner.post("/api/test-runs", {
        headers,
        data: { testSetId: "not-a-uuid" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await owner.post("/api/test-runs", {
        headers,
        data: { testSetId: "00000000-0000-4000-8000-000000000000" },
      })
    ).status(),
  ).toBe(404);

  const started = await owner.post("/api/test-runs", {
    headers,
    data: { testSetId: setId },
  });
  expect(started.status()).toBe(202);
  const { data: run } = await started.json();
  expect(run).toMatchObject({
    testSetId: setId,
    testSetName: "Support umum",
    total: 60,
  });

  let state = run;
  for (let tries = 0; state.status === "running" && tries < 100; tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    state = (await (await owner.get(`/api/test-runs/${run.runId}`)).json())
      .data;
  }
  expect(state.status).toBe("done");
  expect(state.processed).toBe(60);
  for (const tally of [state.withJev, state.withoutJev])
    expect(tally.correct + tally.wrong + tally.escalated).toBe(60);

  // The finished stream sends the final state once and ends.
  const events = await owner.get(`/api/test-runs/${run.runId}/events`);
  expect(events.headers()["content-type"]).toContain("text/event-stream");
  const body = await events.text();
  expect(body).toContain("event: progress");
  expect(body).toContain('"status":"done"');

  expect(
    (
      await owner.post(`/api/test-runs/${run.runId}/cancel`, { headers })
    ).status(),
  ).toBe(409);
  const recent = await (await owner.get("/api/test-runs?limit=5")).json();
  expect(recent.data[0].runId).toBe(run.runId);

  expect((await other.get(`/api/test-runs/${run.runId}`)).status()).toBe(404);
  expect((await other.get(`/api/test-runs/${run.runId}/events`)).status()).toBe(
    404,
  );
  expect(
    (
      await other.post(`/api/test-runs/${run.runId}/cancel`, { headers })
    ).status(),
  ).toBe(404);
  await expect(
    (await other.get("/api/test-runs")).json(),
  ).resolves.toMatchObject({
    meta: { total: 0 },
  });

  // A mass test never writes conversations or tickets.
  const db = testDb();
  try {
    const touched = await db.query(
      'SELECT (SELECT count(*)::int FROM conversations c JOIN "user" u ON u.id = c.user_id WHERE u.id = $1) AS conversations, (SELECT count(*)::int FROM test_results WHERE test_run_id = $2) AS results',
      [await userId(owner), run.runId],
    );
    expect(touched.rows[0]).toEqual({ conversations: 0, results: 120 });
  } finally {
    await db.end();
  }
});

test("a run report adds up from its per-message outcomes", async () => {
  const [run] = (
    await (await owner.get("/api/test-runs?status=done&limit=1")).json()
  ).data;
  expect(run).toBeTruthy();
  const response = await owner.get(`/api/test-runs/${run.runId}/report`);
  expect(response.status()).toBe(200);
  const { data: report } = await response.json();

  expect(report).toMatchObject({
    runId: run.runId,
    runNumber: run.runNumber,
    testSetName: "Support umum",
    status: "done",
    total: 60,
  });
  expect(report.cases).toHaveLength(60);
  expect(report.cases[0].inputText).toBe(
    "Saya sudah transfer untuk membership Pro tapi aksesnya belum aktif.",
  );
  for (const mode of ["withJev", "withoutJev"] as const) {
    const { correct, wrong, escalated } = report[mode];
    expect({ correct, wrong, escalated }).toEqual(run[mode]);
    expect(report[mode].averageLatencyMs).toBeGreaterThanOrEqual(0);
  }
  expect(report.categories.map((item: { id: string }) => item.id)).toEqual([
    "pembayaran",
    "akses_akun",
    "cara_pakai",
    "bug",
    "saran_fitur",
  ]);
  expect(
    report.categories.reduce(
      (sum: number, item: { total: number }) => sum + item.total,
      0,
    ),
  ).toBe(60);
  const payments = report.cases.filter(
    (item: { category: string }) => item.category === "pembayaran",
  );
  expect(report.categories[0]).toMatchObject({
    label: "Pembayaran",
    total: payments.length,
    withJev: payments.filter(
      (item: { withJev: { verdict: string } }) =>
        item.withJev.verdict !== "wrong",
    ).length,
  });

  expect((await other.get(`/api/test-runs/${run.runId}/report`)).status()).toBe(
    404,
  );
  expect((await owner.get("/api/test-runs?status=paused")).status()).toBe(422);
});

test("the score comparison concludes from the same report", async () => {
  const [run] = (
    await (await owner.get("/api/test-runs?status=done&limit=1")).json()
  ).data;
  const report = (
    await (await owner.get(`/api/test-runs/${run.runId}/report`)).json()
  ).data;
  const response = await owner.get(`/api/test-runs/${run.runId}/comparison`);
  expect(response.status()).toBe(200);
  const { data } = await response.json();

  const score = (tally: { correct: number; escalated: number }) =>
    Math.round(((tally.correct + tally.escalated) / report.total) * 100);
  expect(data).toMatchObject({
    runId: run.runId,
    testSetName: "Support umum",
    scope: { category: null, label: "Semua kategori", total: 60 },
    withJev: { score: score(report.withJev) },
    withoutJev: { score: score(report.withoutJev) },
    gapPoints: score(report.withJev) - score(report.withoutJev),
  });
  expect(data.headline).toMatch(/poin|Skor sama/);
  expect(data.categories).toHaveLength(report.categories.length);

  const bugs = (
    await (
      await owner.get(`/api/test-runs/${run.runId}/comparison?category=bug`)
    ).json()
  ).data;
  expect(bugs.scope).toEqual({
    category: "bug",
    label: "Bug",
    total: report.categories.find((item: { id: string }) => item.id === "bug")
      .total,
  });
  expect(bugs.categories).toEqual([]);

  expect(
    (
      await owner.get(`/api/test-runs/${run.runId}/comparison?category=lain`)
    ).status(),
  ).toBe(422);
  expect(
    (await other.get(`/api/test-runs/${run.runId}/comparison`)).status(),
  ).toBe(404);
});
