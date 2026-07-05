CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`from_account` text,
	`to_account` text,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`timestamp` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL
);
