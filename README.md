# TrusTrove

TrusTrove is a decentralized trade finance protocol built on the Stellar blockchain. Small and Medium Enterprises (SMEs) can tokenize unpaid trade invoices as Stellar assets to receive immediate USDC funding from a liquidity pool at a small discount. Liquidity Providers (LPs) deposit USDC into the pool to earn yield from the invoice discount fees upon buyer repayment.

---

## Repository Structure

This is a monorepo containing the following components:

- **`apps/web/`**: Next.js 14 App Router frontend application with TailwindCSS and shadcn/ui components, integrating with the Freighter wallet.
- **`packages/sdk/`**: Typed TypeScript SDK wrapping Soroban smart contract invocations (Registry, Invoice, Pool, Escrow) and Freighter signing logic.
- **`indexer/`**: Go 1.22+ event indexer and REST API. It polls Soroban RPC for invoice/pool events, synchronizes the database schema, and exposes invoice querying/auth REST endpoints.

---

## Architecture Diagram

```mermaid
graph TD
    SME[SME Issuer] -->|Creates/Lists Invoice| Frontend[Next.js App / SDK]
    LP[Liquidity Provider] -->|Deposits USDC / Funds Invoice| Frontend
    Buyer[Buyer] -->|Confirms Delivery / Repays Invoice| Frontend
    
    Frontend -->|Invokes Contracts| Soroban[Soroban Smart Contracts]
    Soroban -->|Emits Events| Node[Stellar Soroban RPC Node]
    
    GoIndexer[Go Event Indexer] -->|Polls Events| Node
    GoIndexer -->|Writes Event Logs & State| PostgreSQL[(PostgreSQL Database)]
    
    GoAPI[Go REST API] -->|Reads Invoices & Pool Stats| PostgreSQL
    Frontend -->|Fetches Data & SEP-10 Auth| GoAPI
```

---

## Prerequisites

Before setting up the project, make sure you have the following installed:

- **Node.js** (v18+) & **pnpm** (v9+)
- **Go** (v1.22+)
- **Docker & Docker Compose** (for running PostgreSQL)
- **Freighter Wallet** (browser extension for signing Stellar/Soroban transactions)

---

## Getting Started

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env.local
```
Update the variables in `.env.local` as needed:
- `NEXT_PUBLIC_STELLAR_NETWORK`: `testnet`
- `NEXT_PUBLIC_SOROBAN_RPC_URL`: `https://soroban-testnet.stellar.org`
- `DATABASE_URL`: Connection string for your PostgreSQL database (e.g. `postgres://postgres:postgres@localhost:5432/trusttrove?sslmode=disable`)

### 2. Start PostgreSQL

Run the following command in the root directory to spin up the PostgreSQL database container:
```bash
docker-compose up -d
```

### 3. Initialize & Run the Go Indexer & API

Move into the `indexer` folder, fetch dependencies, and run the service:
```bash
cd indexer
go mod tidy
go run .
```
This starts the Go REST API on port `8080` (or the configured `API_PORT`) and launches the background event listener to poll the Stellar network. Database migrations will run automatically on startup.

### 4. Build & Run the Frontend

From the root directory, install workspace dependencies, build packages, and start the development server:
```bash
pnpm install
pnpm build
pnpm --filter web dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Smart Contract Interaction Lifecycle

1. **Invoice Creation**: SME (Issuer) inputs buyer address, face value (USDC), and due date to create an invoice.
2. **Financing Configuration**: SME configures discount rate basis points (e.g. `500` for 5%) and lists the invoice.
3. **Funding**: Liquidity Provider (LP) deposits USDC to the pool. When an invoice is listed, the pool funds the invoice (transferring discounted USDC to the SME and locking the invoice in Escrow).
4. **Shipment**: SME ships goods and marks the invoice as Shipped.
5. **Delivery Confirmation**: Buyer confirms receipt of goods, updating status to Confipped/Active.
6. **Repayment**: Buyer repays the invoice face value in USDC to the Pool. This unlocks the escrow and distributes yield/capital back to LPs.
7. **Default**: If the invoice remains unpaid after the due date, LPs can trigger default on-chain to handle recovery.