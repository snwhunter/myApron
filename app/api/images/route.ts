import { env } from "cloudflare:workers";

function config() {
  const runtime = env as unknown as Record<string, unknown>;
  const url = String(runtime.MYAPRON_GOOGLE_URL || "").trim();
  const key = String(runtime.MYAPRON_GOOGLE_API_KEY || "").trim();
  if (!url || !key) throw new Error("Google backend is not configured");
  return { url, key };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("key");
  if (!fileId) return new Response("Not found", { status: 404 });

  try {
    const { url, key } = config();
    const response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, action: "image.get", fileId }),
    });
    if (!response.ok) throw new Error(`Google backend returned HTTP ${response.status}`);
    const data = await response.json() as {
      ok?: boolean;
      error?: string;
      image?: { base64?: string; mimeType?: string };
    };
    if (!data.ok || !data.image?.base64) throw new Error(data.error || "Image not found");
    return new Response(decodeBase64(data.image.base64), {
      headers: {
        "content-type": data.image.mimeType || "image/jpeg",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
