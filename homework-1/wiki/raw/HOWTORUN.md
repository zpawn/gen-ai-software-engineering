# ▶️ How to Run the Application

## Prerequisites

- **Node.js** 18 or higher ([download](https://nodejs.org/))
- **npm** (comes with Node.js)

## Quick Start

```bash
# 1. Navigate to the homework-1 directory
cd homework-1

# 2. Install dependencies
npm install

# 3. Start the server
npm run start
```

The API will start at **http://localhost:3000**.

## Seeding Demo Data (Optional)

To populate the SQLite database with the initial demo transactions (for testing):

```bash
npm run db:seed
```

## Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `tsx watch` which automatically restarts the server when you modify source files.


## Testing the API

### Option 1: VS Code REST Client

Open `demo/sample-requests.http` in VS Code with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension installed. Click "Send Request" above any request.

### Option 2: curl

```bash
# Create a transaction
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{"fromAccount":"ACC-12345","toAccount":"ACC-67890","amount":100.50,"currency":"USD","type":"transfer"}'

# Get all transactions
curl http://localhost:3000/transactions

# Get account balance
curl http://localhost:3000/accounts/ACC-12345/balance

# Get account summary
curl http://localhost:3000/accounts/ACC-12345/summary
```

## Project Structure

```
homework-1/
├── src/
│   ├── app.ts                  # Fastify app factory
│   ├── server.ts               # Entry point
│   ├── config/database.ts      # SQLite + drizzle-orm setup
│   ├── db/schema.ts            # Table schema (TypeScript)
│   ├── modules/transactions/   # Transaction module (MVC)
│   │   ├── transaction.controller.ts
│   │   ├── transaction.repository.ts
│   │   ├── transaction.routes.ts
│   │   ├── transaction.schema.ts
│   │   └── transaction.service.ts
│   └── shared/
│       ├── constants.ts        # Currencies, types, patterns
│       └── errors.ts           # Custom error classes
├── demo/                       # Demo scripts and sample data
├── docs/screenshots/           # Screenshots of AI interactions
├── data/                       # SQLite database (auto-created)
├── package.json
└── tsconfig.json
```

## Environment Variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |