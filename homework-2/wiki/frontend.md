# Frontend Shell

This page is a placeholder for the future Next.js frontend architecture. Detailed frontend design will be described in later steps.

## Planned Role

The frontend will consume the backend REST API and provide customer support workflows around tickets.

## Initial Boundaries

- Next.js owns routing, page composition, UI state, and API consumption.
- The REST API owns validation, persistence, import parsing, classification, and business rules.
- Frontend code should not duplicate backend classification or validation logic beyond user-facing form constraints.

## Expected Screens

- Ticket list with filters for category, priority, status, and assignee.
- Ticket detail view with classification result and lifecycle controls.
- Create/edit ticket form.
- Bulk import screen for CSV, JSON, and XML.
- Import summary screen with successful and failed records.

## Deferred Decisions

- App Router versus Pages Router.
- Component library and styling approach.
- Client-side data fetching strategy.
- Authentication and authorization model.
- Detailed layout, responsive behavior, and accessibility checklist.
