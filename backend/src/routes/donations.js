const express = require("express");
const router = express.Router();
const bc = require("../services/blockchain");

// POST /api/donations — donate to an asset
router.post("/", async (req, res) => {
  try {
    const { assetId, amountETH } = req.body;

    if (assetId === undefined || assetId === null || !amountETH) {
      return res.status(400).json({ error: "assetId and amountETH are required" });
    }

    const amount = parseFloat(amountETH);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a number greater than 0" });
    }

    const result = await bc.donate(Number(assetId), amountETH);
    const asset = await bc.getAsset(Number(assetId));

    res.json({ ...result, asset });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/donations/:assetId/:donor — get donation amount for a specific donor
router.get("/:assetId/:donor", async (req, res) => {
  try {
    const { assetId, donor } = req.params;
    const donation = await bc.getDonation(Number(assetId), donor);
    res.json(donation);
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

module.exports = router;
