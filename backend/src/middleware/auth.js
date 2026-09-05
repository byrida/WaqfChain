/**
 * JWT authentication middleware for protected trustee routes.
 *
 * Reads the Authorization header ("Bearer <token>"), verifies the JWT,
 * and attaches the decoded payload to `req.trustee`.
 *
 * ⚠️  HACKATHON DEMO ONLY
 * ─────────────────────────
 * Production auth should include:
 *   - Short-lived access tokens + refresh token rotation
 *   - Token revocation (blacklist or DB flag)
 *   - Rate limiting on login attempts
 *   - CSRF protection for browser clients
 *   - HTTPS-only cookie delivery (not Authorization header over the wire)
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is required. Set it in backend/.env — use a random 32+ character string."
  );
}

/**
 * Express middleware — verifies JWT and attaches trustee payload to request.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }

  const token = header.slice(7); // strip "Bearer "
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach decoded trustee info so downstream handlers know who's calling
    req.trustee = {
      email: payload.email,
      walletAddress: payload.walletAddress,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
}

module.exports = { requireAuth, JWT_SECRET };
