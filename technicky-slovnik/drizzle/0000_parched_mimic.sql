CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `words` (
	`id` text PRIMARY KEY NOT NULL,
	`cs` text NOT NULL,
	`en` text NOT NULL,
	`ja` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image_key` text
);
