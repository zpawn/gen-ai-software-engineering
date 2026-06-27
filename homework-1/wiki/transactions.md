# Entity: Transactions

The **Transaction** entity is the core data model of the `homework-1` API. It represents a financial movement between accounts.

## Schema
- **`id`**: Unique identifier (string, primary key).
- **`fromAccount`**: The sender account ID (string, optional).
- **`toAccount`**: The receiver account ID (string, optional).
- **`amount`**: The transaction amount (real number, required).
- **`currency`**: The currency code, e.g., "USD" (string, required).
- **`type`**: The type of transaction (enum: `deposit`, `withdrawal`, `transfer`, required).
- **`timestamp`**: ISO-8601 timestamp of when the transaction occurred (string, required).
- **`status`**: Current state of the transaction (enum: `pending`, `completed`, `failed`, defaults to `completed`).

## Module Responsibilities
- **Controller**: Validates incoming HTTP requests (using AJV JSON Schema) and handles API responses.
- **Service**: Contains business logic, generates UUIDs, and calls the repository layer.
- **Repository**: Executes SQL statements via Drizzle ORM against the SQLite database.
