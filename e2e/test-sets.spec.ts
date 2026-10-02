import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { headers, signUp } from "./support/session";

let owner: APIRequestContext;
let other: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  const baseURL = "http://localhost:3101";
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
