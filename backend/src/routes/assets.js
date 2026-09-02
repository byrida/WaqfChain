const express = require("express");
const router = express.Router();
const bc = require("../services/blockchain");
const ai = require("../services/ai");

// POST /api/assets — create a new Waqf asset
router.post("/", async (req, res) => {
  try {
    const { name, description, beneficiaryCategory, trustee, fundingGoalETH } = req.body;

    if (!name || !beneficiaryCategory || !trustee || !fundingGoalETH) {
      return res.status(400).json({ error: "name, beneficiaryCategory, trustee, and fundingGoalETH are required" });
    }

    const result = await bc.createAsset({ name, description: description || "", beneficiaryCategory, trustee, fundingGoalETH });
    const asset = await bc.getAsset(result.assetId);

    res.status(201).json({ ...result, asset });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/assets — list all assets
router.get("/", async (req, res) => {
  try {
    const assets = await bc.listAssets();
    res.json({ count: assets.length, assets });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/assets/:id/ai-report — AI impact report + compliance check via Gemini
router.get("/:id/ai-report", async (req, res) => {
  try {
    const assetId = Number(req.params.id);

    const asset = await bc.getAsset(assetId);
    const events = await bc.getAssetEvents(assetId);
    const report = await ai.generateAssetReport(asset, events);

    res.json({ assetId, ...report });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/assets/:id — get a single asset
router.get("/:id", async (req, res) => {
  try {
    const asset = await bc.getAsset(Number(req.params.id));
    res.json(asset);
  } catch (err) {
    const message = err.reason || err.message;
    res.status(err.code === "CALL_EXCEPTION" ? 404 : 500).json({ error: message });
  }
});

module.exports = router;
