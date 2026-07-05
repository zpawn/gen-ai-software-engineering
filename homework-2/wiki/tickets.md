# Entity: Tickets

The **Ticket** entity is the core data model of the `homework-2` customer support system. It represents a customer support request imported from a file or created through the API/frontend.

## Schema

- **`id`**: UUID.
- **`customer_id`**: Customer identifier.
- **`customer_email`**: Customer email address.
- **`customer_name`**: Customer display name.
- **`subject`**: Short issue title, 1-200 characters.
- **`description`**: Detailed issue description, 10-2000 characters.
- **`category`**: One of `account_access`, `technical_issue`, `billing_question`, `feature_request`, `bug_report`, `other`.
- **`priority`**: One of `urgent`, `high`, `medium`, `low`.
- **`status`**: One of `new`, `in_progress`, `waiting_customer`, `resolved`, `closed`.
- **`created_at`**: Creation timestamp.
- **`updated_at`**: Last update timestamp.
- **`resolved_at`**: Nullable resolution timestamp.
- **`assigned_to`**: Nullable assignee identifier.
- **`tags`**: Array of labels.
- **`metadata.source`**: One of `web_form`, `email`, `api`, `chat`, `phone`.
- **`metadata.browser`**: Browser string.
- **`metadata.device_type`**: One of `desktop`, `mobile`, `tablet`.

## Classification Fields

The auto-classification workflow should also persist or expose:

- **`classification_confidence`**: Numeric confidence score from 0 to 1.
- **`classification_reasoning`**: Human-readable explanation of the decision.
- **`classification_keywords`**: Keywords found in the ticket text.
- **`classification_overridden`**: Whether a user manually changed category or priority.

## Module Responsibilities

- **Controller**: Handles REST requests and maps service results to HTTP responses.
- **Service**: Coordinates validation, lifecycle changes, import summaries, classification, and manual overrides.
- **Repository**: Reads and writes tickets through the persistence layer.
- **Importer**: Parses CSV, JSON, and XML ticket files.
- **Classifier**: Assigns category, priority, confidence, reasoning, and keywords.

## Lifecycle Notes

- New tickets default to `new` unless explicitly set.
- `resolved_at` is nullable and should only be set when a ticket reaches a resolved or closed state.
- Auto-classification may run on creation when requested.
- Manual overrides must not be silently replaced by later automatic classification.
