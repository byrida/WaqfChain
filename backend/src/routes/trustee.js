/**
 * Trustee authentication routes:
 *   POST /api/trustee/signup           — register with email + password (+ optional wallet address)
 *   POST /api/trustee/signup/wallet    — register with own wallet address (no generated key)
 *   POST /api/trustee/login            — verify credentials, get a JWT session token
 *   GET  /api/trustee/me               — protected: returns current trustee info from token
 *   GET  /api/trustee/status/:address  — check application status by wallet address
 *
 * ⚠️  HACKATHON DEMO ONLY — see services/trustees.js for security disclaimers.
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const trustees = require("../services/trustees");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── POST /api/trustee/signup ──────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { email, password, orgName, description, phone, walletAddress } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long." });
    }
    if (!orgName || !orgName.trim()) {
      return res.status(400).json({ error: "Organization name is required." });
    }

    let trustee;
    if (walletAddress) {
      // Registration with user's own wallet address
      if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({ error: "Invalid wallet address." });
      }
      trustee = await trustees.registerWithWallet({
        email,
        password,
        walletAddress,
        orgName: orgName.trim(),
        description: (description || "").trim(),
        phone: (phone || "").trim(),
      });
    } else {
      trustee = await trustees.createTrustee({
        email,
        password,
        orgName: orgName.trim(),
        description: (description || "").trim(),
        phone: (phone || "").trim(),
      });
    }

    res.status(201).json({
      message: "Trustee account created. Your application is pending admin approval.",
      trustee,
    });
  } catch (err) {
    const status = err.message.includes("already exists") ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── POST /api/trustee/login ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const record = await trustees.verifyTrustee(email, password);
    if (!record) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Issue a JWT — valid for 24 hours
    const token = jwt.sign(
      {
        email: record.email,
        walletAddress: record.walletAddress,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful.",
      token,
      trustee: {
        email: record.email,
        walletAddress: record.walletAddress,
        orgName: record.orgName,
        status: record.status,
        createdAt: record.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/trustee/me ───────────────────────────────────────────────────────
// Protected route — requires a valid JWT in the Authorization header.
router.get("/me", requireAuth, (req, res) => {
  const record = trustees.findByEmail(req.trustee.email);
  if (!record) {
    return res.status(404).json({ error: "Trustee not found." });
  }
  res.json(trustees.sanitize(record));
});

// ─── GET /api/trustee/status/:address ──────────────────────────────────────────
// Returns the application status for a wallet address (public — no auth needed).
router.get("/status/:address", (req, res) => {
  const record = trustees.findByAddress(req.params.address);
  if (!record) {
    return res.json({ address: req.params.address, status: "unknown" });
  }
  res.json({
    address: record.walletAddress,
    status: record.status,
    orgName: record.orgName,
    email: record.email,
    registrationType: record.registrationType,
  });
});

module.exports = router;
