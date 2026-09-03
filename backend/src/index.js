require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { startEventListener, loadHistoryFromEvents, getNextAssetId, contract, provider } = require("./services/blockchain");
const { seedData } = require("./services/seed");

const assetsRouter = require("./routes/assets");
const donationsRouter = require("./routes/donations");
const disbursementsRouter = require("./routes/disbursements");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/assets", assetsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/disbursements", disbursementsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "waqfchain-backend" });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\nWaqfChain backend running on http://localhost:${PORT}\n`);
  console.log("Routes:");
  console.log("  POST   /api/assets          — create a new Waqf asset");
  console.log("  GET    /api/assets           — list all assets");
  console.log("  GET    /api/assets/:id       — get a single asset");
  console.log("  POST   /api/donations        — donate to an asset");
  console.log("  GET    /api/donations/:assetId/:donor — get donation for a donor");
  console.log("  POST   /api/disbursements    — disburse funds (trustee)");
  console.log("  GET    /api/health           — health check\n");

  // Start listening for on-chain events
  startEventListener();

  // Auto-seed if no assets exist (for fresh local node)
  try {
    const assetCount = await getNextAssetId();
    if (assetCount === 0) {
      console.log("[Auto-seed] No assets found on-chain — seeding demo data...\n");
      await seedData(contract, provider);
      // After seeding, load history from events (seeded disbursements)
      await loadHistoryFromEvents();
    } else {
      console.log(`[Auto-seed] Found ${assetCount} asset(s) on-chain — skipping seed.`);
      // Load past disbursement history from blockchain events
      await loadHistoryFromEvents();
    }
  } catch (err) {
    console.warn(
      "[Auto-seed] Could not check on-chain assets. Is the Hardhat node running?\n"
    );
    console.warn(
      "  To seed manually: cd smart-contracts && npx hardhat run scripts/deploy.js\n"
    );
  }
});
