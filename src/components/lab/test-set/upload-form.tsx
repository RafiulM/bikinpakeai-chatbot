import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertCircle, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MAX_FILE_BYTES,
  parseTestSetFile,
  RECOMMENDED_MIN_CASES,
  type ParsedCase,
} from "@/lib/lab/test-set-file";

export interface UploadedTestSet {
  name: string;
  cases: ParsedCase[];
}

/**
 * Upload a labelled test set (CSV or JSONL). The file is parsed in the
 * browser first so problems show up before anything is saved.
 */
export function UploadForm({
  onSave,
  saving,
}: {
  onSave: (set: UploadedTestSet) => Promise<void> | void;
  saving?: boolean;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [cases, setCases] = useState<ParsedCase[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCases([]);
    setErrors([]);
    setFileName(file?.name ?? null);
    if (!file) return;
    if (!/\.(csv|jsonl)$/i.test(file.name)) {
      setErrors(["Format tidak didukung. Pilih berkas .csv atau .jsonl."]);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrors([
        "Berkas lebih dari 1 MB. Kurangi jumlah baris (maksimal 100).",
      ]);
      return;
    }
    const result = parseTestSetFile(file.name, await file.text());
    setCases(result.cases);
    setErrors(result.errors);
    if (!name) setName(file.name.replace(/\.(csv|jsonl)$/i, ""));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || cases.length === 0 || errors.length > 0) return;
    await onSave({ name: name.trim(), cases });
  }

  const ready =
    name.trim().length > 0 && cases.length > 0 && errors.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-[10px] border border-dashed border-border-strong p-4"
      aria-labelledby={`${id}-title`}
    >
      <p id={`${id}-title`} className="text-[15px] font-semibold">
        Unggah test set sendiri
      </p>
      <div className="grid gap-1">
        <label htmlFor={`${id}-file`} className="text-sm font-medium">
          Berkas (.csv atau .jsonl)
        </label>
        <input
          id={`${id}-file`}
          type="file"
          accept=".csv,.jsonl"
          onChange={(event) => void handleFile(event)}
          aria-describedby={`${id}-hint`}
          className="text-sm file:mr-3 file:rounded-full file:border file:border-border-strong file:bg-card file:px-3.5 file:py-1.5 file:text-sm file:font-medium"
        />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Kolom wajib: <code>input_text</code> dan <code>expected_label</code>{" "}
          (jenis masalah seperti <code>pembayaran</code> atau keputusan seperti{" "}
          <code>escalated</code>). Maksimal 100 baris.
        </p>
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          Nama test set
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          className="h-10 rounded-full border border-border-strong bg-card px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
        />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="grid gap-1 text-sm text-danger-text">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="size-4" aria-hidden="true" />
            {errors.length} masalah di {fileName ?? "berkas"}
          </p>
          <ul className="grid list-disc gap-0.5 pl-6">
            {errors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
            {errors.length > 5 && <li>…dan {errors.length - 5} lagi.</li>}
          </ul>
        </div>
      )}

      {cases.length > 0 && (
        <div className="grid gap-2">
          <p role="status" className="text-sm">
            <strong className="font-semibold">{cases.length} pesan</strong> siap
            diuji
            {cases.length < RECOMMENDED_MIN_CASES &&
              ` · disarankan minimal ${RECOMMENDED_MIN_CASES} pesan agar hasilnya bermakna`}
            .
          </p>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Pratinjau lima pesan pertama</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-1.5 font-semibold">
                  Pesan
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  Label
                </th>
              </tr>
            </thead>
            <tbody>
              {cases.slice(0, 5).map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 [overflow-wrap:anywhere]">
                    {item.inputText}
                  </td>
                  <td className="py-1.5 font-mono text-xs">
                    {item.expectedLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button type="submit" disabled={!ready || saving} className="w-fit">
        <FileUp aria-hidden="true" />
        {saving ? "Menyimpan…" : "Simpan test set"}
      </Button>
    </form>
  );
}
