# 🏦 Homework 1: Banking Transactions API

> **Student Name**: ilia makarov
> **Date Submitted**: 27.06.2026
> **AI Tools Used**: Antigravity (Gemini / Claude) AI coding assistant

---

## 📋 Project Overview

A REST API for managing banking transactions, built with **TypeScript**, **Fastify**, and **SQLite**. The API supports creating transactions (deposits, withdrawals, transfers), querying transaction history with filters, checking account balances, and viewing account summaries.

### Key Features

- ✅ **CRUD transactions** — Create and retrieve banking transactions
- ✅ **Input validation** — JSON Schema validation via Fastify + business rule validation in the service layer
- ✅ **Transaction filtering** — Filter by account, type, and date range with combinable filters
- ✅ **Account balance** — Dynamically calculated from transaction history
- ✅ **Account summary** — Total deposits, withdrawals, transaction count, and most recent date (Task 4A)
- ✅ **Error handling** — Structured error responses matching the specification format

---

## 🏗️ Architecture

The project follows a **MVC + Repository** layered architecture:

```
Routes → Controller → Service → Repository → SQLite (drizzle-orm)
```

| Layer | Responsibility |
|-------|---------------|
| **Routes** | Register endpoints, attach JSON Schema validation |
| **Controller** | Extract HTTP params, delegate to Service, return response |
| **Service** | Business logic (UUID generation, balance checks, decimal validation) |
| **Repository** | Data access layer — the only layer aware of the database |

### Architecture Decisions

1. **SQLite instead of in-memory arrays**: While the spec suggests in-memory storage, SQLite was chosen as a deliberate architectural decision to demonstrate the repository pattern with a real query layer. SQLite requires no server, no Docker, and no configuration — it's functionally equivalent to in-memory storage for this use case while providing better query capabilities.

2. **drizzle-orm**: Chosen as the lightest type-safe ORM available. Schema is defined in TypeScript, queries are type-checked at compile time, and there's no heavy code generation step (unlike Prisma).

3. **JSON Schema validation**: Leverages Fastify's built-in ajv integration for input validation. This provides automatic 400 responses for malformed requests without custom validation code for basic rules (pattern, enum, minimum).

4. **Custom error handler**: Fastify's default error format doesn't match the spec. A global `setErrorHandler` transforms both ajv validation errors and custom business errors into the required `{ error, details[] }` format.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions` | Create a new transaction |
| `GET` | `/transactions` | List all transactions (with optional filters) |
| `GET` | `/transactions/:id` | Get a specific transaction by ID |
| `GET` | `/accounts/:accountId/balance` | Get calculated account balance |
| `GET` | `/accounts/:accountId/summary` | Get account summary (Task 4A) |

### Query Parameters for `GET /transactions`

| Parameter | Example | Description |
|-----------|---------|-------------|
| `accountId` | `ACC-12345` | Filter by account (as sender or receiver) |
| `type` | `transfer` | Filter by transaction type |
| `from` | `2024-01-01` | Start date (ISO 8601) |
| `to` | `2024-12-31` | End date (ISO 8601) |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (LTS) |
| Language | TypeScript (strict mode) |
| Framework | Fastify v4 |
| Database | SQLite via better-sqlite3 |
| ORM | drizzle-orm |
| Validation | Fastify JSON Schema (ajv) |
| ID Generation | `crypto.randomUUID()` (built-in) |

---

*This project was completed as part of the AI-Assisted Development course.*
