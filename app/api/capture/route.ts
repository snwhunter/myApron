import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { pantryItems, purchases } from "../../../db/schema";

type CaptureEvent =
  | {
      type: "inventory.upsert";
      sourceRef?: string;
      item: {
        id?: string;
        name: string;
        quantity?: string;
        aisle?: string;
        location?: "pantry" | "fridge" | "freezer";
        barcode?: string;
      };
    }
  | {
      type: "inventory.remove";
      sourceRef?: string;
      id: string;
    }
  | {
      type: "purchase.upsert";
      sourceRef?: string;
      purchase: {
        id?: string;
        merchant?: string;
        purchasedOn?: string;
        totalCents?: number;
        items?: unknown[];
      };
    };

function captureToken() {
  return (env as unknown as { CAPTURE_TOKEN?: string }).CAPTURE_TOKEN;
}

export async function GET() {
  return Response.json({
    service: "myApron capture hook",
    enabled: Boolean(captureToken()),
    accepts: ["inventory.upsert", "inventory.remove", "purchase.upsert"],
  });
}

export async function POST(request: Request) {
  const expected = captureToken();
  if (!expected) {
    return Response.json({ error: "Capture integration is not enabled" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = (await request.json()) as CaptureEvent;
  const db = getDb();

  if (event.type === "inventory.remove") {
    if (!event.id) return Response.json({ error: "id is required" }, { status: 400 });
    await db.delete(pantryItems).where(eq(pantryItems.id, event.id));
    return Response.json({ ok: true });
  }

  if (event.type === "inventory.upsert") {
    const name = String(event.item?.name || "").trim();
    if (!name) return Response.json({ error: "item.name is required" }, { status: 400 });
    const row = {
      id: event.item.id || crypto.randomUUID(),
      name,
      quantity: event.item.quantity || "",
      aisle: event.item.aisle || "Pantry",
      location: event.item.location || "pantry",
      barcode: event.item.barcode || null,
      source: "smart-capturer",
      sourceRef: event.sourceRef || null,
      updatedAt: new Date().toISOString(),
    };
    await db.insert(pantryItems).values(row).onConflictDoUpdate({ target: pantryItems.id, set: row });
    return Response.json({ item: row }, { status: 201 });
  }

  if (event.type === "purchase.upsert") {
    const row = {
      id: event.purchase.id || crypto.randomUUID(),
      merchant: event.purchase.merchant || "",
      purchasedOn: event.purchase.purchasedOn || "",
      totalCents: Math.max(0, Number(event.purchase.totalCents) || 0),
      items: JSON.stringify(event.purchase.items || []),
      source: "smart-capturer",
      sourceRef: event.sourceRef || null,
    };
    await db.insert(purchases).values(row).onConflictDoUpdate({ target: purchases.id, set: row });
    return Response.json({ purchase: { ...row, items: event.purchase.items || [] } }, { status: 201 });
  }

  return Response.json({ error: "Unsupported capture event" }, { status: 400 });
}
