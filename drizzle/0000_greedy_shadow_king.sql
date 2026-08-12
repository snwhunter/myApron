CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`servings` integer DEFAULT 2 NOT NULL,
	`ingredients` text DEFAULT '[]' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`front_image_key` text,
	`back_image_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
