const { ethers } = require("ethers");

/**
 * Seed service — auto-populates 4 waqf assets with realistic data
 * when the backend starts and finds 0 assets on-chain.
 *
 * Uses Hardhat local node pre-funded accounts (publicly documented).
 */

// Hardhat local node pre-funded accounts (publicly documented in Hardhat docs)
const DONOR_KEYS = [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account #1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account #3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account #4
];

const ASSETS = [
  {
    name: "Al-Noor School Endowment",
    description:
      "A sustainable education fund for underprivileged children in rural Punjab, covering school fees, uniforms, and learning materials for 200+ students.",
    beneficiaryCategory: "education",
    fundingGoalETH: "20",
    trusteeIndex: null, // default trustee
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
    trusteeIndex: null, // default trustee
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
    trusteeIndex: 0, // Account #1 — different trustee to demo access control
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
    trusteeIndex: null, // default trustee
    donations: [
      { donor: 0, amount: "4" },
      { donor: 1, amount: "3" },
    ],
    disbursements: [],
  },
];

async function seedData(contract, provider) {
  const trusteeSigner = contract.signer;
  const trusteeAddress = await trusteeSigner.getAddress();
  const donors = DONOR_KEYS.map((key) => new ethers.Wallet(key, provider));

  console.log("[Seed] Found 0 assets on-chain — seeding demo data...\n");
  console.log(`[Seed] Loaded ${donors.length} donor wallets\n`);

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    console.log(`[Seed] [${i}] Creating: ${asset.name}`);

    // Resolve trustee address
    const trusteeAddr =
      asset.trusteeIndex !== null && asset.trusteeIndex !== undefined
        ? donors[asset.trusteeIndex].address
        : trusteeAddress;
    const isAltTrustee = trusteeAddr !== trusteeAddress;

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

    // Seed disbursements (from trustee — may need alternate signer)
    if (asset.disbursements.length > 0) {
      console.log(`    Disbursements:`);
      const contractForDisburse = isAltTrustee
        ? contract.connect(donors[asset.trusteeIndex])
        : contract;
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
