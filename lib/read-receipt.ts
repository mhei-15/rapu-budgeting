import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { receiptSchema, type Receipt } from "./receipt-schema.ts";
import { checkTotal } from "./money.ts";

export const RECEIPT_MODEL = "claude-opus-5-5";
// Claude Opus 5.5 list prices in USD per million tokens (input, output).
const PRICE_IN = 4;
const PRICE_OUT = 20;

export type ReceiptImage = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
export type ItemRule = { match: string; category: string };

const INSTRUCTIONS = `You read Finnish shop receipts from photos and return every line as structured data.

How Finnish receipts work:
- The receipt may come in several photos of one long receipt, in order. Read them as one receipt and don't repeat lines that appear in two photos.
- Amounts use a decimal comma ("1,29"). Return whole cents (129).
- Weighed items print weight and price per kg, e.g. "BANAANI 0,842 KG à 1,99". Put 0.842 in quantity, 199 in unit_price_cents and the line total in amount_cents.
- "PANTTI" lines are bottle or can deposits: kind "deposit", same category as the drink they belong to.
- K-Plussa, S-Bonus, "ETU", "ALE", "ALENNUS" and similar lines that reduce the price are kind "discount" with a negative amount, in the same category as the product they reduce.
- The ALV table at the bottom lists VAT per rate (food is usually 13,5 %, most other goods 25,5 %). Copy it into vat.
- Don't return payment lines (card type, card number digits, change, "KORTTI", "KÄTEINEN") or loyalty card numbers as items. Never include card or account numbers anywhere.
- total_cents is the amount paid (YHTEENSÄ, SUMMA, MAKSETTAVA).

Categories:
- Use only the category names you are given.
- Apply the person's saved rules first: if a line's text contains a rule's match text, use that rule's category with confidence 1.
- Otherwise choose the most likely category and set confidence honestly. Below 0.8 means the person should check it; add a short Finnish note saying what else it could be.

Write product names and notes in Finnish. If the photo is not a receipt or can't be read, set is_receipt to false and explain in problems.`;

export async function readReceipt(opts: {
  images: ReceiptImage[];
  categories: string[];
  rules?: ItemRule[];
  client?: Anthropic;
}) {
  if (opts.images.length === 0) throw new Error("No images");
  if (opts.categories.length === 0) throw new Error("No categories");
  const client = opts.client ?? new Anthropic();
  const schema = receiptSchema(opts.categories as [string, ...string[]]);

  const response = await client.beta.messages.parse({
    model: RECEIPT_MODEL,
    max_tokens: 16000,
    // If the model declines a request, the API retries it on a suitable fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          ...opts.images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
          })),
          {
            type: "text" as const,
            text:
              `Categories: ${JSON.stringify(opts.categories)}\n` +
              `Saved rules: ${JSON.stringify(opts.rules ?? [])}\n` +
              `Read this receipt.`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to read this image.");
  if (response.stop_reason === "max_tokens") throw new Error("The receipt was too long to read in one go.");
  const receipt = response.parsed_output as Receipt | null;
  if (!receipt) throw new Error("Claude's answer didn't match the receipt format.");

  const { input_tokens, output_tokens } = response.usage;
  return {
    receipt,
    totalCheck: checkTotal(receipt.items, receipt.total_cents),
    model: response.model,
    usage: { input_tokens, output_tokens },
    approxCostUsd: (input_tokens * PRICE_IN + output_tokens * PRICE_OUT) / 1_000_000,
  };
}
