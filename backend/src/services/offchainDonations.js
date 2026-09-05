/**
 * Off-chain donation records for JazzCash / Easypaisa donors.
 *
 * These donations are still recorded on-chain via the platform wallet, but the
 * donor identity (phone number) cannot be stored on-chain. We keep a SQLite
 * database so mobile-money donors can look up their giving history even after
 * the backend restarts.
 *
 * Note: All actual Waqf financial records (asset details, donation totals)
 * remain on the blockchain — this is strictly for phone-linked donor identity.
 */

const db = require("./database");

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

// ─── Prepared statements ────────────────────────────────────────────────────────

const insertRecord = db.prepare(`
  INSERT INTO offchain_donations (id, asset_id, phone_number, payment_method, amount_pkr, amount_eth, tx_hash, timestamp)
  VALUES (@id, @assetId, @phoneNumber, @paymentMethod, @amountPKR, @amountETH, @txHash, @timestamp)
`);

const selectByPhone = db.prepare(`
  SELECT * FROM offchain_donations WHERE phone_number = ? ORDER BY timestamp DESC
`);

const selectByAsset = db.prepare(`
  SELECT * FROM offchain_donations WHERE asset_id = ? ORDER BY timestamp DESC
`);

// ─── Functions ──────────────────────────────────────────────────────────────────

function createRecord({
  assetId,
  phoneNumber,
  paymentMethod,
  amountPKR,
  amountETH,
  txHash,
}) {
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    assetId: Number(assetId),
    phoneNumber: normalizePhone(phoneNumber),
    paymentMethod,
    amountPKR: Number(amountPKR),
    amountETH: String(amountETH),
    txHash,
    timestamp: new Date().toISOString(),
  };

  insertRecord.run(record);
  return record;
}

function getRecordsByPhone(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  const rows = selectByPhone.all(normalized);
  return rows.map(mapRow);
}

function getRecordsByAsset(assetId) {
  const rows = selectByAsset.all(Number(assetId));
  return rows.map(mapRow);
}

// ─── Row mapper ─────────────────────────────────────────────────────────────────

function mapRow(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    phoneNumber: row.phone_number,
    paymentMethod: row.payment_method,
    amountPKR: row.amount_pkr,
    amountETH: row.amount_eth,
    txHash: row.tx_hash,
    timestamp: row.timestamp,
  };
}

module.exports = {
  createRecord,
  getRecordsByPhone,
  getRecordsByAsset,
};
