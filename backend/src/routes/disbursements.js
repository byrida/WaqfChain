const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bc = require("../services/blockchain");
const recipients = require("../services/recipients");
const trustees = require("../services/trustees");

const JWT_SECRET = process.env.JWT_SECRET;

// GET /api/disbursements/history — all disbursement history (with recipient names)
router.get("/history", (req, res) => {
  const history = bc.getDisbursementHistory();
  // Enrich with recipient names
  const enriched = history.map((d) => {
    const recipient = recipients.findByAddress(d.to);
    return {
      ...d,
      recipientName: recipient?.name || null,
      recipientPhone: recipient?.phone || null,
    };
  });
  res.json({ count: enriched.length, history: enriched });
});

// GET /api/disbursements/history/:assetId — history for a specific asset
router.get("/history/:assetId", (req, res) => {
  const history = bc.getDisbursementHistory(Number(req.params.assetId));
  // Enrich with recipient names
  const enriched = history.map((d) => {
    const recipient = recipients.findByAddress(d.to);
    return {
      ...d,
      recipientName: recipient?.name || null,
      recipientPhone: recipient?.phone || null,
    };
  });
  res.json({ count: enriched.length, history: enriched });
});

// GET /api/disbursements/recipients — list all known recipients
router.get("/recipients", (req, res) => {
  const all = recipients.listAll();
  res.json({ count: all.length, recipients: all });
});

// GET /api/disbursements/recipients/:phone — lookup a specific recipient
router.get("/recipients/:phone", (req, res) => {
  const recipient = recipients.findByPhone(req.params.phone);
  if (!recipient) {
    return res.status(404).json({ error: "Recipient not found." });
  }
  res.json(recipient);
});

// POST /api/disbursements — disburse donated funds
// Accepts either:
//   - phone + name (generates/resolves wallet automatically)
//   - to (raw address, for backward compatibility with seed data)
//
// If a JWT is present, the disbursement is signed with the trustee's
// custodial private key (no MetaMask needed).
router.post("/", async (req, res) => {
  try {
    const { assetId, to, recipientPhone, recipientName, amountETH, purpose } = req.body;

    if (assetId === undefined || !amountETH || !purpose) {
      return res.status(400).json({ error: "assetId, amountETH, and purpose are required" });
    }

    const amount = parseFloat(amountETH);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a number greater than 0" });
    }

    let recipientAddress = to;
    let resolvedName = null;
    let resolvedPhone = null;

    // If phone is provided, resolve/generate recipient wallet
    if (recipientPhone) {
      if (!recipientPhone.trim()) {
        return res.status(400).json({ error: "Recipient phone cannot be empty." });
      }

      const recipient = recipients.getOrCreateRecipient(recipientPhone, recipientName);
      recipientAddress = recipient.walletAddress;
      resolvedName = recipient.name;
      resolvedPhone = recipient.phone;
    }

    if (!recipientAddress) {
      return res.status(400).json({
        error: "Either 'to' (address) or 'recipientPhone' is required.",
      });
    }

    // JWT custodial auth — sign with the trustee's stored key
    let contractOverride = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        const privateKey = trustees.getDecryptedKey(payload.email);
        if (privateKey) {
          contractOverride = bc.getContractForKey(privateKey);
        }
      } catch {
        // Invalid token — fall through to default signer
      }
    }

    // Call the smart contract with the resolved address
    const result = await bc.disburseFunds({
      assetId: Number(assetId),
      to: recipientAddress,
      amountETH,
      purpose,
      contractOverride,
    });

    const asset = await bc.getAsset(Number(assetId));

    res.json({
      ...result,
      asset,
      recipient: resolvedName
        ? { name: resolvedName, phone: resolvedPhone, walletAddress: recipientAddress }
        : null,
    });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

module.exports = router;
