/**
 * Reading test (step 1 of the plan): runs Claude on every photo in ./receipts and reports
 * how many receipts add up, which lines need checking, and what it cost.
 *
 *   npm run receipts:test               # every photo in ./receipts
 *   npm run receipts:test -- kuitti3.jpg
 *
 * Several photos of one long receipt: name them kuitti7-1.jpg, kuitti7-2.jpg ... and they are read together.
 * Results are written to receipts/results/<name>.json.
 */
import { readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { readReceipt, type ReceiptImage } from "../lib/read-receipt.ts";
import { DEFAULT_CATEGORIES } from "../lib/categories.ts";
import { formatEur } from "../lib/money.ts";

const DIR = path.resolve("receipts");
const OUT = path.join(DIR, "results");
const PHOTO = /\.(jpe?g|png|webp|heic)$/i;

async function prepare(file: string): Promise<ReceiptImage> {
  // Same as the app does in the browser: about 1,600 px on the long side, JPEG.
  const buf = await sharp(path.join(DIR, file))
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { data: buf.toString("base64"), mediaType: "image/jpeg" };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is missing. Put it in .env.local (see .env.example).");
    process.exit(1);
  }
  const only = process.argv.slice(2);
  const files = (await readdir(DIR)).filter((f) => PHOTO.test(f) && (only.length === 0 || only.includes(f))).sort();
  if (files.length === 0) {
    console.error(`No photos found in ${DIR}.`);
    process.exit(1);
  }
  // Group kuitti7-1.jpg, kuitti7-2.jpg into one receipt.
  const groups = new Map<string, string[]>();
  for (const f of files) {
    const key = f.replace(PHOTO, "").replace(/-\d+$/, "");
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  await mkdir(OUT, { recursive: true });

  let ok = 0;
  let cost = 0;
  let flagged = 0;
  let lines = 0;
  for (const [name, parts] of groups) {
    const t0 = Date.now();
    try {
      const images = await Promise.all(parts.map(prepare));
      const r = await readReceipt({ images, categories: DEFAULT_CATEGORIES.map((c) => c.name) });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      const low = r.receipt.items.filter((i) => i.confidence < 0.8);
      lines += r.receipt.items.length;
      flagged += low.length;
      cost += r.approxCostUsd;
      if (r.totalCheck.matches) ok++;
      await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(r, null, 2));
      const check = r.totalCheck.matches ? "✓ adds up" : `✗ off by ${formatEur(r.totalCheck.differenceCents)}`;
      console.log(
        `${name}: ${r.receipt.store_name}, ${r.receipt.purchased_on}, ${r.receipt.items.length} lines, ` +
          `${formatEur(r.receipt.total_cents)} ${check}, ${low.length} to check, ${secs} s, ~$${r.approxCostUsd.toFixed(3)}`,
      );
      for (const i of low) {
        console.log(`   ? ${i.raw_text} → ${i.category} (${Math.round(i.confidence * 100)} %) ${i.note ?? ""}`);
      }
    } catch (e) {
      console.log(`${name}: FAILED – ${(e as Error).message}`);
    }
  }
  console.log(
    `\n${groups.size} receipts, ${ok} add up to the printed total, ${flagged} of ${lines} lines flagged, ` +
      `about $${cost.toFixed(2)} in total ($${(cost / groups.size).toFixed(3)} per receipt).`,
  );
}

main();
