const express = require("express");
const router = express.Router();
const bc = require("../services/blockchain");

// GET /api/disbursements/history — all disbursement history
router.get("/history", (req, res) => {
  const history = bc.getDisbursementHistory();
  res.json({ count: history.length, history });
});

// GET /api/disbursements/history/:assetId — history for a specific asset
router.get("/history/:assetId", (req, res) => {
  const history = bc.getDisbursementHistory(Number(req.params.assetId));
  res.json({ count: history.length, history });
});

// POST /api/disbursements — disburse donated funds (trustee only via contract)
router.post("/", async (req, res) => {
  try {
    const { assetId, to, amountETH, purpose } = req.body;

    if (assetId === undefined || !to || !amountETH || !purpose) {
      return res.status(400).json({ error: "assetId, to, amountETH, and purpose are required" });
    }

    const result = await bc.disburseFunds({ assetId: Number(assetId), to, amountETH, purpose });
    const asset = await bc.getAsset(Number(assetId));

    res.json({ ...result, asset });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

module.exports = router;
