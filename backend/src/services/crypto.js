/**
 * Cryptographic utilities for WaqfChain custodial wallet encryption.
 *
 * ⚠️  HACKATHON DEMO ONLY — CUSTODIAL KEY STORAGE
 * ─────────────────────────────────────────────────
 * In production, use a proper key management service (AWS KMS, GCP KMS,
 * Azure Key Vault) instead of storing encrypted private keys locally.
 *
 * Key Derivation:
 *   Uses scrypt (memory-hard KDF) to derive a 256-bit AES key from the
 *   TRUSTEE_ENCRYPTION_SECRET environment variable. Scrypt is preferred
 *   over PBKDF2 because it's resistant to hardware-based brute force.
 *
 * Security Notes:
 *   - The derived key is NEVER logged or exposed in error messages
 *   - The master secret must be at least 32 characters
 *   - Default/example secrets are rejected at startup
 */

const crypto = require("crypto");

// ─── Master Secret Validation ───────────────────────────────────────────────────

const MASTER_SECRET = process.env.TRUSTEE_ENCRYPTION_SECRET;

// Secrets that should be rejected (examples, defaults, weak values)
const BLOCKED_SECRETS = [
  "your_encryption_secret_here",
  "your_trustee_encryption_secret_here",
  "secret",
  "password",
  "changeme",
  "test",
  "example",
  "default",
  "",
  undefined,
];

function validateMasterSecret() {
  if (!MASTER_SECRET) {
    throw new Error(
      "TRUSTEE_ENCRYPTION_SECRET is required.\n" +
        "Set it in backend/.env — use a random 32+ character string.\n" +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (MASTER_SECRET.length < 32) {
    throw new Error(
      `TRUSTEE_ENCRYPTION_SECRET must be at least 32 characters (got ${MASTER_SECRET.length}).\n` +
        "Generate a strong secret with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (BLOCKED_SECRETS.includes(MASTER_SECRET.toLowerCase())) {
    throw new Error(
      "TRUSTEE_ENCRYPTION_SECRET appears to be a default/example value.\n" +
        "Please set a unique, random secret for production use."
    );
  }
}

// Validate on module load — fails fast if misconfigured
validateMasterSecret();

// ─── Key Derivation ─────────────────────────────────────────────────────────────

// Fixed salt for deterministic key derivation (in production, consider storing
// a random salt alongside encrypted data and re-deriving on each use)
const KDF_SALT = "waqfchain-custodial-keys-v1";
const KDF_COST = 16384; // CPU/memory cost parameter (N)
const KDF_BLOCK_SIZE = 8; // Block size (r)
const KDF_PARALLELIZATION = 1; // Parallelization (p)
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Derives a 256-bit AES key from the master secret using scrypt.
 * Called once at module load time.
 */
function deriveEncryptionKey() {
  return crypto.scryptSync(
    MASTER_SECRET,
    KDF_SALT,
    KEY_LENGTH,
    {
      N: KDF_COST,
      r: KDF_BLOCK_SIZE,
      p: KDF_PARALLELIZATION,
    }
  );
}

// Derive the key once at startup
const ENCRYPTION_KEY = deriveEncryptionKey();

// ─── Encryption / Decryption ────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string (private key) with AES-256-GCM.
 * Returns "iv:authTag:ciphertext" — all hex-encoded.
 *
 * @param {string} plaintext — the private key to encrypt
 * @returns {string} — "iv:authTag:ciphertext" in hex
 */
function encryptPrivateKey(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an "iv:authTag:ciphertext" string back to the raw private key.
 *
 * @param {string} encryptedBlob — "iv:authTag:ciphertext" in hex
 * @returns {string} — the decrypted plaintext
 */
function decryptPrivateKey(encryptedBlob) {
  const parts = encryptedBlob.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format");
  }
  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
};
