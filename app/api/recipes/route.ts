import { desc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { recipes } from "../../../db/schema";

export async function GET() {
  const rows = await getDb().select().from(recipes).orderBy(desc(recipes.createdAt));
  return Response.json({ recipes: rows.map((row) => ({ ...row, ingredients: JSON.parse(row.ingredients) })) });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  if (!title) return Response.json({ error: "Recipe title is required" }, { status: 400 });
  const ingredients = String(form.get("ingredients") || "[]");
  const instructions = String(form.get("instructions") || "").trim();
  const servings = Math.max(1, Number(form.get("servings")) || 2);
  const stamp = crypto.randomUUID();
  const front = form.get("front");
  const back = form.get("back");
  let frontImageKey: string | null = null;
  let backImageKey: string | null = null;
  if (front instanceof File && front.size) {
    frontImageKey = `recipes/${stamp}-front.jpg`;
    await env.BUCKET.put(frontImageKey, front.stream(), { httpMetadata: { contentType: front.type || "image/jpeg" } });
  }
  if (back instanceof File && back.size) {
    backImageKey = `recipes/${stamp}-back.jpg`;
    await env.BUCKET.put(backImageKey, back.stream(), { httpMetadata: { contentType: back.type || "image/jpeg" } });
  }
  const [recipe] = await getDb().insert(recipes).values({ title, servings, ingredients, instructions, frontImageKey, backImageKey }).returning();
  return Response.json({ recipe: { ...recipe, ingredients: JSON.parse(recipe.ingredients) } }, { status: 201 });
}
