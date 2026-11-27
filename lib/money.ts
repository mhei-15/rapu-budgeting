export const formatEur = (cents: number) =>
  new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(cents / 100);

/** Compares the sum of the read lines with the printed total. */
export function checkTotal(items: { amount_cents: number }[], totalCents: number) {
  const sum = items.reduce((s, i) => s + i.amount_cents, 0);
  return { sumCents: sum, totalCents, matches: sum === totalCents, differenceCents: totalCents - sum };
}
