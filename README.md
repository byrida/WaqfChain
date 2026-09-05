# WaqfChain

WaqfChain is a blockchain-based platform for tokenizing Islamic Waqf (endowment) assets. It lets donors contribute to transparent, perpetual charity projects, lets trustees manage and disburse funds responsibly, and lets beneficiaries and the public verify how every rupee is spent. An AI-powered impact report generator turns on-chain activity into plain-language summaries and Shariah-compliance checks.

Built for hackathon demos and regional pitches, WaqfChain shows how traditional Islamic endowment principles can be enforced by smart contracts while staying easy for everyday donors to use.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | [Next.js](https://nextjs.org/) 14 + React + Tailwind CSS |
| Backend | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + [Ethers.js](https://docs.ethers.org/) v6 |
| Smart Contracts | [Solidity](https://soliditylang.org/) + [Hardhat](https://hardhat.org/) |
| AI Reports | [Google Gemini API](https://ai.google.dev/) (`gemini-3.6-flash`) |
| Blockchain target | Local Hardhat node (demo) / Polygon Amoy testnet (production-ready) |

---

## Key Features

- **Donor Portal** — Browse available Waqf projects, donate with MetaMask (ETH) or a simulated JazzCash/Easypaisa flow (PKR), and view your complete giving history. All amounts displayed in PKR using a fixed conversion rate (1 ETH = ₨350,000).
- **Trustee Portal** — Three entry options: register with email/password (server generates a custodial wallet automatically), register with your own MetaMask wallet, or connect an existing wallet. All trustees require admin approval before managing assets.
- **Admin Panel** — Contract owner can review pending trustee applications and approve/reject them. Approval calls `approveTrustee()` on-chain.
- **Beneficiary Portal** — Public transparency view showing funds collected, funds spent, disbursement history with recipient names, and an AI-generated impact/compliance report for every project.
- **Shariah-Compliant Smart Contract** — `WaqfRegistry.sol` enforces irrevocability, perpetuity, approved-trustee registry, and trusteeship directly on-chain.
- **AI Impact Reports** — Gemini summarizes project activity and flags potential compliance issues in plain language (all amounts in PKR).
- **Dual Payment Flow** — Crypto-native donors use MetaMask; mobile-money donors see a JazzCash/Easypaisa-style checkout (simulated for demo).
- **Custodial Wallet System** — Trustees registering via email get a server-generated wallet with encrypted private key storage. Disbursement recipients get unique wallets linked to their phone number, preserving on-chain proof without requiring recipients to own MetaMask.

---

## Shariah Compliance

The WaqfRegistry contract enforces four core Islamic Waqf principles:

| Principle | On-chain enforcement |
| --- | --- |
| **Irrevocability** | Once an asset is created, it cannot be deleted or reversed by the creator. |
| **Perpetuity** | The asset and its funding goal remain on-chain indefinitely; donations are recorded permanently. |
| **Trusteeship** | Only the wallet address set as `trustee` during asset creation can disburse funds. |
| **Ongoing Charity** | Funds are released only through recorded disbursements, ensuring continuous benefit to beneficiaries. |

Read more inside the app on the **Shariah** page (`/shariah`).

---

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) **18.x or later** (LTS recommended)
- [Git](https://git-scm.com/)
- A MetaMask browser extension (for crypto donation / trustee demo flows)

### 1. Clone the repository

```bash
git clone https://github.com/byrida/WaqfChain.git
cd WaqfChain
```

### 2. Install dependencies

Run `npm install` in all three tiers:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../smart-contracts && npm install
cd ..
```

### 3. Configure environment variables

Copy each `.env.example` file to `.env` and fill in the required values.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp smart-contracts/.env.example smart-contracts/.env
```

#### `backend/.env`

```text
PORT=5000
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=          # fill after running deploy.js
GEMINI_API_KEY=            # optional — needed for AI reports
JWT_SECRET=                # random 32+ char string for trustee session tokens
TRUSTEE_ENCRYPTION_SECRET= # random 32+ char string for encrypting custodial private keys
OWNER_ADDRESS=             # contract deployer address (admin panel access)
```

> For the local demo, use the Hardhat Account #0 private key shown above. For production, use a dedicated server wallet key. Generate `JWT_SECRET` and `TRUSTEE_ENCRYPTION_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

#### `frontend/.env`

```text
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

#### `smart-contracts/.env`

```text
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
POLYGONSCAN_API_KEY=       # optional — only for contract verification
```

### 4. Start the local blockchain

```bash
cd smart-contracts
npx hardhat node
```

This starts a local Ethereum node at `http://127.0.0.1:8545` with 20 pre-funded test accounts.

### 5. Deploy the contract and seed demo data

In a new terminal:

```bash
cd smart-contracts
npx hardhat run scripts/deploy.js --network localhost
```

Save the printed contract address and paste it into `backend/.env` as `CONTRACT_ADDRESS`.

The deploy script automatically creates 4 demo Waqf assets across education, mosque construction, orphan care, and healthcare, complete with sample donations and disbursements.

### 6. Start the backend

In a new terminal:

```bash
cd backend
node src/index.js
```

The backend runs at `http://localhost:5000`. It will detect the deployed assets and skip auto-seeding.

### 7. Start the frontend

In a new terminal:

```bash
cd frontend
npx next dev --port 3000
```

### 8. Open the app

Go to **http://localhost:3000** in your browser.

Use the top navigation to switch between portals:

- **Home** — Project overview and platform statistics (all amounts in PKR)
- **Donor** — Browse projects and donate
- **Trustee** — Register, login, or connect wallet to manage assets
- **Beneficiary** — Public spending transparency + AI reports
- **Shariah** — Explanation of compliance principles
- **Admin** — Trustee application management (contract owner only)

---

## Demo Mode Note

WaqfChain currently runs on a **local Hardhat blockchain** for demo purposes. This avoids relying on external Polygon Amoy faucets, which can be rate-limited or empty during hackathon judging. For a production or regional-round deployment, update the RPC URLs and chain IDs to point to **Polygon Amoy testnet** (or mainnet) and use dedicated wallets instead of the Hardhat test accounts.

---

## Known Limitations & Future Scope

- **JazzCash / Easypaisa is simulated.** The mobile-money checkout is a UI demo that records a PKR amount off-chain and performs the actual on-chain donation via the platform wallet. Real integration would connect to JazzCash/Easypaisa APIs.
- **Custodial key storage is simplified.** The demo encrypts trustee private keys with AES-256-GCM in memory. Production should use AWS KMS, GCP KMS, or a Hardware Security Module.
- **Off-chain data is in-memory.** Mobile-money donation records and recipient wallets reset when the backend restarts. A future version would use a database.
- **Urdu language support** is planned to make the donor and beneficiary portals more accessible across Pakistan.

---

## License

This project was built for hackathon demonstration. Check the repository license before using it in production.
