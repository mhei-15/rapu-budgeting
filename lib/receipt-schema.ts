import { z } from "zod";

/**
 * The shape Claude must return for one receipt. Amounts are whole cents so sums never drift.
 * The category field only accepts the person's current category names.
 */
export function receiptSchema(categoryNames: readonly [string, ...string[]]) {
  const item = z.object({
    raw_text: z.string().describe("The line exactly as printed, e.g. 'VALIO KEVYTMAITO 1L'"),
    name: z.string().describe("Short, readable Finnish product name, e.g. 'Valio kevytmaito 1 l'"),
    quantity: z.number().nullable().describe("Count or weight in kg when printed, else null"),
    unit_price_cents: z.number().int().nullable().describe("Price per unit or per kg in cents when printed, else null"),
    amount_cents: z.number().int().describe("Line total in cents. Negative for discounts."),
    kind: z.enum(["product", "discount", "deposit"]),
    category: z.enum(categoryNames),
    confidence: z.number().describe("0 to 1: how sure you are about the category"),
    note: z.string().nullable().describe("Short Finnish note when unsure, e.g. 'Voisi olla myös Koti ja talous'"),
  });
  return z.object({
    store_name: z.string().describe("Store as printed, e.g. 'K-Citymarket Ruoholahti'"),
    chain: z.string().nullable().describe("Chain, e.g. 'K-Citymarket', 'Prisma', 'Lidl'"),
    purchased_on: z.string().describe("Date as YYYY-MM-DD"),
    purchased_time: z.string().nullable().describe("Time as HH:MM, else null"),
    items: z.array(item),
    vat: z.array(
      z.object({
        rate_percent: z.number(),
        net_cents: z.number().int().nullable(),
        tax_cents: z.number().int(),
      }),
    ),
    total_cents: z.number().int().describe("Total paid, as printed (YHTEENSÄ / SUMMA)"),
    is_receipt: z.boolean().describe("false if the photo is not a readable receipt"),
    problems: z.array(z.string()).describe("Short Finnish notes on anything unreadable or cut off"),
  });
}

export type Receipt = z.infer<ReturnType<typeof receiptSchema>>;
export type ReceiptItem = Receipt["items"][number];
