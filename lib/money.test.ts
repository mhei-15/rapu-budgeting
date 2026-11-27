import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTotal } from "./money.ts";

test("matching lines and total", () => {
  const items = [{ amount_cents: 129 }, { amount_cents: 595 }, { amount_cents: -120 }, { amount_cents: 60 }];
  assert.deepEqual(checkTotal(items, 664), { sumCents: 664, totalCents: 664, matches: true, differenceCents: 0 });
});

test("a missed line shows as a difference", () => {
  const r = checkTotal([{ amount_cents: 129 }], 418);
  assert.equal(r.matches, false);
  assert.equal(r.differenceCents, 289);
});
