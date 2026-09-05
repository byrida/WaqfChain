/**
 * Trustee authentication service — in-memory store with crypto helpers.
 *
 * ⚠️  HACKATHON DEMO ONLY — CUSTODIAL KEY STORAGE
 * ─────────────────────────────────────────────────
 * This module generates blockchain wallets server-side and stores the
 * encrypted private key in memory. This is a simplified custodial pattern
 * suitable for a hackathon demo.
 *
 * In production you MUST NOT store raw or encrypted private keys in your
 * application database. Instead, use a proper key management service:
 *   - AWS KMS / GCP KMS / Azure Key Vault for signing
 *   - Hardware Security Modules (HSMs) for high-value keys
 *   - Or let trustees manage their own non-custodial wallets (MetaMask, etc.)
 *
 * The symmetric encryption used here (AES-256-GCM) is only a thin layer
 * to demonstrate the concept — it does NOT replace a real KMS.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

// ─── Gas funding for custodial wallets ───────────────────────────────────────────
// In the custodial model, the backend generates wallets that need ETH for gas.
// We fund them from the backend's deployer/admin wallet at creation time.
//
// ⚠️  Demo only — production would use a gas station pattern, meta-transactions,
//     or a Layer 2 with negligible gas costs.

const GAS_FUND_AMOUNT = ethers.parseEther("0.05"); // 0.05 ETH for gas

async function fundWalletForGas(address) {
  try {
    console.log(`[Trustees] Funding gas for new wallet: ${address}`);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
    const adminKey = process.env.PRIVATE_KEY;
    if (!adminKey) {
      console.warn("[Trustees] No PRIVATE_KEY — skipping gas funding");
      return;
    }
    const adminWallet = new ethers.Wallet(adminKey, provider);
    const balance = await provider.getBalance(adminWallet.address);
    if (balance < GAS_FUND_AMOUNT) {
      console.warn("[Trustees] Admin balance too low for gas funding");
      return;
    }
    const tx = await adminWallet.sendTransaction({ to: address, value: GAS_FUND_AMOUNT });
    await tx.wait();
    console.log(`[Trustees] Funded ${ethers.formatEther(GAS_FUND_AMOUNT)} ETH for gas to ${address}`);
  } catch (err) {
    console.warn(`[Trustees] Could not fund gas for ${address}:`, err.message);
  }
}

// ─── Symmetric encryption for private keys ─────────────────────────────────────

/**
 * AES-256-GCM key derived from the TRUSTEE_ENCRYPTION_SECRET env var.
 * Must be a 32-byte (256-bit) hex string or a passphrase that we hash to 32 bytes.
 */
const ENCRYPTION_SECRET = process.env.TRUSTEE_ENCRYPTION_SECRET;
if (!ENCRYPTION_SECRET) {
  throw new Error(
    "TRUSTEE_ENCRYPTION_SECRET is required. " +
      "Set it in backend/.env — use a random 32+ character string."
  );
}

// Derive a fixed 32-byte key from the secret (SHA-256)
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(ENCRYPTION_SECRET)
  .digest();

/**
 * Encrypts a plaintext string (private key) with AES-256-GCM.
 * Returns "iv:authTag:ciphertext" — all hex-encoded.
 */
function encryptPrivateKey(plainKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an "iv:authTag:ciphertext" string back to the raw private key.
 */
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

// ─── In-memory trustee store ───────────────────────────────────────────────────
// ⚠️  Demo only — use a real database (Postgres, MongoDB, etc.) in production.

const trustees = new Map(); // email → trustee record

/**
 * Creates a new trustee record:
 *   - Generates a fresh Ethers.js wallet (address + private key)
 *   - Encrypts the private key with AES-256-GCM
 *   - Hashes the password with bcrypt (12 rounds)
 *   - Sets status to "pending" until the contract owner approves on-chain
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.orgName       — organization / institution name
 * @param {string} params.description   — short description of the org/cause
 * @param {string} params.phone         — contact phone number
 */
async function createTrustee({ email, password, orgName, description, phone }) {
  if (trustees.has(email.toLowerCase())) {
    throw new Error("A trustee with this email already exists.");
  }

  // Generate a brand-new blockchain wallet for this trustee
  const wallet = ethers.Wallet.createRandom();

  // Encrypt the private key before storing
  const encryptedKey = encryptPrivateKey(wallet.privateKey);

  // Hash the password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const record = {
    email: email.toLowerCase(),
    hashedPassword,
    encryptedPrivateKey: encryptedKey,
    walletAddress: wallet.address,
    orgName: orgName || "",
    description: description || "",
    phone: phone || "",
    registrationType: "email",
    status: "pending", // "pending" | "approved" | "rejected"
    createdAt: new Date().toISOString(),
  };

  trustees.set(email.toLowerCase(), record);

  // Fund the generated wallet with gas from the deployer account
  await fundWalletForGas(wallet.address);

  return sanitize(record);
}

/**
 * Verifies email + password. Returns the trustee record (with encrypted key)
 * or null if credentials are invalid.
 */
async function verifyTrustee(email, password) {
  const record = trustees.get(email.toLowerCase());
  if (!record) return null;

  const match = await bcrypt.compare(password, record.hashedPassword);
  if (!match) return null;

  return record;
}

/**
 * Retrieves the decrypted private key for a trustee (used when signing
 * on-chain transactions on their behalf).
 *
 * ⚠️  In production, signing should happen inside a KMS — never extract
 *     the raw key into application memory.
 */
function getDecryptedKey(email) {
  const record = trustees.get(email.toLowerCase());
  if (!record) return null;
  return decryptPrivateKey(record.encryptedPrivateKey);
}

/**
 * Looks up a trustee by email.
 */
function findByEmail(email) {
  return trustees.get(email.toLowerCase()) || null;
}

/**
 * Looks up a trustee by wallet address.
 */
function findByAddress(address) {
  for (const record of trustees.values()) {
    if (record.walletAddress.toLowerCase() === address.toLowerCase()) {
      return record;
    }
  }
  return null;
}

// ─── Admin helpers ─────────────────────────────────────────────────────────────

/**
 * Returns all trustee records with "pending" status (sanitized).
 */
function listPending() {
  const result = [];
  for (const record of trustees.values()) {
    if (record.status === "pending") {
      result.push(sanitize(record));
    }
  }
  return result;
}

/**
 * Returns all trustee records regardless of status (sanitized).
 */
function listAll() {
  const result = [];
  for (const record of trustees.values()) {
    result.push(sanitize(record));
  }
  return result;
}

/**
 * Marks a trustee as "approved" (backend status).
 * The caller must also call approveTrustee() on-chain separately.
 */
function setStatus(email, status) {
  const record = trustees.get(email.toLowerCase());
  if (!record) throw new Error("Trustee not found.");
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid status.");
  }
  record.status = status;
  return sanitize(record);
}

/**
 * Strips sensitive fields (hashedPassword, encryptedPrivateKey) before
 * returning a record to the client.
 */
function sanitize(record) {
  if (!record) return null;
  const { hashedPassword, encryptedPrivateKey, ...safe } = record;
  return safe;
}

/**
 * Registers a trustee using their own wallet address (MetaMask).
 * No custodial key is stored — the trustee manages their own private key.
 * Still requires email + password for portal login.
 */
async function registerWithWallet({ email, password, walletAddress, orgName, description, phone }) {
  if (trustees.has(email.toLowerCase())) {
    throw new Error("A trustee with this email already exists.");
  }

  // Check wallet address isn't already registered
  for (const record of trustees.values()) {
    if (record.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
      throw new Error("This wallet address is already registered.");
    }
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const record = {
    email: email.toLowerCase(),
    hashedPassword,
    encryptedPrivateKey: null,
    walletAddress,
    orgName: orgName || "",
    description: description || "",
    phone: phone || "",
    registrationType: "wallet",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  trustees.set(email.toLowerCase(), record);
  return sanitize(record);
}

module.exports = {
  createTrustee,
  registerWithWallet,
  verifyTrustee,
  getDecryptedKey,
  findByEmail,
  findByAddress,
  encryptPrivateKey,
  decryptPrivateKey,
  listPending,
  listAll,
  setStatus,
  sanitize,
};
