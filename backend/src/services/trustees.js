/**
 * Trustee authentication service — SQLite-backed store with crypto helpers.
 *
 * ⚠️  HACKATHON DEMO ONLY — CUSTODIAL KEY STORAGE
 * ─────────────────────────────────────────────────
 * This module generates blockchain wallets server-side and stores the
 * encrypted private key in SQLite. This is a simplified custodial pattern
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

const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const db = require("./database");
const { encryptPrivateKey, decryptPrivateKey } = require("./crypto");

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

// Encryption functions are imported from ./crypto module
// The master secret is validated and the key is derived at module load time

// ─── Prepared statements ────────────────────────────────────────────────────────

const insertTrustee = db.prepare(`
  INSERT INTO trustees (email, hashed_password, encrypted_private_key, wallet_address, org_name, description, phone, registration_type, status, created_at)
  VALUES (@email, @hashedPassword, @encryptedPrivateKey, @walletAddress, @orgName, @description, @phone, @registrationType, @status, @createdAt)
`);

const selectByEmail = db.prepare(`SELECT * FROM trustees WHERE email = ?`);
const selectByAddress = db.prepare(`SELECT * FROM trustees WHERE wallet_address = ?`);
const selectPending = db.prepare(`SELECT * FROM trustees WHERE status = 'pending'`);
const selectAll = db.prepare(`SELECT * FROM trustees`);
const selectApproved = db.prepare(`SELECT * FROM trustees WHERE status = 'approved'`);
const updateStatus = db.prepare(`UPDATE trustees SET status = ? WHERE email = ?`);

// ─── Functions ──────────────────────────────────────────────────────────────────

/**
 * Creates a new trustee record:
 *   - Generates a fresh Ethers.js wallet (address + private key)
 *   - Encrypts the private key with AES-256-GCM
 *   - Hashes the password with bcrypt (12 rounds)
 *   - Sets status to "pending" until the contract owner approves on-chain
 */
async function createTrustee({ email, password, orgName, description, phone }) {
  const existing = selectByEmail.get(email.toLowerCase());
  if (existing) {
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

  insertTrustee.run(record);

  // Fund the generated wallet with gas from the deployer account
  await fundWalletForGas(wallet.address);

  return sanitize(record);
}

/**
 * Verifies email + password. Returns the trustee record (with encrypted key)
 * or null if credentials are invalid.
 */
async function verifyTrustee(email, password) {
  const row = selectByEmail.get(email.toLowerCase());
  if (!row) return null;

  const match = await bcrypt.compare(password, row.hashed_password);
  if (!match) return null;

  return mapRow(row);
}

/**
 * Retrieves the decrypted private key for a trustee (used when signing
 * on-chain transactions on their behalf).
 *
 * ⚠️  In production, signing should happen inside a KMS — never extract
 *     the raw key into application memory.
 */
function getDecryptedKey(email) {
  const record = selectByEmail.get(email.toLowerCase());
  if (!record || !record.encrypted_private_key) return null;
  return decryptPrivateKey(record.encrypted_private_key);
}

/**
 * Looks up a trustee by email.
 */
function findByEmail(email) {
  const row = selectByEmail.get(email.toLowerCase());
  return row ? mapRow(row) : null;
}

/**
 * Looks up a trustee by wallet address.
 */
function findByAddress(address) {
  const row = selectByAddress.get(address);
  return row ? mapRow(row) : null;
}

// ─── Admin helpers ─────────────────────────────────────────────────────────────

/**
 * Returns all trustee records with "pending" status (sanitized).
 */
function listPending() {
  return selectPending.all().map((row) => sanitize(mapRow(row)));
}

/**
 * Returns all trustee records regardless of status (sanitized).
 */
function listAll() {
  return selectAll.all().map((row) => sanitize(mapRow(row)));
}

/**
 * Returns all trustee records with "approved" backend status (sanitized).
 */
function listApproved() {
  return selectApproved.all().map((row) => sanitize(mapRow(row)));
}

// ─── On-chain resync helpers ─────────────────────────────────────────────────────

const LAST_SYNCED_PATH = path.join(__dirname, "../../data/last-synced-contract.json");

function getLastSyncedContractAddress() {
  try {
    if (fs.existsSync(LAST_SYNCED_PATH)) {
      const data = JSON.parse(fs.readFileSync(LAST_SYNCED_PATH, "utf8"));
      return data.contractAddress || null;
    }
  } catch {
    // ignore read/parse errors
  }
  return null;
}

function setLastSyncedContractAddress(address) {
  try {
    const payload = {
      contractAddress: address,
      syncedAt: new Date().toISOString(),
    };
    fs.writeFileSync(LAST_SYNCED_PATH, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.warn("[Trustees] Could not write last-synced contract address:", err.message);
  }
}

/**
 * Calls approveTrustee() on the supplied contract for every trustee whose
 * backend record is marked "approved". This is used after a contract redeploy
 * to bring the new contract's approvedTrustees mapping back in sync with the
 * backend database.
 *
 * The contract instance must be connected to an owner signer.
 */
async function syncApprovedTrusteesWithContract(contract) {
  const approved = listApproved();
  if (approved.length === 0) {
    console.log("[Trustees] No approved trustees in backend to resync.");
    return { synced: 0, skipped: 0 };
  }

  console.log(`[Trustees] Resyncing ${approved.length} approved trustee(s) with current contract...`);
  let synced = 0;
  let skipped = 0;

  for (const trustee of approved) {
    try {
      const tx = await contract.approveTrustee(trustee.walletAddress);
      await tx.wait();
      console.log(`[Trustees] Re-approved on-chain: ${trustee.email} (${trustee.walletAddress.slice(0, 10)}...)`);
      synced++;
    } catch (err) {
      const reason = err.reason || err.message || "";
      if (reason.includes("already approved") || reason.includes("trustee already approved")) {
        console.log(`[Trustees] Already approved on-chain: ${trustee.email}`);
        skipped++;
      } else {
        console.warn(`[Trustees] Could not re-approve ${trustee.email}:`, reason);
        skipped++;
      }
    }
  }

  console.log(`[Trustees] Resync complete — ${synced} synced, ${skipped} skipped.\n`);
  return { synced, skipped };
}

/**
 * Resyncs approved trustees only when the contract address has changed since
 * the last successful sync. Persists the last synced address so restarts
 * against the same contract do not repeat the work.
 */
async function resyncApprovedTrusteesIfChanged(contract, currentContractAddress) {
  const last = getLastSyncedContractAddress();
  if (last && last.toLowerCase() === currentContractAddress.toLowerCase()) {
    console.log(`[Trustees] Contract address unchanged (${currentContractAddress}) — skipping resync.`);
    return { synced: 0, skipped: 0, unchanged: true };
  }

  const result = await syncApprovedTrusteesWithContract(contract);
  setLastSyncedContractAddress(currentContractAddress);
  return result;
}

/**
 * Marks a trustee as "approved" (backend status).
 * The caller must also call approveTrustee() on-chain separately.
 */
function setStatus(email, status) {
  const record = selectByEmail.get(email.toLowerCase());
  if (!record) throw new Error("Trustee not found.");
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid status.");
  }
  updateStatus.run(status, email.toLowerCase());
  return sanitize(mapRow({ ...record, status }));
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
  const existingEmail = selectByEmail.get(email.toLowerCase());
  if (existingEmail) {
    throw new Error("A trustee with this email already exists.");
  }

  const existingAddress = selectByAddress.get(walletAddress);
  if (existingAddress) {
    throw new Error("This wallet address is already registered.");
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

  insertTrustee.run(record);
  return sanitize(record);
}

// ─── Row mapper ─────────────────────────────────────────────────────────────────

function mapRow(row) {
  if (!row) return null;
  return {
    email: row.email,
    hashedPassword: row.hashed_password,
    encryptedPrivateKey: row.encrypted_private_key,
    walletAddress: row.wallet_address,
    orgName: row.org_name,
    description: row.description,
    phone: row.phone,
    registrationType: row.registration_type,
    status: row.status,
    createdAt: row.created_at,
  };
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
  listApproved,
  setStatus,
  sanitize,
  syncApprovedTrusteesWithContract,
  resyncApprovedTrusteesIfChanged,
};
