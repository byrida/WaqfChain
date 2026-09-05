/**
 * SQLite database initialization for WaqfChain off-chain data.
 *
 * Stores identity/contact information that cannot or should not live on-chain:
 *   - Trustee accounts (email, hashed password, encrypted private key, wallet address)
 *   - Recipient wallets (phone → wallet mapping for disbursement proof)
 *   - JazzCash/Easypaisa donation records (phone-linked giving history)
 *
 * All actual Waqf financial records (asset details, donation totals, disbursement
 * history) remain on the blockchain — this database is strictly for off-chain
 * identity data that helps the app function.
 *
 * Database file: backend/data/waqfchain.db (auto-created on first run)
 *
 * ⚠️  HACKATHON DEMO ONLY — CUSTODIAL KEY STORAGE
 * ─────────────────────────────────────────────────
 * Private keys are stored encrypted (AES-256-GCM) in SQLite. For production,
 * use a proper key management service (AWS KMS, GCP KMS, Azure Key Vault).
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Database file location: backend/data/waqfchain.db
const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "waqfchain.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Open database (creates file if it doesn't exist)
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// ─── Schema ─────────────────────────────────────────────────────────────────────

db.exec(`
  -- Trustee accounts (email/password auth with custodial or own wallets)
  CREATE TABLE IF NOT EXISTS trustees (
    email TEXT PRIMARY KEY COLLATE NOCASE,
    hashed_password TEXT NOT NULL,
    encrypted_private_key TEXT,  -- NULL for "wallet" registration type
    wallet_address TEXT NOT NULL UNIQUE,
    org_name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    registration_type TEXT NOT NULL DEFAULT 'email',  -- 'email' or 'wallet'
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Recipient wallets (phone-to-wallet mapping for disbursements)
  CREATE TABLE IF NOT EXISTS recipients (
    phone TEXT PRIMARY KEY,  -- normalized phone number
    name TEXT DEFAULT '',
    wallet_address TEXT NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Off-chain donation records (JazzCash/Easypaisa donors)
  CREATE TABLE IF NOT EXISTS offchain_donations (
    id TEXT PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    phone_number TEXT NOT NULL,  -- normalized
    payment_method TEXT NOT NULL,
    amount_pkr REAL NOT NULL,
    amount_eth TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Indexes for common lookups
  CREATE INDEX IF NOT EXISTS idx_offchain_phone ON offchain_donations(phone_number);
  CREATE INDEX IF NOT EXISTS idx_offchain_asset ON offchain_donations(asset_id);
  CREATE INDEX IF NOT EXISTS idx_recipients_wallet ON recipients(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_trustees_wallet ON trustees(wallet_address);
`);

console.log(`[Database] SQLite initialized at: ${DB_PATH}`);

module.exports = db;
