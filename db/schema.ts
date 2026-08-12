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
