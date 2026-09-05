const { ethers } = require("ethers");

/**
 * Seed service — auto-populates 4 waqf assets with realistic data
 * when the backend starts and finds 0 assets on-chain.
 *
 * Uses Hardhat local node pre-funded accounts (publicly documented).
 *
 * Role separation (matches deploy.js):
 *   Account #0  (0xf39f...2266) = Contract owner / admin ONLY — not a trustee
 *   Accounts #1-4               = Donors (fund contributors)
 *   Accounts #5-8               = Trustees (one per demo asset)
 *   Account #9                  = Extra approved trustee for live demo
 */

// Donor private keys (Accounts #1-4)
const DONOR_KEYS = [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account #1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account #3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account #4
];

// Trustee private keys (Accounts #5-8) — each demo asset gets its own trustee
const TRUSTEE_KEYS = [
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // Account #5 — 0x9965507D...
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // Account #6 — 0x976EA740...
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // Account #7 — 0x14dC7996...
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", // Account #8 — 0x23618e81...
];

// Extra approved trustee for live demo asset creation (Account #9)
const DEMO_TRUSTEE_KEY =
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"; // Account #9 — 0xa0Ee7A14...

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

async function seedData(contract, provider) {
  const adminSigner = contract.signer;

  console.log("[Seed] Found 0 assets on-chain — seeding demo data...\n");

  // Create donor wallets
  const donors = DONOR_KEYS.map((key) => new ethers.Wallet(key, provider));

  // Create trustee wallets
  const trustees = TRUSTEE_KEYS.map((key) => new ethers.Wallet(key, provider));
  const demoTrustee = new ethers.Wallet(DEMO_TRUSTEE_KEY, provider);

  console.log(`[Seed] Loaded ${donors.length} donors, ${trustees.length} trustees\n`);

  // Pre-approve all trustee wallets + demo trustee (NOT the admin)
  const trusteesToApprove = [
    ...trustees.map((t) => t.address),
    demoTrustee.address,
  ];

  console.log("[Seed] Approving demo trustees...\n");
  for (const addr of trusteesToApprove) {
    const tx = await contract.approveTrustee(addr);
    await tx.wait();
    console.log(`  Approved trustee: ${addr.slice(0, 10)}...`);
  }
  console.log();

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    const trusteeIdx = asset.trusteeIndex;
    const trusteeWallet = trustees[trusteeIdx];
    const trusteeAddr = trusteeWallet.address;

    console.log(`[Seed] [${i}] Creating: ${asset.name}`);
    console.log(`    Trustee: ${trusteeAddr.slice(0, 10)}... (Account #${trusteeIdx + 5})`);

    // Create asset
    const tx = await contract.createAsset(
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
        const donorWallet = donors[d.donor];
        const contractForDonor = contract.connect(donorWallet);
        const donateTx = await contractForDonor.donate(i, {
          value: ethers.parseEther(d.amount),
        });
        await donateTx.wait();
        console.log(`      ${d.amount} ETH from ${donorWallet.address.slice(0, 10)}...`);
      }
    }

    // Seed disbursements (signed by the asset's trustee)
    if (asset.disbursements.length > 0) {
      console.log(`    Disbursements:`);
      const contractForDisburse = contract.connect(trusteeWallet);
      for (const d of asset.disbursements) {
        const recipient = donors[3].address;
        const disburseTx = await contractForDisburse.disburseFunds(
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

  console.log(`[Seed] ── Done: ${ASSETS.length} assets seeded ──────────────────\n`);
}

module.exports = { seedData };
