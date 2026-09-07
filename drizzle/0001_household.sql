CREATE TABLE `pantry_items` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `quantity` text DEFAULT '' NOT NULL,
  `aisle` text DEFAULT 'Pantry' NOT NULL,
  `barcode` text,
  `source` text DEFAULT 'manual' NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `shopping_items` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `quantity` text DEFAULT '' NOT NULL,
  `aisle` text DEFAULT 'Pantry' NOT NULL,
  `recipe_id` integer,
  `recipe_title` text,
  `checked` integer DEFAULT false NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `plan_items` (
  `id` text PRIMARY KEY NOT NULL,
  `week_start` text NOT NULL,
  `recipe_id` integer NOT NULL,
  `recipe_title` text NOT NULL,
  `cooked_on` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `leftovers` (
  `id` text PRIMARY KEY NOT NULL,
  `recipe_id` integer,
  `recipe_title` text NOT NULL,
  `cooked_on` text NOT NULL,
  `servings` integer DEFAULT 1 NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `purchases` (
  `id` text PRIMARY KEY NOT NULL,
  `merchant` text DEFAULT '' NOT NULL,
  `purchased_on` text DEFAULT '' NOT NULL,
  `total_cents` integer DEFAULT 0 NOT NULL,
  `items` text DEFAULT '[]' NOT NULL,
  `source` text DEFAULT 'manual' NOT NULL,
  `source_ref` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
