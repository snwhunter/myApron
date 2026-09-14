import { env } from "cloudflare:workers";

type GoogleRecipe = {
  id: string;
  title: string;
  servings: number;
  ingredients?: unknown[];
  instructions?: string;
  front_file_id?: string;
  back_file_id?: string;
  created_at?: string;
  updated_at?: string;
};

function config() {
  const runtime = env as unknown as Record<string, unknown>;
  const url = String(runtime.MYAPRON_GOOGLE_URL || "").trim();
  const key = String(runtime.MYAPRON_GOOGLE_API_KEY || "").trim();
  if (!url || !key) throw new Error("Google backend is not configured");
  return { url, key };
}

function appRecipe(recipe: GoogleRecipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    servings: Number(recipe.servings || 2),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: recipe.instructions || "",
    frontImageKey: recipe.front_file_id || null,
    backImageKey: recipe.back_file_id || null,
    createdAt: recipe.created_at || recipe.updated_at || "",
  };
}

async function filePayload(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size) return undefined;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return { base64: btoa(binary), mimeType: file.type || "image/jpeg" };
}

export async function GET() {
  try {
    const { url, key } = config();
    const endpoint = new URL(url);
    endpoint.searchParams.set("action", "recipes.list");
    endpoint.searchParams.set("key", key);
    const response = await fetch(endpoint, { redirect: "follow", cache: "no-store" });
    if (!response.ok) throw new Error(`Google backend returned HTTP ${response.status}`);
    const data = await response.json() as { ok?: boolean; error?: string; recipes?: GoogleRecipe[] };
    if (!data.ok) throw new Error(data.error || "Google backend request failed");
    return Response.json({ recipes: (data.recipes || []).map(appRecipe) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Backend error", recipes: [] }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const { url, key } = config();
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    if (!title) return Response.json({ error: "Recipe title is required" }, { status: 400 });

    let ingredients: unknown[] = [];
    try { ingredients = JSON.parse(String(form.get("ingredients") || "[]")); } catch {}

    const recipe = {
      title,
      servings: Math.max(1, Number(form.get("servings")) || 2),
      ingredients,
      instructions: String(form.get("instructions") || "").trim(),
      source: "myApron",
      front: await filePayload(form.get("front")),
      back: await filePayload(form.get("back")),
    };

    const response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, action: "recipe.upsert", recipe }),
    });
    if (!response.ok) throw new Error(`Google backend returned HTTP ${response.status}`);
    const data = await response.json() as { ok?: boolean; error?: string; recipe?: GoogleRecipe };
    if (!data.ok || !data.recipe) throw new Error(data.error || "Google backend save failed");
    return Response.json({ recipe: appRecipe(data.recipe) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Backend error" }, { status: 502 });
  }
}
