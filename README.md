# TrusTrove

[![Soroban](https://img.shields.io/badge/Soroban-21.7.6-purple)](https://soroban.stellar.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

TrusTrove is a decentralized trade finance protocol built on the Stellar blockchain. Small and Medium Enterprises (SMEs) tokenize outstanding trade invoices as on-chain Stellar assets, securing immediate USDC funding from a shared liquidity pool at a small discount. Liquidity Providers (LPs) supply USDC to the pool to earn yield from the invoice discount fees upon buyer repayment.

This repository contains the Next.js frontend web app, the TypeScript SDK wrapping Soroban contracts, and the Go event indexer.

---

## Repository Structure

This is a monorepo containing the following components:

- **`apps/web/`**: Next.js 14 App Router frontend application styled as an operations terminal using TailwindCSS and Framer Motion, integrating with the Freighter wallet.
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

    subgraph Smart Contracts
        registry[Registry Contract]
        invoice[Invoice Contract]
        pool[Pool Contract]
        escrow[Escrow Contract]
        
        registry -.->|verifies profiles| invoice
        invoice -.->|requests funding| pool
        pool -.->|locks collateral| escrow
    end
```

---

## Contract Function Reference

### 1. Registry Contract (`registry_contract`)
Tracks business profile verification status for Issuers (SMEs) and Buyers.

| Function | Arguments | Returns | Description |
|---|---|---|---|
| `initialize` | `admin: Address` | `void` | Set admin key. |
| `register_issuer` | `address: Address`, `metadata: Map<String, String>` | `bool` | Register a new SME profile on-chain. |
| `register_buyer` | `address: Address`, `metadata: Map<String, String>` | `bool` | Register a buyer trade profile. |
| `is_verified` | `address: Address` | `bool` | Verify if address is a registered profile. |
| `get_profile` | `address: Address` | `Profile` | Retrieve full profile metadata. |
| `revoke` | `address: Address` | `bool` | Terminate profile verification. |

### 2. Invoice Contract (`invoice_contract`)
Controls tokenized invoice assets and handles lifecycle states.

| Function | Arguments | Returns | Description |
|---|---|---|---|
| `initialize` | `admin: Address`, `registry_contract: Address` | `void` | Set dependencies. |
| `set_pool_contract` | `pool_contract: Address` | `void` | Wire pool address for trigger funding. |
| `create` | `issuer: Address`, `buyer: Address`, `face_value: u128`, `due_date: u64` | `BytesN<32>` | Tokenize a trade invoice obligation. |
| `list_for_financing` | `invoice_id: BytesN<32>`, `discount_bps: u32` | `bool` | Set discount terms and list on marketplace. |
| `mark_funded` | `invoice_id: BytesN<32>`, `funded_amount: u128` | `bool` | Invoked by pool when financing is approved. |
| `mark_shipped` | `invoice_id: BytesN<32>` | `bool` | SME records shipment, changing status to Active. |
| `confirm_delivery` | `invoice_id: BytesN<32>`, `confirmer: Address` | `bool` | Confirms delivery receipt, changing to Confirmed. |
| `repay` | `invoice_id: BytesN<32>` | `bool` | Buyer settles full face value on due date. |
| `trigger_default` | `invoice_id: BytesN<32>` | `bool` | Marks overdue invoice as defaulted. |

### 3. Pool Contract (`pool_contract`)
Controls shared liquidity pool deposits, LP shares, and yield calculations.

| Function | Arguments | Returns | Description |
|---|---|---|---|
| `initialize` | `admin: Address`, `invoice: Address`, `escrow: Address`, `usdc: Address` | `void` | Connects dependencies. |
| `deposit` | `lp: Address`, `usdc_amount: u128` | `u128` | Supply USDC to pool in return for LP shares. |
| `withdraw` | `lp: Address`, `shares: u128` | `u128` | Burn shares to withdraw USDC and accrued yields. |
| `fund_invoice` | `invoice_id: BytesN<32>` | `bool` | Deploy pool USDC to fund a listed invoice. |
| `receive_repayment` | `invoice_id: BytesN<32>`, `amount: u128` | `bool` | Process buyer repayment and allocate yield. |
| `handle_default` | `invoice_id: BytesN<32>` | `bool` | Trigger recovery workflow for defaulted invoices. |

### 4. Escrow Contract (`escrow_contract`)
Safeguards invoice collateral and handles repayment distributions.

| Function | Arguments | Returns | Description |
|---|---|---|---|
| `initialize` | `admin: Address`, `pool_contract: Address`, `usdc: Address` | `void` | Wire pool address. |
| `lock` | `invoice_id: BytesN<32>`, `amount: u128` | `bool` | Lock financed USDC in escrow. |
| `release_to_issuer` | `invoice_id: BytesN<32>` | `bool` | Unlock USDC to SME upon shipment confirmation. |
| `release_to_pool` | `invoice_id: BytesN<32>`, `repayment_amount: u128` | `bool` | Release buyer repayment back to pool. |

---

## Frontend Route Map

All screens adapt to desktop terminal densities and mobile-first thumb zones (for logistics tracking).

| Route | Auth | Primary Action | Target Persona |
|---|---|---|---|
| `/` | Public | View Stats, Economic calculations | SME, LP, Reviewer |
| `/dashboard` | Connected Wallet | Issue Invoices, Track Obligations | SME Issuer |
| `/invoice/[invoiceId]` | Connected Wallet | Ship, Confirm, Repay, Default | Issuer, Buyer, LP |
| `/marketplace` | Public | Audit Listed Invoices | LPs, Public |
| `/lp` | Connected Wallet | Deposit USDC, Withdraw LP positions | Liquidity Providers |

---

## Local Development Setup

### 1. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env.local
```
Configure environment variables:
- `NEXT_PUBLIC_STELLAR_NETWORK`: `testnet`
- `NEXT_PUBLIC_SOROBAN_RPC_URL`: `https://soroban-testnet.stellar.org`
- `DATABASE_URL`: `postgres://postgres:postgres@localhost:5432/trusttrove?sslmode=disable`

### 2. Start Database
Spin up the local PostgreSQL database using docker-compose:
```bash
docker-compose up -d
```

### 3. Start Indexer & API
```bash
cd indexer
go mod tidy
go run .
```

### 4. Run Frontend
From the root directory, install workspace dependencies, build the packages, and run:
```bash
pnpm install
pnpm build
pnpm --filter web dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.