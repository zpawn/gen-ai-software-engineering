CREATE TABLE `classification_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`confidence` real NOT NULL,
	`reasoning` text NOT NULL,
	`keywords_found` text DEFAULT '[]' NOT NULL,
	`decided_at` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text NOT NULL,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`resolved_at` text,
	`assigned_to` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`metadata` text NOT NULL,
	`classification_confidence` real,
	`classification_reasoning` text,
	`classification_keywords` text DEFAULT '[]' NOT NULL,
	`classification_overridden` integer DEFAULT false NOT NULL
);
