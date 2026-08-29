const { ethers } = require("ethers");
const path = require("path");

// ─── Configuration ────────────────────────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat Account #0
const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ─── Provider & Signer ────────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ─── Contract Instance ────────────────────────────────────────────────────────────
const abi = require(path.join(__dirname, "../../contracts/WaqfRegistry.json"));
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

// ─── Helpers ───────────────────────────────────────────────────────────────────────

/**
 * Serialize a WaqfAsset struct returned by the contract into a plain object.
 * BigInt values are converted to strings (wei) and a human-readable ETH field is added.
 */
function serializeAsset(raw) {
  return {
    id: Number(raw.id),
    name: raw.name,
    description: raw.description,
    beneficiaryCategory: raw.beneficiaryCategory,
    fundingGoal: raw.fundingGoal.toString(),
    fundingGoalETH: ethers.formatEther(raw.fundingGoal),
    totalDonated: raw.totalDonated.toString(),
    totalDonatedETH: ethers.formatEther(raw.totalDonated),
    trustee: raw.trustee,
    isActive: raw.isActive,
  };
}

// ─── In-Memory Disbursement History ───────────────────────────────────────────────
// Stores FundsDisbursed events so the API can serve disbursement history.
const disbursementHistory = [];

function recordDisbursement(assetId, to, amountETH, purpose, txHash) {
  disbursementHistory.push({
    assetId: Number(assetId),
    to,
    amountETH,
    purpose,
    txHash,
    timestamp: new Date().toISOString(),
  });
}

function getDisbursementHistory(assetId) {
  if (assetId !== undefined) {
    return disbursementHistory.filter((d) => d.assetId === Number(assetId));
  }
  return disbursementHistory;
}

// ─── Contract Reads ────────────────────────────────────────────────────────────────

async function getNextAssetId() {
  const id = await contract.nextAssetId();
  return Number(id);
}

async function getAsset(assetId) {
  const raw = await contract.getAsset(assetId);
  return serializeAsset(raw);
}

async function listAssets() {
  const count = await getNextAssetId();
  const assets = [];
  for (let i = 0; i < count; i++) {
    try {
      assets.push(await getAsset(i));
    } catch {
      // skip inactive / non-existent
    }
  }
  return assets;
}

async function getDonation(assetId, donorAddress) {
  const amount = await contract.getDonation(assetId, donorAddress);
  return { assetId, donor: donorAddress, amount: amount.toString(), amountETH: ethers.formatEther(amount) };
}

// ─── Contract Writes ───────────────────────────────────────────────────────────────

async function createAsset({ name, description, beneficiaryCategory, trustee, fundingGoalETH }) {
  const fundingGoal = ethers.parseEther(fundingGoalETH);
  const tx = await contract.createAsset(name, description, beneficiaryCategory, trustee, fundingGoal);
  const receipt = await tx.wait();

  // Parse AssetCreated event from the receipt
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "AssetCreated"
  );
  const assetId = event ? Number(event.args.id) : null;

  return { txHash: receipt.hash, assetId };
}

async function donate(assetId, amountETH) {
  const value = ethers.parseEther(amountETH);
  const tx = await contract.donate(assetId, { value });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

async function disburseFunds({ assetId, to, amountETH, purpose }) {
  const amount = ethers.parseEther(amountETH);
  const tx = await contract.disburseFunds(assetId, to, amount, purpose);
  const receipt = await tx.wait();

  // Record locally for instant history (event listener also records as backup)
  recordDisbursement(assetId, to, amountETH, purpose, receipt.hash);

  return { txHash: receipt.hash };
}

// ─── Event Listener ────────────────────────────────────────────────────────────────

function startEventListener() {
  console.log("[Blockchain] Listening for on-chain events...\n");

  contract.on("AssetCreated", (id, name, beneficiaryCategory, trustee, fundingGoal) => {
    console.log(`[Event] AssetCreated  →  id=${Number(id)}  name="${name}"  category="${beneficiaryCategory}"  trustee=${trustee}  goal=${ethers.formatEther(fundingGoal)} ETH`);
  });

  contract.on("DonationReceived", (assetId, donor, amount) => {
    console.log(`[Event] DonationReceived  →  assetId=${Number(assetId)}  donor=${donor}  amount=${ethers.formatEther(amount)} ETH`);
  });

  contract.on("FundsDisbursed", (assetId, to, amount, purpose) => {
    const amountETH = ethers.formatEther(amount);
    console.log(`[Event] FundsDisbursed  →  assetId=${Number(assetId)}  to=${to}  amount=${amountETH} ETH  purpose="${purpose}"`);
    // Also record from event listener (catches disbursements from other sources)
    const alreadyRecorded = disbursementHistory.some(
      (d) => d.assetId === Number(assetId) && d.to === to && d.amountETH === amountETH && d.purpose === purpose
    );
    if (!alreadyRecorded) {
      recordDisbursement(assetId, to, amountETH, purpose, null);
    }
  });
}

module.exports = {
  provider,
  signer,
  contract,
  serializeAsset,
  getNextAssetId,
  getAsset,
  listAssets,
  getDonation,
  getDisbursementHistory,
  createAsset,
  donate,
  disburseFunds,
  startEventListener,
};
