import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leftovers, pantryItems, planItems, purchases, shoppingItems } from "../../../db/schema";

const tables = {
  pantry: pantryItems,
  shopping: shoppingItems,
  plan: planItems,
  leftovers,
  purchases,
} as const;

type Kind = keyof typeof tables;

function kindOf(value: string | null): Kind | null {
  return value && value in tables ? (value as Kind) : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = kindOf(url.searchParams.get("kind"));
  if (!kind) return Response.json({ error: "Unknown household collection" }, { status: 400 });

  const db = getDb();
  if (kind === "pantry") return Response.json({ items: await db.select().from(pantryItems).orderBy(desc(pantryItems.updatedAt)) });
  if (kind === "shopping") return Response.json({ items: await db.select().from(shoppingItems).orderBy(desc(shoppingItems.updatedAt)) });
  if (kind === "leftovers") return Response.json({ items: await db.select().from(leftovers).orderBy(desc(leftovers.createdAt)) });
  if (kind === "purchases") {
    const rows = await db.select().from(purchases).orderBy(desc(purchases.createdAt));
    return Response.json({ items: rows.map((row) => ({ ...row, items: JSON.parse(row.items || "[]") })) });
  }
  const week = url.searchParams.get("week");
  const rows = week
    ? await db.select().from(planItems).where(eq(planItems.weekStart, week)).orderBy(desc(planItems.createdAt))
    : await db.select().from(planItems).orderBy(desc(planItems.createdAt));
  return Response.json({ items: rows });
}

export async function POST(request: Request) {
  const body = await request.json() as { kind?: string; action?: string; item?: Record<string, unknown>; id?: string };
  const kind = kindOf(body.kind || null);
  if (!kind) return Response.json({ error: "Unknown household collection" }, { status: 400 });
  const db = getDb();

  if (body.action === "delete") {
    if (!body.id) return Response.json({ error: "id is required" }, { status: 400 });
    if (kind === "pantry") await db.delete(pantryItems).where(eq(pantryItems.id, body.id));
    if (kind === "shopping") await db.delete(shoppingItems).where(eq(shoppingItems.id, body.id));
    if (kind === "plan") await db.delete(planItems).where(eq(planItems.id, body.id));
    if (kind === "leftovers") await db.delete(leftovers).where(eq(leftovers.id, body.id));
    if (kind === "purchases") await db.delete(purchases).where(eq(purchases.id, body.id));
    return Response.json({ ok: true });
  }

  const item = { ...(body.item || {}) } as Record<string, unknown>;
  item.id = String(item.id || crypto.randomUUID());

  if (kind === "pantry") {
    await db.insert(pantryItems).values(item as typeof pantryItems.$inferInsert).onConflictDoUpdate({ target: pantryItems.id, set: item });
  } else if (kind === "shopping") {
    await db.insert(shoppingItems).values(item as typeof shoppingItems.$inferInsert).onConflictDoUpdate({ target: shoppingItems.id, set: item });
  } else if (kind === "plan") {
    await db.insert(planItems).values(item as typeof planItems.$inferInsert).onConflictDoUpdate({ target: planItems.id, set: item });
  } else if (kind === "leftovers") {
    await db.insert(leftovers).values(item as typeof leftovers.$inferInsert).onConflictDoUpdate({ target: leftovers.id, set: item });
  } else {
    const purchase = { ...item, items: typeof item.items === "string" ? item.items : JSON.stringify(item.items || []) };
    await db.insert(purchases).values(purchase as typeof purchases.$inferInsert).onConflictDoUpdate({ target: purchases.id, set: purchase });
  }

  return Response.json({ item: { ...item, items: kind === "purchases" ? item.items || [] : undefined } }, { status: 201 });
}
