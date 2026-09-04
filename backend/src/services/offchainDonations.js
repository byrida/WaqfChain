/**
 * Off-chain donation records for JazzCash / Easypaisa donors.
 *
 * These donations are still recorded on-chain via the platform wallet, but the
 * donor identity (phone number) cannot be stored on-chain. We keep a local,
 * in-memory ledger so mobile-money donors can look up their giving history.
 *
 * Note: data resets when the backend restarts. For a production deployment,
 * replace this with a database (PostgreSQL, MongoDB, etc.).
 */

const records = [];

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

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
  records.push(record);
  return record;
}

function getRecordsByPhone(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  return records
    .filter((r) => r.phoneNumber === normalized)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getRecordsByAsset(assetId) {
  return records
    .filter((r) => r.assetId === Number(assetId))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  createRecord,
  getRecordsByPhone,
  getRecordsByAsset,
  _records: records, // exposed for tests/debugging only
};
