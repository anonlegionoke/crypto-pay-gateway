# Crypto Gate

Crypto Gate is a Solana merchant checkout gateway.

It gives merchants a private dashboard to create payment intents and share public checkout links. Customers open the checkout, connect a wallet, and complete the payment flow on-chain.

## What This Project Is Today

- A polished devnet simulation demo for merchant crypto checkout
- A shared payment gateway architecture for both simulation and live settlement modes
- A Jupiter-backed live settlement path designed to be enabled by environment configuration

## What It Does

1. Merchant signs up and logs in
2. Merchant creates a payment intent
3. Merchant shares a public checkout link
4. Customer opens the public checkout and connects a wallet
5. Customer pays from wallet
6. Backend confirms the payment and records settlement/payout data

## Settlement Modes

### Simulation Settlement

This is the primary demo mode and the recommended way to run the project locally.

- Runs on `devnet`
- Uses a real on-chain SOL transfer for the customer payment step
- Records a USDC-equivalent settlement value in the backend
- Does **not** credit real USDC to the merchant wallet on-chain

### Live Settlement

This is the architecture path for live settlement.

- Intended for `mainnet-beta`
- Uses Jupiter to route a supported Solana token into merchant USDC settlement
- Requires Jupiter API access and live mainnet assets
- The code path is configuration-driven, but should still be validated with a production smoke test before being treated as live-ready

## Core Features

- Merchant auth with protected dashboard
- Payment intent creation and public checkout links
- Wallet-based payer checkout flow
- Shared gateway flow for simulation and live settlement modes
- On-chain confirmation and payout record creation
- Dashboard metrics for wallet USDC, gateway USDC, confirmed payments, and pending intents
- Rate limiting, validation, and safer API contracts

## Tech Stack

- Next.js App Router
- React 19
- Tailwind CSS
- Prisma + PostgreSQL
- Solana Web3.js
- Jupiter Swap APIs
- JWT auth
- Upstash-compatible rate limiting middleware

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- A Solana wallet such as Phantom

### Install

```bash
npm install
```

### Environment

For the recommended local simulation setup:

```env
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_USE_REAL_JUPITER_SWAPS="false"
```

Optional Jupiter configuration:

```env
NEXT_PUBLIC_JUPITER_API_URL="https://api.jup.ag"
NEXT_PUBLIC_JUPITER_API_KEY=""
```

### Database

```bash
npx prisma migrate dev
npx prisma generate
```

### Run

```bash
npm run dev
```

## Recommended Demo Flow

1. Log in as merchant
2. Open `Receive Payment`
3. Create a payment intent in `Simulation` mode
4. Copy the public checkout link
5. Open that link in a separate wallet context
6. Complete the payment from the payer wallet
7. Review the dashboard for confirmed payment and recorded USDC-equivalent settlement

## Live Settlement Notes

The codebase now uses a shared architecture so simulation and live settlement follow the same checkout lifecycle. The main difference is the execution engine underneath.

- `Simulation`: internal SOL-transfer executor + backend USDC-equivalent settlement
- `Live`: Jupiter-backed live settlement executor

That means the product surface is intentionally similar across both modes, while the settlement semantics remain honest.

## Remaining Production Work

- deeper live settlement validation on mainnet
- stronger reconciliation and merchant webhook flows
- more complete operational monitoring
- final production hardening around payout/accounting guarantees
