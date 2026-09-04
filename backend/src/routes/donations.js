const express = require("express");
const router = express.Router();
const bc = require("../services/blockchain");
const offchain = require("../services/offchainDonations");

const VALID_PHONE = /^03\d{9}$/;

// POST /api/donations — donate to an asset
// If phoneNumber + paymentMethod are provided, an off-chain record is also
// created so JazzCash / Easypaisa donors can look up their giving history.
router.post("/", async (req, res) => {
  try {
    const { assetId, amountETH, phoneNumber, paymentMethod } = req.body;

    if (assetId === undefined || assetId === null || !amountETH) {
      return res.status(400).json({ error: "assetId and amountETH are required" });
    }

    const amount = parseFloat(amountETH);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a number greater than 0" });
    }

    // Validate mobile-money fields if either is supplied
    if (phoneNumber || paymentMethod) {
      if (!VALID_PHONE.test(phoneNumber?.replace(/\D/g, ""))) {
        return res.status(400).json({ error: "Invalid Pakistani phone number" });
      }
      const validMethods = ["JazzCash", "Easypaisa"];
      if (!validMethods.includes(paymentMethod)) {
        return res.status(400).json({
          error: "paymentMethod must be JazzCash or Easypaisa",
        });
      }
    }

    const result = await bc.donate(Number(assetId), amountETH);
    const asset = await bc.getAsset(Number(assetId));

    // Store off-chain record for mobile-money donors
    if (phoneNumber && paymentMethod) {
      offchain.createRecord({
        assetId: Number(assetId),
        phoneNumber,
        paymentMethod,
        amountPKR: req.body.amountPKR,
        amountETH,
        txHash: result.txHash,
      });
    }

    res.json({ ...result, asset });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/donations/offchain/:phone — get off-chain donations by phone number
// (must come BEFORE /:assetId/:donor to avoid "offchain" being parsed as assetId)
router.get("/offchain/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const records = offchain.getRecordsByPhone(phone);
    res.json({ phoneNumber: phone.replace(/\D/g, ""), donations: records });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/donations/offchain/asset/:assetId — get off-chain donations for an asset
router.get("/offchain/asset/:assetId", async (req, res) => {
  try {
    const { assetId } = req.params;
    const records = offchain.getRecordsByAsset(assetId);
    res.json({ assetId: Number(assetId), donations: records });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// GET /api/donations/:assetId/:donor — get on-chain donation amount for a wallet
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
