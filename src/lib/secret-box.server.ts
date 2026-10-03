import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env.server";

// Encrypts small secrets (an account's own API key) before they reach the
// database: AES-256-GCM with a key derived from BETTER_AUTH_SECRET. Rotating
// that secret makes stored values unreadable; owners then save them again.

const VERSION = "v1";

function key(purpose: string) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      env.BETTER_AUTH_SECRET,
      Buffer.alloc(0),
      `bikinpakeai/${purpose}/${VERSION}`,
      32,
    ),
  );
}

/** "v1.<iv>.<tag>.<ciphertext>", base64url; `purpose` binds it to one use. */
export function sealSecret(plain: string, purpose: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(purpose), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

/** The original text, or null when it was sealed with another secret. */
export function openSecret(sealed: string, purpose: string) {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(purpose),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
