CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`banner_text` text NOT NULL,
	`page_size_default` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `books` (
	`name` text PRIMARY KEY NOT NULL,
	`parent` text NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`author_email` text,
	`state` text NOT NULL,
	`create_time` text NOT NULL,
	`update_time` text NOT NULL,
	`delete_time` text,
	`purge_time` text,
	`etag` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `books_parent_idx` ON `books` (`parent`);