/**
 * Admin middleware — verifies the request comes from the contract owner.
 *
 * The admin panel is gated by the on-chain contract owner address (the
 * Hardhat Account #0 deployer in local dev). The frontend sends the
 * connected MetaMask address in the `X-Admin-Address` header; this
 * middleware checks it matches the configured owner.
 *
 * ⚠️  HACKATHON DEMO ONLY
 * ─────────────────────────
 * Production would use a proper RBAC system, not a single owner address
 * in an environment variable. Consider multi-sig, role-based contracts,
 * or an off-chain admin database with audit logging.
 */

const OWNER_ADDRESS = process.env.OWNER_ADDRESS;

if (!OWNER_ADDRESS) {
  throw new Error(
    "OWNER_ADDRESS is required. Set it in backend/.env — use the contract deployer address."
  );
}

function requireAdmin(req, res, next) {
  const adminAddress = req.headers["x-admin-address"];

  if (!adminAddress) {
    return res.status(401).json({ error: "Admin address header is missing." });
  }

  if (adminAddress.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
    return res.status(403).json({ error: "Only the contract owner can access the admin panel." });
  }

  req.admin = { address: adminAddress };
  next();
}

module.exports = { requireAdmin, OWNER_ADDRESS };
