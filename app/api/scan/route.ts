import { NextResponse } from "next/server";
import { z } from "zod";
import { readReceipt } from "@/lib/read-receipt";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  images: z
    .array(
      z.object({
        data: z.string().min(100).max(8_000_000),
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      }),
    )
    .min(1)
    .max(6),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Lähetä 1–6 kuvaa kuitista." }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY puuttuu palvelimelta." }, { status: 503 });
  }
  try {
    // Saved categories and rules come from the database in the next step; defaults for now.
    const result = await readReceipt({
      images: parsed.data.images,
      categories: DEFAULT_CATEGORIES.map((c) => c.name),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("scan failed", e);
    return NextResponse.json({ error: "Kuitin lukeminen epäonnistui. Yritä uudelleen." }, { status: 502 });
  }
}
