// Parses an uploaded test set (CSV or JSONL) into labelled cases. Pure, so
// the browser preview and the server import validate exactly the same way.

export const EXPECTED_LABELS = [
  "pembayaran",
  "akses_akun",
  "cara_pakai",
  "bug",
  "saran_fitur",
  "answered",
  "masked",
  "blocked",
  "escalated",
  "clarify",
] as const;
export type ExpectedLabel = (typeof EXPECTED_LABELS)[number];

/** How each expected label reads in the test set picker. */
export const EXPECTED_LABEL_TEXT: Record<ExpectedLabel, string> = {
  pembayaran: "Pembayaran",
  akses_akun: "Akses akun",
  cara_pakai: "Cara pakai",
  bug: "Bug",
  saran_fitur: "Saran fitur",
  answered: "Dijawab biasa",
  masked: "Data sensitif",
  blocked: "Prompt injection",
  escalated: "Eskalasi",
  clarify: "Klarifikasi",
};

export const MAX_CASES = 100;
export const RECOMMENDED_MIN_CASES = 50;
export const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TEXT = 2000;

export interface ParsedCase {
  inputText: string;
  expectedLabel: ExpectedLabel;
}

export interface ParseResult {
  cases: ParsedCase[];
  /** Human-readable problems, each naming its line. */
  errors: string[];
}

/** Splits one CSV line, honoring double quotes and escaped quotes (""). */
function splitCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === "," || char === ";") {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

function checkCase(
  inputText: unknown,
  expectedLabel: unknown,
  line: number,
  errors: string[],
): ParsedCase | null {
  const text = typeof inputText === "string" ? inputText.trim() : "";
  const label =
    typeof expectedLabel === "string" ? expectedLabel.trim().toLowerCase() : "";
  if (!text) {
    errors.push(`Baris ${line}: input_text kosong.`);
    return null;
  }
  if (text.length > MAX_TEXT) {
    errors.push(`Baris ${line}: input_text lebih dari ${MAX_TEXT} karakter.`);
    return null;
  }
  if (!(EXPECTED_LABELS as readonly string[]).includes(label)) {
    errors.push(
      `Baris ${line}: expected_label “${label || "(kosong)"}” tidak dikenal.`,
    );
    return null;
  }
  return { inputText: text, expectedLabel: label as ExpectedLabel };
}

export function parseTestSetFile(
  fileName: string,
  content: string,
): ParseResult {
  const errors: string[] = [];
  const cases: ParsedCase[] = [];
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const isJsonl = /\.jsonl$/i.test(fileName);

  if (isJsonl) {
    lines.forEach((raw, index) => {
      if (!raw.trim()) return;
      try {
        const row = JSON.parse(raw) as Record<string, unknown>;
        const parsed = checkCase(
          row.input_text,
          row.expected_label,
          index + 1,
          errors,
        );
        if (parsed) cases.push(parsed);
      } catch {
        errors.push(`Baris ${index + 1}: bukan JSON yang valid.`);
      }
    });
  } else {
    const header = splitCsvLine(lines[0] ?? "").map((cell) =>
      cell.toLowerCase(),
    );
    const textAt = header.indexOf("input_text");
    const labelAt = header.indexOf("expected_label");
    if (textAt === -1 || labelAt === -1)
      return {
        cases: [],
        errors: [
          "Baris 1: header wajib berisi kolom input_text dan expected_label.",
        ],
      };
    lines.slice(1).forEach((raw, index) => {
      if (!raw.trim()) return;
      const cells = splitCsvLine(raw);
      const parsed = checkCase(
        cells[textAt],
        cells[labelAt],
        index + 2,
        errors,
      );
      if (parsed) cases.push(parsed);
    });
  }

  if (cases.length === 0 && errors.length === 0)
    errors.push("Berkas tidak berisi pesan.");
  if (cases.length > MAX_CASES)
    errors.push(
      `Terlalu banyak pesan (${cases.length}). Maksimal ${MAX_CASES}.`,
    );
  return { cases, errors };
}
