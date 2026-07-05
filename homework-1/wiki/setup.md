# Setup & Running Guide

This page details how to run the `homework-1` API server.

## Installation
Ensure Node.js 18+ is installed.
```bash
npm install
```

## Running the Server
The application runs by default on `http://localhost:3000`.

- **Production Mode**: `npm run start`
- **Development Mode**: `npm run dev` (uses `tsx watch` for auto-reloading)

## Database Setup
To populate the database with initial demo transactions:
```bash
npm run db:seed
```

## Testing Endpoints
You can test the API using:
1. **VS Code REST Client** (`demo/sample-requests.http`)
2. **cURL commands**:
   ```bash
   curl http://localhost:3000/transactions
   curl http://localhost:3000/accounts/ACC-12345/balance
   ```
