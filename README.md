# WaqfChain

A platform for tokenizing Islamic endowment (Waqf) assets using blockchain technology. WaqfChain enables donors, trustees, and beneficiaries to interact with tokenized Waqf assets through dedicated portals, backed by smart contracts on the **Polygon Amoy testnet**.

---

## Project Structure

```
WaqfChain/
├── frontend/          # Next.js / React frontend (donor, trustee, beneficiary portals)
├── backend/           # Node.js REST API backend
├── smart-contracts/   # Solidity smart contracts (Hardhat, Polygon Amoy testnet)
└── README.md
```

### `frontend/`
Next.js application serving three portals:
- **Donor Portal** — create and fund Waqf asset tokens
- **Trustee Portal** — manage and oversee Waqf assets
- **Beneficiary Portal** — view and claim benefits from Waqf distributions

**Stack:** Next.js, React, Ethers.js (wallet integration)

### `backend/`
Node.js / Express REST API that:
- Exposes endpoints for Waqf asset CRUD, user management, and transaction tracking
- Indexes on-chain events emitted by smart contracts
- Acts as middleware between the frontend and the blockchain

**Stack:** Node.js, Express, Ethers.js

### `smart-contracts/`
Hardhat project containing Solidity smart contracts for:
- Waqf asset tokenization (ERC-721 / ERC-1155)
- Donor, trustee, and beneficiary role management
- Revenue distribution logic

**Stack:** Solidity, Hardhat, Polygon Amoy testnet

---

## Getting Started

Each sub-project has its own `package.json`. Install dependencies independently:

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run dev

# Smart Contracts
cd smart-contracts
npm install
npx hardhat compile
```

---

## Environment Variables

Each sub-project uses a `.env` file for local configuration. Template files (`.env.example`) are provided in each directory.

---

## Network

All smart contracts target the **Polygon Amoy testnet** (chain ID `80002`).
