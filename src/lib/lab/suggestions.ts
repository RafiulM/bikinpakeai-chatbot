import type { IssueType } from "./types";

export interface SuggestedQuestion {
  id: string;
  text: string;
  product: string;
  category: IssueType;
}

// Curated quick questions shown on an empty conversation. One list serves the
// API and the offline preview so both always agree.
export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: "upgrade-pro",
    text: "Cara upgrade ke membership Pro?",
    product: "Membership",
    category: "pembayaran",
  },
  {
    id: "prdtask-password",
    text: "Lupa password akun PRDTask",
    product: "PRDTask",
    category: "akses_akun",
  },
  {
    id: "template-download",
    text: "Template yang saya beli tidak bisa diunduh",
    product: "Template",
    category: "bug",
  },
  {
    id: "community-discord",
    text: "Cara gabung komunitas Discord?",
    product: "Komunitas",
    category: "cara_pakai",
  },
  {
    id: "andalai-team",
    text: "AndalAI bisa dipakai untuk satu tim?",
    product: "AndalAI",
    category: "cara_pakai",
  },
  {
    id: "desain-dark-mode",
    text: "Kapan DesainPakeAI punya mode gelap?",
    product: "DesainPakeAI",
    category: "saran_fitur",
  },
];
