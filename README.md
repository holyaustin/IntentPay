# 💸 IntentPay — Cross-Chain Payroll & Yield Engine

![IntentPay Logo](frontend/public/logoyellow.png)

**IntentPay** is a **no-code, cross-chain payroll automation dApp** that empowers DAOs, startups, and Web3 teams to **pay contributors seamlessly across multiple blockchains** — while **automatically routing idle funds into the highest-yield DeFi vaults**.

<p align="center">
  <img src="https://github.com/holyaustin/IntentPay/blob/main/frontend/public/logoyellow.png?raw=true" alt="IntentPay Logo" width="280"/>
</p>

🌐 Live App: [https://intentpay.vercel.app](https://intentpay.vercel.app)  
📦 Repository: [https://github.com/holyaustin/IntentPay](https://github.com/holyaustin/IntentPay)

---

## ✨ Core Features

- 🔗 **Cross-Chain Payroll** — Schedule and execute payments across EVM chains and Hedera Testnet.
- 💰 **Yield Optimization** — Automatically deposit leftover funds into DeFi yield vaults.
- ⚡ **Intent Execution** — Streamlined batch payments in a single transaction.
- 🧾 **No-Code Dashboard** — Simple UI for DAOs, treasuries, and Web3 teams.
- 🔒 **Secure Wallet Connection** — Works with MetaMask and Hedera wallets.
- 📊 **Live HBAR/USD Price Feed** — Integrated with [Pyth Network](https://pyth.network) for real-time price data.

---

## 🧠 Architecture Overview

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI/UX:** Tailwind CSS + Framer Motion
- **Notifications:** [sonner](https://sonner.emilkowal.ski/)
- **Price Feeds:** [Pyth Hermes SDK](https://docs.pyth.network/)

### Smart Contracts
- **Language:** Solidity 0.8.28
- **Framework:** Hardhat v3 Beta + TypeScript
- **Deployment:** Hardhat Ignition Modules
- **Testing:**  
  - Solidity (Forge Std)  
  - TypeScript via Viem + `node:test`

### Networks
| Network | Chain ID | Status |
|----------|-----------|--------|
| Hedera Testnet | 296 | ✅ Active |
| Arcology DevNet | 345 | 🧪 Experimental |

---

## ⚙️ Installation & Setup

###  1️⃣ Clone the Repository

```bash
git clone https://github.com/holyaustin/IntentPay.git
cd IntentPay

### 2️⃣ Install Dependencies
```bash
npm install

### 3️⃣ Start the Development Server
```bash
npm run dev


Your dApp will be running at:
👉 http://localhost:3000

## 💼 Smart Contracts

| Contract                  | Network        | Address                                      |
| ------------------------- | -------------- | -------------------------------------------- |
| `PayrollManager`          | Hedera Testnet | `0x7b954082151F7a44B2E42Ef9225393ea4f16c482` |
| `PayrollManagerERC20Only` | EVVM Sepolia   | `0xa2aea35523A71Eff81283E32F52151F12D5Cbb7F` |



# Deployment Examples
```bash
npx hardhat deploy script/deploy.ts --network hederaTestnet



## Verify Contracts
```bash
npx hardhat verify --network hederaTestnet 0x7b954082151f7a44b2e42ef9225393ea4f16c482

##  🧪 Testing
Run Solidity Tests
```bash
npx hardhat test solidity

Run TypeScript Tests
```bash
npx hardhat test nodejs

##🚀 Roadmap

 - Payroll scheduling with native + ERC20 tokens

 - Pyth price feed integration

 - Yield vault deposits

 - Multi-DAO role support

 - Account abstraction for gasless execution

- DAO treasury analytics dashboard

## 🤝 Contributors

HolyAustin — Founder & Lead Engineer
- GitHub @holyaustin

-Twitter/X @holyaustin

## 🪙 License

This project is licensed under the MIT License.
See the LICENSE
 file for details.

## 🌍 Live Demo

- App: https://intentpay.vercel.app

- Docs: https://docs.intentpay.io
 (coming soon)