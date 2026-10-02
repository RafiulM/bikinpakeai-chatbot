import test from "node:test";
import assert from "node:assert/strict";
import { parseTestSetFile } from "../src/lib/lab/test-set-file.ts";

test("CSV with quotes, semicolons and a BOM parses into cases", () => {
  const csv =
    '﻿input_text,expected_label\n"Halo, saya mau ""refund""",escalated\nLupa password PRDTask;akses_akun\n\n';
  const result = parseTestSetFile("uji.csv", csv);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.cases, [
    { inputText: 'Halo, saya mau "refund"', expectedLabel: "escalated" },
    { inputText: "Lupa password PRDTask", expectedLabel: "akses_akun" },
  ]);
});

test("problems are reported per line and bad rows are skipped", () => {
  const csv = "input_text,expected_label\n,bug\nTombol rusak,BUG\nHalo,lainnya";
  const result = parseTestSetFile("uji.csv", csv);
  assert.deepEqual(result.cases, [
    { inputText: "Tombol rusak", expectedLabel: "bug" },
  ]);
  assert.deepEqual(result.errors, [
    "Baris 2: input_text kosong.",
    "Baris 4: expected_label “lainnya” tidak dikenal.",
  ]);
});

test("a CSV without the required columns is rejected early", () => {
  assert.deepEqual(parseTestSetFile("uji.csv", "text,label\nx,y").errors, [
    "Baris 1: header wajib berisi kolom input_text dan expected_label.",
  ]);
});

test("JSONL lines and size limits are enforced", () => {
  const jsonl =
    '{"input_text":"Kode promo 100%","expected_label":"blocked"}\nnot json\n';
  const result = parseTestSetFile("uji.jsonl", jsonl);
  assert.equal(result.cases.length, 1);
  assert.deepEqual(result.errors, ["Baris 2: bukan JSON yang valid."]);
  const many =
    "input_text,expected_label\n" +
    Array.from({ length: 101 }, (_, i) => `Pesan ${i},bug`).join("\n");
  assert.match(parseTestSetFile("uji.csv", many).errors.at(-1), /Maksimal 100/);
  assert.deepEqual(
    parseTestSetFile("kosong.csv", "input_text,expected_label\n").errors,
    ["Berkas tidak berisi pesan."],
  );
});
