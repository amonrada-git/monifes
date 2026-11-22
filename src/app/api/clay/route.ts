import { generateImage } from "ai";
import sharp from "sharp";
import { parseLook } from "@/lib/character";
import { SCENE_KEYS, portraitPrompt, scenePrompt, type SceneKey } from "@/lib/clay-prompts";

/**
 * One clay picture of you per request: your portrait from your choices, or a
 * moment from the welcome album drawn from that portrait. Only fixed option
 * keys come in — never free text — so the prompt can't be steered.
 */

export const maxDuration = 120;

// The model the app's own clay art was made with. Overridable without a deploy.
const MODEL = process.env.CLAY_IMAGE_MODEL ?? "openai/gpt-image-2.5-flare";

// Per visitor per day: a few tries at a portrait, and their album a few times
// over. The AI Gateway key's budget is the hard ceiling behind this.
// (In memory, so per server instance — good enough until accounts gate it.)
const LIMIT = { portrait: 6, scene: 36 } as const;
const usage = new Map<string, { day: string; portrait: number; scene: number }>();

function allow(who: string, kind: keyof typeof LIMIT) {
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(who);
  const today = u && u.day === day ? u : { day, portrait: 0, scene: 0 };
  if (today[kind] >= LIMIT[kind]) return false;
  today[kind] += 1;
  usage.set(who, today);
  return true;
}

const MAX_REFERENCE = 600_000; // base64 chars: a 720px WebP is far smaller

export async function POST(req: Request) {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const look = parseLook(body?.look);
  const scene = body?.scene;
  const isScene = SCENE_KEYS.includes(scene as SceneKey);
  if (!look || (scene !== undefined && !isScene)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const reference = typeof body?.portrait === "string" ? body.portrait : null;
  if (isScene && (!reference || reference.length > MAX_REFERENCE)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const who = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(who, isScene ? "scene" : "portrait")) {
    return Response.json({ error: "limit" }, { status: 429 });
  }

  try {
    const { image } = await generateImage({
      model: MODEL,
      prompt: isScene
        ? {
            text: scenePrompt(look, scene as SceneKey),
            images: [Buffer.from(reference!.replace(/^data:image\/\w+;base64,/, ""), "base64")],
          }
        : portraitPrompt(look),
      size: "1024x1024",
      providerOptions: { openai: { quality: "medium" } },
      abortSignal: AbortSignal.timeout(110_000),
    });
    const webp = await sharp(image.uint8Array).resize(720, 720).webp({ quality: 82 }).toBuffer();
    return Response.json({ image: `data:image/webp;base64,${webp.toString("base64")}` });
  } catch (err) {
    console.error("[clay] generation failed", err instanceof Error ? err.message : err);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
