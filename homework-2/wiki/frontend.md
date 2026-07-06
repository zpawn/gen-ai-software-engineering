# Frontend Application

The frontend is implemented as a Next.js application in `frontend/`. It consumes the Fastify REST API from `backend/` and provides the customer support ticket workflows required by the assignment.

## Stack

- **Framework**: Next.js App Router
- **Styling**: Tailwind CSS
- **API base URL**: `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:3001/api/v1`
- **Primary screen**: Support Console dashboard

## Implemented Workflows

- Ticket list with filters for category, priority, status, and source.
- Ticket detail panel with category, priority, source, device, tags, status, and classification reasoning.
- Create ticket form that calls `POST /api/v1/tickets?auto_classify=true`.
- Bulk import form for JSON, CSV, and XML content.
- Auto-classify action using `POST /api/v1/tickets/:id/auto-classify?force=true`.
- Status update and delete actions.
- Loading, success, error, and empty states.

## Boundaries

- The frontend does not duplicate backend classification rules.
- Backend owns validation, persistence, import parsing, and classification decisions.
- Frontend performs only user-facing form state management and API orchestration.

## Local Development

Run the backend and frontend from the repository root:

```bash
npm run dev:backend
npm run dev:frontend
```

The frontend runs on `http://localhost:3000`; the backend API runs on `http://localhost:3001/api/v1`.
