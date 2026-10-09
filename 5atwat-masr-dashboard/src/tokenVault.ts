import crypto from "crypto";
import type { AccountCredentials } from "./types";

// ============================================================
// خزنة التوكنات — كل توكن بيتخزن مشفّر (AES-256-GCM)
// المفتاح لازم يجي من متغير بيئة، مش مكتوب في الكود أبدًا
// ============================================================

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.TOKEN_VAULT_SECRET;
  if (!key || key.length < 32) {
    throw new Error(
      "TOKEN_VAULT_SECRET غير موجود أو قصير — لازم يكون 32 حرف على الأقل (استخدم متغير بيئة، مش قيمة ثابتة في الكود)"
    );
  }
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // نخزن iv + authTag + النص المشفر كسلسلة واحدة base64
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// ------------------------------------------------------------
// طبقة تخزين بسيطة (Interface) — استبدلها بقاعدة بياناتك الفعلية
// (Postgres / MongoDB / إلخ). دي مجرد نسخة in-memory للتجربة.
// ------------------------------------------------------------
export interface VaultStore {
  save(accountId: string, encryptedBlob: string): Promise<void>;
  load(accountId: string): Promise<string | null>;
  delete(accountId: string): Promise<void>;
}

export class InMemoryVaultStore implements VaultStore {
  private store = new Map<string, string>();
  async save(accountId: string, encryptedBlob: string) {
    this.store.set(accountId, encryptedBlob);
  }
  async load(accountId: string) {
    return this.store.get(accountId) ?? null;
  }
  async delete(accountId: string) {
    this.store.delete(accountId);
  }
}

export class TokenVault {
  constructor(private store: VaultStore) {}

  async storeCredentials(creds: AccountCredentials): Promise<void> {
    const blob = encryptToken(JSON.stringify(creds));
    await this.store.save(creds.accountId, blob);
  }

  async getCredentials(accountId: string): Promise<AccountCredentials | null> {
    const blob = await this.store.load(accountId);
    if (!blob) return null;
    return JSON.parse(decryptToken(blob)) as AccountCredentials;
  }

  async removeCredentials(accountId: string): Promise<void> {
    await this.store.delete(accountId);
  }
}
