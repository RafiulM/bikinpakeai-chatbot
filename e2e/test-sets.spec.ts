import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { signUp } from "./support/session";

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
