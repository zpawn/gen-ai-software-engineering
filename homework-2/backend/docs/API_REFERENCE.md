# API Reference

Base URL: `http://localhost:3001/api/v1`

## Error Format

```json
{
  "error": "Validation failed",
  "details": [{ "field": "customer_email", "message": "Must be a valid email address" }]
}
```

## Ticket Model

Required create fields: `customer_id`, `customer_email`, `customer_name`, `subject`, `description`.

Optional fields: `category`, `priority`, `status`, `resolved_at`, `assigned_to`, `tags`, `metadata`.

## Endpoints

### POST /tickets

Creates a ticket. Add `?auto_classify=true` to run classification during creation.

```bash
curl -X POST http://localhost:3001/api/v1/tickets?auto_classify=true \
  -H 'Content-Type: application/json' \
  -d @tests/fixtures/ticket.json
```

### POST /tickets/import

Imports CSV, JSON, or XML content. The request body is JSON and contains `format`, `content` or `records`, and optional `auto_classify`.

```bash
curl -X POST http://localhost:3001/api/v1/tickets/import \
  -H 'Content-Type: application/json' \
  -d '{
    "format": "csv",
    "auto_classify": true,
    "content": "customer_id,customer_email,customer_name,subject,description\ncust-1,ada@example.com,Ada,Cannot access,I cannot access my account after reset"
  }'
```

Response summary:

```json
{
  "total_records": 2,
  "successful": 1,
  "failed": 1,
  "errors": [{ "record": 2, "error": "Validation failed", "details": [] }],
  "tickets": []
}
```

### GET /tickets

Lists tickets. Supported filters: `category`, `priority`, `status`, `customer_id`, `customer_email`, `assigned_to`, `source`, `tag`.

```bash
curl 'http://localhost:3001/api/v1/tickets?category=billing_question&priority=high'
```

### GET /tickets/:id

```bash
curl http://localhost:3001/api/v1/tickets/<ticket-id>
```

### PUT /tickets/:id

Updates one or more ticket fields. Changing `category` or `priority` marks the ticket as manually overridden.

```bash
curl -X PUT http://localhost:3001/api/v1/tickets/<ticket-id> \
  -H 'Content-Type: application/json' \
  -d '{ "status": "waiting_customer", "assigned_to": "agent-1" }'
```

### DELETE /tickets/:id

```bash
curl -X DELETE http://localhost:3001/api/v1/tickets/<ticket-id>
```

Returns `204 No Content`.

### POST /tickets/:id/auto-classify

Runs category and priority classification. If the ticket has a manual override, pass `force=true`.

```bash
curl -X POST 'http://localhost:3001/api/v1/tickets/<ticket-id>/auto-classify?force=true'
```

### GET /tickets/:id/classification-log

Returns all stored classification decisions for a ticket.

```bash
curl http://localhost:3001/api/v1/tickets/<ticket-id>/classification-log
```
