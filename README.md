# Rapu Budgeting

A personal, mobile-first budgeting web app. Photograph a receipt, Claude reads every line and sorts it into your own categories, and the overview shows where the money went this month. The interface is in Finnish.

## What works now

- **Skannaa kuitti** (`/skannaa`): take one or more photos of a receipt. They are shrunk to about 1,600 px in the browser and sent to `/api/scan`, where Claude Opus 5.5 reads the store, date, every line, discounts, deposits (pantti) and VAT into a fixed JSON shape.
- **Tarkista**: every line with its category, lines Claude was unsure about flagged, and a check that the lines add up to the printed total. Saving comes in the next step.
- **Reading test**: `npm run receipts:test` runs Claude on the photos in `receipts/` and reports accuracy and cost.
- **Database schema** for Supabase in `supabase/migrations/0001_init.sql` (not connected to the app yet).
- The whole app asks for `APP_PASSWORD` until real sign-in arrives, so nobody else can spend your Claude credit.

## Run the reading test on your own receipts

1. Install Node.js 22 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local` and put your Anthropic API key in `ANTHROPIC_API_KEY`.
3. Put 10 to 20 receipt photos in `receipts/`. Several photos of one long receipt: name them `kuitti7-1.jpg`, `kuitti7-2.jpg`.
4. Run `npm run receipts:test`. Each receipt prints one line, and the full results go to `receipts/results/`.

The photos and results stay on your computer; git ignores them.

## Run the app

```
npm run dev
```

Open http://localhost:3000 and sign in with any username and your `APP_PASSWORD`.

## Next steps

Saving receipts to Supabase with real sign-in, the monthly overview with the running-total graph, your own categories and item rules. See the project plan.
