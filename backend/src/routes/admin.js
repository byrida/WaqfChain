/**
 * Admin routes — trustee application management.
 *
 *   GET    /api/admin/trustees          — list all trustee applications
 *   GET    /api/admin/trustees/pending  — list only pending applications
 *   POST   /api/admin/trustees/approve  — approve a trustee (updates backend + on-chain)
 *   POST   /api/admin/trustees/reject   — reject a trustee application
 *   GET    /api/admin/owner             — returns the configured owner address
 *
 * All routes require the X-Admin-Address header matching the contract owner.
 *
 * ⚠️  HACKATHON DEMO ONLY — see middleware/admin.js for security disclaimers.
 */

const express = require("express");
const router = express.Router();
const { requireAdmin, OWNER_ADDRESS } = require("../middleware/admin");
const trustees = require("../services/trustees");
const bc = require("../services/blockchain");

// Apply admin gate to all routes in this file
router.use(requireAdmin);

// ─── GET /api/admin/owner ──────────────────────────────────────────────────────
// Useful for the frontend to check if the connected wallet is the owner.
router.get("/owner", (req, res) => {
  res.json({ ownerAddress: OWNER_ADDRESS });
});

// ─── GET /api/admin/trustees ───────────────────────────────────────────────────
router.get("/trustees", (req, res) => {
  const all = trustees.listAll();
  res.json({ trustees: all, total: all.length });
});

// ─── GET /api/admin/trustees/pending ───────────────────────────────────────────
router.get("/trustees/pending", (req, res) => {
  const pending = trustees.listPending();
  res.json({ trustees: pending, total: pending.length });
});

// ─── POST /api/admin/trustees/approve ──────────────────────────────────────────
// Body: { email }
// Approves on-chain AND updates backend status.
router.post("/trustees/approve", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const record = trustees.findByEmail(email);
    if (!record) {
      return res.status(404).json({ error: "Trustee not found." });
    }
    if (record.status === "approved") {
      return res.status(409).json({ error: "Trustee is already approved." });
    }

    // 1. Approve on-chain (calls approveTrustee on the smart contract)
    const { txHash } = await bc.approveTrusteeOnChain(record.walletAddress);

    // 2. Update backend status
    const updated = trustees.setStatus(email, "approved");

    res.json({
      message: `Trustee ${email} approved on-chain.`,
      txHash,
      trustee: updated,
    });
  } catch (err) {
    const message = err.reason || err.message;
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/admin/trustees/reject ───────────────────────────────────────────
// Body: { email }
// Rejects in backend only (no on-chain action needed).
router.post("/trustees/reject", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const record = trustees.findByEmail(email);
    if (!record) {
      return res.status(404).json({ error: "Trustee not found." });
    }

    const updated = trustees.setStatus(email, "rejected");

    res.json({
      message: `Trustee ${email} has been rejected.`,
      trustee: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
