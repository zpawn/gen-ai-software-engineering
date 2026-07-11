CREATE INDEX `classification_ticket_idx` ON `classification_decisions` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `tickets_category_idx` ON `tickets` (`category`);--> statement-breakpoint
CREATE INDEX `tickets_priority_idx` ON `tickets` (`priority`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_customer_email_idx` ON `tickets` (`customer_email`);