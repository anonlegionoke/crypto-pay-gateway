# Crypto Gate

Crypto Gate is a Solana merchant checkout gateway built with Next.js, Prisma, Solana `web3.js`, and Jupiter.

The app gives merchants a private dashboard to create payment intents and share public checkout links. Customers open the checkout, connect a wallet, and complete the payment flow on-chain.

<img width="1613" height="1063" alt="image" src="https://github.com/user-attachments/assets/1aef5fc8-4043-4d2b-880c-692727360aeb" />

## Current Scope

- Polished devnet simulation demo for merchant checkout
- Shared checkout architecture for both simulation and live settlement modes
- Jupiter-backed live settlement path behind environment configuration
- Merchant auth, payment intents, public checkout, confirmation, and payout records

## What This App Is

This project is a **single full-stack Next.js app**.

- Frontend and backend are in the same codebase
- UI pages live under `src/app`
- API routes also live under `src/app/api`
- PostgreSQL stores merchants, payments, and payouts
- Upstash is optional and only used for distributed rate limiting in production

You do **not** need to run a separate frontend service and backend service.

## Main Flow

1. Merchant signs up and logs in
2. Merchant creates a payment intent
3. Merchant shares a public checkout link
4. Customer opens the checkout and connects a wallet
5. Customer pays from wallet
6. Backend confirms the payment and records settlement/payout data

## Settlement Modes

### Simulation Settlement

This is the recommended local demo mode.

- Runs on `devnet`
- Uses a real on-chain SOL transfer for the payer step
- Records a USDC-equivalent settlement value in the backend
- Does **not** credit real USDC to the merchant wallet on-chain

### Live Settlement

This is the architecture path for live settlement.

- Intended for `mainnet-beta`
- Uses Jupiter for token-to-USDC settlement
- Requires a Jupiter API key and mainnet assets
- Exists in the codebase, but should still be validated with a real production smoke test before being treated as live-ready

## Tech Stack

- Next.js 15 App Router
- React 19
- Tailwind CSS 4
- Prisma + PostgreSQL
- Solana Web3.js
- Solana wallet adapter + Phantom
- Jupiter APIs
- JWT auth
- Optional Upstash rate limiting

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop or Docker Engine
- A Solana wallet such as Phantom

## Environment Variables

Start from `.env.example`:

```bash
cp .env.example .env
```

### Required for Local Simulation

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_gateway"
JWT_SECRET="replace-this-with-a-long-random-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_USE_REAL_JUPITER_SWAPS="false"
NEXT_PUBLIC_CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```

### Optional

```env
NEXT_PUBLIC_JUPITER_API_URL="https://api.jup.ag"
NEXT_PUBLIC_JUPITER_API_KEY=""
NEXT_PUBLIC_WALLET_RPC_URL=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Notes:

- `NEXT_PUBLIC_JUPITER_API_KEY` is only needed if you want to enable the live settlement path
- Upstash is optional; if its env vars are missing, the app falls back without distributed rate limiting
- `NEXT_PUBLIC_WALLET_RPC_URL` is optional and only needed if you want wallet connections to use a custom RPC instead of the default cluster endpoint

## Local Setup

### 1. Start PostgreSQL with Docker

```bash
docker compose up -d postgres
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run database migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start the app

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Recommended Demo Setup

Use these conditions for the cleanest proof-of-work demo:

- Merchant logs in on one wallet context
- Merchant creates a payment intent in `Simulation` mode
- Merchant copies the public checkout link
- Customer opens that link in a separate wallet context
- Customer pays on devnet
- Merchant reviews the dashboard for confirmed payment and recorded USDC-equivalent settlement

## Docker Notes

### What Docker Compose Does Here

The included `docker-compose.yml` is intentionally focused on **PostgreSQL for local development**.

That is the only service the app truly requires locally.

### What About Redis?

This project does **not** require a local Redis container to run.

The security middleware is written for Upstash-compatible distributed rate limiting. If Upstash env vars are not provided, the app still works locally without it.

### What About the App Container?

The `Dockerfile` is kept for production-style container builds, but for local development the simplest path is:

1. run PostgreSQL with Docker Compose
2. run the Next.js app locally with `npm run dev`

## Production Container Build

If you want to build the standalone production image:

```bash
docker build -t crypto-gate .
```

Before running a production container, make sure:

1. the target database already exists
2. Prisma migrations have been applied
3. all required environment variables are present

## Vercel Deployment

### What You Need

For Vercel, you need:

1. this Next.js app
2. a managed PostgreSQL database
3. optional Upstash credentials
4. optional Jupiter live-settlement credentials

### Recommended Production Services

- Database: Neon, Supabase Postgres, Railway Postgres, or any external PostgreSQL
- Rate limiting: Upstash Redis

### Vercel Environment Variables

At minimum:

```env
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_CORS_ORIGIN=
NEXT_PUBLIC_SOLANA_NETWORK=
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_USE_REAL_JUPITER_SWAPS=
NEXT_PUBLIC_JUPITER_API_URL=
NEXT_PUBLIC_JUPITER_API_KEY=
```

Recommended values:

- For simulation-style deployments:
  - `NEXT_PUBLIC_SOLANA_NETWORK=devnet`
  - `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com`
  - `NEXT_PUBLIC_USE_REAL_JUPITER_SWAPS=false`
- For live settlement deployments:
  - `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
  - `NEXT_PUBLIC_SOLANA_RPC_URL=<your mainnet RPC>`
  - `NEXT_PUBLIC_USE_REAL_JUPITER_SWAPS=true`
  - `NEXT_PUBLIC_JUPITER_API_KEY=<your Jupiter API key>`

### Prisma on Vercel

This project already runs `prisma generate` during install/build.

You still need to apply migrations to your production database:

```bash
npx prisma migrate deploy
```

Run that against the production `DATABASE_URL` before or during rollout.

### Vercel Build Status

The app now builds successfully with:

```bash
npm run build
```

## Useful Commands

```bash
npm run dev
npm run build
npm test
npx prisma migrate dev
npx prisma migrate deploy
```

## Remaining Production Work

- deeper mainnet live-settlement validation
- stronger reconciliation and merchant webhook flows
- operational monitoring and alerting
- production payout/accounting hardening
