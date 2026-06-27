# Architecture Overview

This page describes the structural architecture of the `homework-1` project.

## Core Stack
- **Runtime**: Node.js 18+
- **Framework**: Fastify (via `src/app.ts` factory)
- **Database**: SQLite (managed with Drizzle ORM in `src/config/database.ts`)

## Project Structure (MVC)
The application follows a Model-View-Controller (MVC) pattern and is organized by modules:

```text
homework-1/
├── src/
│   ├── app.ts                  # Fastify app factory
│   ├── server.ts               # Entry point
│   ├── config/database.ts      # SQLite + drizzle-orm setup
│   ├── modules/transactions/   # Transaction module (MVC)
│   │   ├── transaction.controller.ts
│   │   ├── transaction.repository.ts
│   │   ├── transaction.routes.ts
│   │   ├── transaction.schema.ts
│   │   ├── transaction.model.ts    # Drizzle schema (Model)
│   │   └── transaction.service.ts
│   └── shared/
│       ├── constants.ts        # Currencies, types, patterns
│       └── errors.ts           # Custom error classes
```

## Data Layer
The application uses SQLite as its primary database, with files stored in the `data/` directory. Schema migrations and generation are handled programmatically via Drizzle Kit (`db:generate`) using a glob-based discovery pattern (`src/**/*.model.ts`).
