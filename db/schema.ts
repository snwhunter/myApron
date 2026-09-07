import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  servings: integer("servings").notNull().default(2),
  ingredients: text("ingredients").notNull().default("[]"),
  instructions: text("instructions").notNull().default(""),
  frontImageKey: text("front_image_key"),
  backImageKey: text("back_image_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pantryItems = sqliteTable("pantry_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull().default(""),
  aisle: text("aisle").notNull().default("Pantry"),
  barcode: text("barcode"),
  source: text("source").notNull().default("manual"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const shoppingItems = sqliteTable("shopping_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull().default(""),
  aisle: text("aisle").notNull().default("Pantry"),
  recipeId: integer("recipe_id"),
  recipeTitle: text("recipe_title"),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const planItems = sqliteTable("plan_items", {
  id: text("id").primaryKey(),
  weekStart: text("week_start").notNull(),
  recipeId: integer("recipe_id").notNull(),
  recipeTitle: text("recipe_title").notNull(),
  cookedOn: text("cooked_on"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leftovers = sqliteTable("leftovers", {
  id: text("id").primaryKey(),
  recipeId: integer("recipe_id"),
  recipeTitle: text("recipe_title").notNull(),
  cookedOn: text("cooked_on").notNull(),
  servings: integer("servings").notNull().default(1),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  merchant: text("merchant").notNull().default(""),
  purchasedOn: text("purchased_on").notNull().default(""),
  totalCents: integer("total_cents").notNull().default(0),
  items: text("items").notNull().default("[]"),
  source: text("source").notNull().default("manual"),
  sourceRef: text("source_ref"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
