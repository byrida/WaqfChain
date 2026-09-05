/**
 * Recipients service — phone-to-wallet mapping for disbursement recipients.
 *
 * ⚠️  HACKATHON DEMO ONLY — CUSTODIAL KEY STORAGE
 * ─────────────────────────────────────────────────
 * This module generates blockchain wallets server-side for real-world
 * recipients (e.g., a school, a contractor, a family) who may not own
 * a crypto wallet themselves. The private key is encrypted and stored
 * in memory, linked to their phone number.
 *
 * This preserves genuine on-chain proof: each disbursement goes to a
 * unique, real wallet address — verifiable on any block explorer.
 *
 * In production, consider:
 *   - Using a proper database (Postgres, MongoDB) instead of in-memory Map
 *   - AWS KMS / GCP KMS for key management instead of local encryption
 *   - Or letting recipients claim funds via a mobile money integration
 */

const crypto = require("crypto");
const { ethers } = require("ethers");

// ─── Symmetric encryption for recipient private keys ────────────────────────────

const ENCRYPTION_SECRET = process.env.TRUSTEE_ENCRYPTION_SECRET;
if (!ENCRYPTION_SECRET) {
  throw new Error(
    "TRUSTEE_ENCRYPTION_SECRET is required for recipient wallet encryption."
  );
}

const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(ENCRYPTION_SECRET)
  .digest();

function encryptPrivateKey(plainKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decryptPrivateKey(encryptedBlob) {
  const [ivHex, authTagHex, ciphertext] = encryptedBlob.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── In-memory recipient store ──────────────────────────────────────────────────
// ⚠️  Demo only — use a real database in production.

const recipients = new Map(); // normalized phone → recipient record

/**
 * Normalizes a phone number for consistent lookup.
 * Strips spaces, dashes, and leading zeros for international format.
 */
function normalizePhone(phone) {
  return phone.replace(/[\s\-()]/g, "").replace(/^0+/, "");
}

/**
 * Gets or creates a recipient wallet.
 *
 * If a wallet already exists for this phone number, returns it.
 * Otherwise, generates a brand new wallet and stores it.
 *
 * @param {string} phone — recipient's phone number
 * @param {string} name  — recipient's name (for display in history/reports)
 * @returns {{ walletAddress: string, name: string, phone: string, isNew: boolean }}
 */
function getOrCreateRecipient(phone, name) {
  const normalizedPhone = normalizePhone(phone);

  // Check if recipient already exists
  if (recipients.has(normalizedPhone)) {
    const existing = recipients.get(normalizedPhone);
    // Update name if a new one is provided and different
    if (name && name.trim() && name.trim() !== existing.name) {
      existing.name = name.trim();
    }
    return {
      walletAddress: existing.walletAddress,
      name: existing.name,
      phone: existing.phone,
      isNew: false,
    };
  }

  // Generate a brand-new wallet for this recipient
  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = encryptPrivateKey(wallet.privateKey);

  const record = {
    phone: normalizedPhone,
    name: (name || "").trim(),
    walletAddress: wallet.address,
    encryptedPrivateKey: encryptedKey,
    createdAt: new Date().toISOString(),
  };

  recipients.set(normalizedPhone, record);

  return {
    walletAddress: record.walletAddress,
    name: record.name,
    phone: record.phone,
    isNew: true,
  };
}

/**
 * Looks up a recipient by phone number.
 */
function findByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);
  const record = recipients.get(normalizedPhone);
  if (!record) return null;
  return {
    walletAddress: record.walletAddress,
    name: record.name,
    phone: record.phone,
    createdAt: record.createdAt,
  };
}

/**
 * Looks up a recipient by wallet address.
 * Used to resolve names in disbursement history.
 */
function findByAddress(address) {
  for (const record of recipients.values()) {
    if (record.walletAddress.toLowerCase() === address.toLowerCase()) {
      return {
        walletAddress: record.walletAddress,
        name: record.name,
        phone: record.phone,
      };
    }
  }
  return null;
}

/**
 * Returns all recipients (sanitized — no private keys).
 */
function listAll() {
  const result = [];
  for (const record of recipients.values()) {
    result.push({
      walletAddress: record.walletAddress,
      name: record.name,
      phone: record.phone,
      createdAt: record.createdAt,
    });
  }
  return result;
}

/**
 * Gets the decrypted private key for a recipient (for signing on their behalf).
 * ⚠️  In production, use a KMS instead.
 */
function getDecryptedKey(phone) {
  const normalizedPhone = normalizePhone(phone);
  const record = recipients.get(normalizedPhone);
  if (!record) return null;
  return decryptPrivateKey(record.encryptedPrivateKey);
}

module.exports = {
  getOrCreateRecipient,
  findByPhone,
  findByAddress,
  listAll,
  getDecryptedKey,
  normalizePhone,
};
