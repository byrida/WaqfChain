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

/**
 * Reads the full on-chain event history for a given asset — AssetCreated,
 * DonationReceived, and FundsDisbursed — via queryFilter, with block timestamps.
 * Returned in chronological order for AI reporting and auditing.
 */
async function getAssetEvents(assetId) {
  const id = Number(assetId);

  const [createdLogs, donationLogs, disbursedLogs] = await Promise.all([
    contract.queryFilter(contract.filters.AssetCreated(id), 0),
    contract.queryFilter(contract.filters.DonationReceived(id), 0),
    contract.queryFilter(contract.filters.FundsDisbursed(id), 0),
  ]);

  // Fetch timestamps for every unique block involved (parallel)
  const blockNumbers = [
    ...new Set(
      [...createdLogs, ...donationLogs, ...disbursedLogs].map((log) => log.blockNumber)
    ),
  ];
  const blocks = await Promise.all(blockNumbers.map((bn) => provider.getBlock(bn)));
  const timestampMap = {};
  blocks.forEach((block) => {
    if (block) {
      timestampMap[block.number] = new Date(Number(block.timestamp) * 1000).toISOString();
    }
  });

  const events = [
    ...createdLogs.map((log) => ({
      blockNumber: log.blockNumber,
      type: "AssetCreated",
      name: log.args.name,
      beneficiaryCategory: log.args.beneficiaryCategory,
      trustee: log.args.trustee,
      fundingGoalETH: ethers.formatEther(log.args.fundingGoal),
    })),
    ...donationLogs.map((log) => ({
      blockNumber: log.blockNumber,
      type: "DonationReceived",
      donor: log.args.donor,
      amountETH: ethers.formatEther(log.args.amount),
    })),
    ...disbursedLogs.map((log) => ({
      blockNumber: log.blockNumber,
      type: "FundsDisbursed",
      to: log.args.to,
      amountETH: ethers.formatEther(log.args.amount),
      purpose: log.args.purpose,
    })),
  ]
    .map((event) => ({ ...event, timestamp: timestampMap[event.blockNumber] || null }))
    .sort((a, b) => a.blockNumber - b.blockNumber)
    .map(({ blockNumber, ...event }) => event);

  return events;
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

// ─── Load Historical Disbursements ──────────────────────────────────────────────

/**
 * Queries past FundsDisbursed events from the blockchain and populates
 * the in-memory disbursement history. Called on startup so history is
 * available even if the backend starts after the deploy script ran.
 */
async function loadHistoryFromEvents() {
  try {
    const assetCount = await getNextAssetId();
    let loaded = 0;

    for (let i = 0; i < assetCount; i++) {
      const logs = await contract.queryFilter(contract.filters.FundsDisbursed(i), 0);
      for (const log of logs) {
        const amountETH = ethers.formatEther(log.args.amount);
        const purpose = log.args.purpose;
        const to = log.args.to;
        const block = await provider.getBlock(log.blockNumber);
        const timestamp = block ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString();

        // Only add if not already recorded (deduplication)
        const alreadyRecorded = disbursementHistory.some(
          (d) =>
            d.assetId === Number(i) &&
            d.to === to &&
            d.amountETH === amountETH &&
            d.purpose === purpose
        );
        if (!alreadyRecorded) {
          disbursementHistory.push({
            assetId: Number(i),
            to,
            amountETH,
            purpose,
            txHash: log.transactionHash,
            timestamp,
          });
          loaded++;
        }
      }
    }

    if (loaded > 0) {
      console.log(`[History] Loaded ${loaded} past disbursement(s) from blockchain.\n`);
    }
  } catch (err) {
    console.warn("[History] Could not load past disbursement events:", err.message);
  }
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
  getAssetEvents,
  getDisbursementHistory,
  loadHistoryFromEvents,
  createAsset,
  donate,
  disburseFunds,
  startEventListener,
};
