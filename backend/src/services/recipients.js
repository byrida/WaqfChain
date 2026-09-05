/**
 * Recipients service — phone-to-wallet mapping for disbursement recipients.
 *
 * ⚠️  HACKATHON DEMO ONLY — CUSTODIAL KEY STORAGE
 * ─────────────────────────────────────────────────
 * This module generates blockchain wallets server-side for real-world
 * recipients (e.g., a school, a contractor, a family) who may not own
 * a crypto wallet themselves. The private key is encrypted and stored
 * in SQLite, linked to their phone number.
 *
 * This preserves genuine on-chain proof: each disbursement goes to a
 * unique, real wallet address — verifiable on any block explorer.
 *
 * In production, consider:
 *   - AWS KMS / GCP KMS for key management instead of local encryption
 *   - Or letting recipients claim funds via a mobile money integration
 */

const { ethers } = require("ethers");
const db = require("./database");
const { encryptPrivateKey, decryptPrivateKey } = require("./crypto");

// Encryption functions are imported from ./crypto module
// The master secret is validated and the key is derived at module load time

// ─── Prepared statements ────────────────────────────────────────────────────────

const insertRecipient = db.prepare(`
  INSERT INTO recipients (phone, name, wallet_address, encrypted_private_key, created_at)
  VALUES (@phone, @name, @walletAddress, @encryptedPrivateKey, @createdAt)
`);

const updateName = db.prepare(`UPDATE recipients SET name = ? WHERE phone = ?`);

const selectByPhone = db.prepare(`SELECT * FROM recipients WHERE phone = ?`);
const selectByAddress = db.prepare(`SELECT * FROM recipients WHERE wallet_address = ?`);
const selectAll = db.prepare(`SELECT * FROM recipients`);

// ─── Functions ──────────────────────────────────────────────────────────────────

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
  const existing = selectByPhone.get(normalizedPhone);
  if (existing) {
    // Update name if a new one is provided and different
    const newName = name && name.trim() ? name.trim() : existing.name;
    if (newName !== existing.name) {
      updateName.run(newName, normalizedPhone);
    }
    return {
      walletAddress: existing.wallet_address,
      name: newName,
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

  insertRecipient.run(record);

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
  const row = selectByPhone.get(normalizedPhone);
  if (!row) return null;
  return {
    walletAddress: row.wallet_address,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

/**
 * Looks up a recipient by wallet address.
 * Used to resolve names in disbursement history.
 */
function findByAddress(address) {
  const row = selectByAddress.get(address);
  if (!row) return null;
  return {
    walletAddress: row.wallet_address,
    name: row.name,
    phone: row.phone,
  };
}

/**
 * Returns all recipients (sanitized — no private keys).
 */
function listAll() {
  return selectAll.all().map((row) => ({
    walletAddress: row.wallet_address,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
  }));
}

/**
 * Gets the decrypted private key for a recipient (for signing on their behalf).
 * ⚠️  In production, use a KMS instead.
 */
function getDecryptedKey(phone) {
  const normalizedPhone = normalizePhone(phone);
  const row = selectByPhone.get(normalizedPhone);
  if (!row) return null;
  return decryptPrivateKey(row.encrypted_private_key);
}

module.exports = {
  getOrCreateRecipient,
  findByPhone,
  findByAddress,
  listAll,
  getDecryptedKey,
  normalizePhone,
};
