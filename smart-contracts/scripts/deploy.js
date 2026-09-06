// WaqfChain — deploy WaqfRegistry to local Hardhat node or Polygon Amoy
// Seeds 4 waqf assets with realistic data, donations, and disbursements
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Hardhat local node pre-funded accounts (publicly documented in Hardhat docs)
//
// Role separation (by getSigners() index):
//   Account #0  (0xf39f...2266) = Contract owner / admin ONLY — not a trustee
//   Accounts #1-4               = Donors (fund contributors)
//   Accounts #5-8               = Trustees (one per demo asset)
//   Account #9                  = Extra approved trustee for live demo
//

// Donor private keys (Accounts #1-4)
const DONOR_KEYS = [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account #1 — 0x70997970...
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2 — 0x3C44CdDd...
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account #3 — 0x90F79bf6...
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account #4 — 0x15d34AAf...
];

// Trustee private keys (Accounts #5-8) — each demo asset gets its own trustee
const TRUSTEE_KEYS = [
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // Account #5 — 0x9965507D... — Al-Noor School
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // Account #6 — 0x976EA740... — Masjid Al-Rahma
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // Account #7 — 0x14dC7996... — Al-Ameen Orphan
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", // Account #8 — 0x23618e81... — Al-Shifa Medical
];

// Extra approved trustee for live demo asset creation (Account #9)
const DEMO_TRUSTEE_KEY =
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"; // Account #9 — 0xa0Ee7A14... — demo trustee

const ASSETS = [
  {
    name: "Al-Noor School Endowment",
    description:
      "A sustainable education fund for underprivileged children in rural Punjab, covering school fees, uniforms, and learning materials for 200+ students.",
    beneficiaryCategory: "education",
    fundingGoalETH: "20",
    trusteeIndex: 0, // Trustee #0 (Account #5)
    donations: [
      { donor: 0, amount: "3" },
      { donor: 1, amount: "5" },
      { donor: 2, amount: "2" },
    ],
    disbursements: [
      { amount: "2", purpose: "textbooks and school supplies for grade 5-8" },
      { amount: "1.5", purpose: "teacher salaries for Q1 2026" },
    ],
  },
  {
    name: "Masjid Al-Rahma Construction Fund",
    description:
      "Building a community mosque with an attached community center in Islamabad, serving 500+ families with prayer halls, classrooms, and a library.",
    beneficiaryCategory: "mosque construction",
    fundingGoalETH: "50",
    trusteeIndex: 1, // Trustee #1 (Account #6)
    donations: [
      { donor: 0, amount: "10" },
      { donor: 1, amount: "7" },
    ],
    disbursements: [
      { amount: "5", purpose: "foundation materials and cement" },
      { amount: "3", purpose: "carpentry and interior woodwork" },
    ],
  },
  {
    name: "Al-Ameen Orphan Support Program",
    description:
      "Monthly sustenance, clothing, and mentorship for 120 orphaned children across Lahore and Karachi, providing stability and educational support.",
    beneficiaryCategory: "orphan care",
    fundingGoalETH: "15",
    trusteeIndex: 2, // Trustee #2 (Account #7)
    donations: [
      { donor: 0, amount: "2" },
      { donor: 1, amount: "1.5" },
      { donor: 2, amount: "3" },
      { donor: 3, amount: "0.5" },
    ],
    disbursements: [
      { amount: "2", purpose: "monthly food supplies for 120 children" },
    ],
  },
  {
    name: "Al-Shifa Medical Relief Fund",
    description:
      "Free medical check-ups, medicine, and emergency care for low-income families in rural Sindh, operating a mobile clinic reaching 30+ villages.",
    beneficiaryCategory: "healthcare",
    fundingGoalETH: "25",
    trusteeIndex: 3, // Trustee #3 (Account #8)
    donations: [
      { donor: 0, amount: "4" },
      { donor: 1, amount: "3" },
    ],
    disbursements: [],
  },
];

async function syncBackendApprovedTrustees(contract) {
  try {
    // Load backend env so the trustees service can initialize its database/crypto.
    require("dotenv").config({ path: path.join(__dirname, "../../backend/.env") });
    const trustees = require("../../backend/src/services/trustees");
    await trustees.syncApprovedTrusteesWithContract(contract);
  } catch (err) {
    console.warn("[Deploy] Could not sync backend-approved trustees:", err.message);
  }
}

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deploying WaqfRegistry to:", hre.network.name);
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Use getSigners() for all wallets — this guarantees correct key/address pairs
  // on the local Hardhat node. For remote networks, the hardcoded keys above are used.
  const isLocal = hre.network.name === "localhost" || hre.network.name === "hardhat";

  // Donors: Accounts #1-4
  const donors = isLocal
    ? signers.slice(1, 5)
    : DONOR_KEYS.map((key) => new ethers.Wallet(key, ethers.provider));

  // Trustees: Accounts #5-8 (one per asset)
  const trustees = isLocal
    ? signers.slice(5, 9)
    : TRUSTEE_KEYS.map((key) => new ethers.Wallet(key, ethers.provider));

  // Demo trustee: Account #9
  const demoTrustee = isLocal
    ? signers[9]
    : new ethers.Wallet(DEMO_TRUSTEE_KEY, ethers.provider);

  console.log("Roles:");
  console.log(`  Admin:    ${deployer.address} (Account #0)`);
  donors.forEach((d, i) =>
    console.log(`  Donor:    ${d.address} (Account #${i + 1})`)
  );
  trustees.forEach((t, i) =>
    console.log(`  Trustee:  ${t.address} (Account #${i + 5})`)
  );
  console.log(`  Demo:     ${demoTrustee.address} (Account #9)`);
  console.log();

  // Deploy contract with deployer as initial owner
  const WaqfRegistry = await ethers.getContractFactory("WaqfRegistry");
  const registry = await WaqfRegistry.deploy(deployer.address);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("WaqfRegistry deployed to:", address);
  console.log("\nSave this address — you'll need it for the frontend and backend.\n");

  // Persist deployed address for frontend/backend discovery and resync detection.
  const deployedAddressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(
    deployedAddressesPath,
    JSON.stringify({ WaqfRegistry: address }, null, 2)
  );
  console.log(`Deployed addresses written to ${deployedAddressesPath}\n`);

  // Re-approve any trustees that were already approved in the backend DB on the
  // freshly deployed contract, so local redeploys don't require manual admin work.
  await syncBackendApprovedTrustees(registry);

  // Pre-approve all trustee wallets (NOT the admin/deployer)
  const trusteesToApprove = [
    ...trustees.map((t) => t.address),
    demoTrustee.address,
  ];

  console.log("─── Approving demo trustees ─────────────────────────────────\n");
  for (const trusteeAddr of trusteesToApprove) {
    try {
      const tx = await registry.approveTrustee(trusteeAddr);
      await tx.wait();
      console.log(`  Approved trustee: ${trusteeAddr.slice(0, 10)}...`);
    } catch (err) {
      const reason = err.reason || err.message || "";
      if (reason.includes("already approved") || reason.includes("trustee already approved")) {
        console.log(`  Trustee already approved: ${trusteeAddr.slice(0, 10)}...`);
      } else {
        console.warn(`  Could not approve trustee ${trusteeAddr.slice(0, 10)}...:`, reason);
      }
    }
  }
  console.log();

  // Seed all assets
  console.log("─── Seeding waqf assets ─────────────────────────────────────\n");

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    const trusteeIdx = asset.trusteeIndex;
    const trusteeSigner = trustees[trusteeIdx];
    const trusteeAddr = trusteeSigner.address;

    console.log(`[${i}] Creating: ${asset.name}`);
    console.log(`    Trustee: ${trusteeAddr.slice(0, 10)}... (Account #${trusteeIdx + 5})`);

    // Create asset
    const tx = await registry.createAsset(
      asset.name,
      asset.description,
      asset.beneficiaryCategory,
      trusteeAddr,
      ethers.parseEther(asset.fundingGoalETH)
    );
    await tx.wait();
    console.log(`    Asset created with ID: ${i}`);

    // Seed donations from different donors
    if (asset.donations.length > 0) {
      console.log(`    Donations:`);
      for (const d of asset.donations) {
        const donorSigner = donors[d.donor];
        const registryForDonor = registry.connect(donorSigner);
        const donateTx = await registryForDonor.donate(i, {
          value: ethers.parseEther(d.amount),
        });
        await donateTx.wait();
        console.log(`      ${d.amount} ETH from ${donorSigner.address.slice(0, 10)}...`);
      }
    }

    // Seed disbursements (must be signed by the asset's trustee)
    if (asset.disbursements.length > 0) {
      console.log(`    Disbursements:`);
      const registryForDisburse = registry.connect(trusteeSigner);
      for (const d of asset.disbursements) {
        // Disburse to a donor address as recipient (Account #4)
        const recipient = donors[3].address;
        const disburseTx = await registryForDisburse.disburseFunds(
          i,
          recipient,
          ethers.parseEther(d.amount),
          d.purpose
        );
        await disburseTx.wait();
        console.log(`      ${d.amount} ETH → "${d.purpose}"`);
      }
    }

    console.log();
  }

  console.log("── Demo ready ─────────────────────────────────────────────");
  console.log("Contract:", address);
  console.log("Network: ", hre.network.name);
  console.log("Assets:  ", ASSETS.length, "(4 waqf categories seeded)");
  console.log("Approved trustees:", trusteesToApprove.length, "(4 asset trustees + 1 demo)");
  console.log("Admin (owner):", deployer.address, "— NOT a trustee\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
