/**
 * Manual trustee resync script.
 *
 * Re-calls approveTrustee() on the currently configured contract for every
 * trustee whose backend record is marked "approved". Use this after a contract
 * redeploy if you did not run the deploy script (which performs the same step
 * automatically) or if the backend's startup resync missed a case.
 *
 * Usage:
 *   cd backend
 *   node scripts/resyncTrustees.js
 */

require("dotenv").config();

const { CONTRACT_ADDRESS, contract } = require("../src/services/blockchain");
const { syncApprovedTrusteesWithContract } = require("../src/services/trustees");

async function main() {
  console.log(`[Resync] Target contract: ${CONTRACT_ADDRESS}`);
  const result = await syncApprovedTrusteesWithContract(contract);
  console.log("[Resync] Result:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Resync] Failed:", err.message);
  process.exit(1);
});
