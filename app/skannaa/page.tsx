"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shrinkImage } from "@/lib/shrink-image";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { formatEur } from "@/lib/money";
import type { Receipt } from "@/lib/receipt-schema";

type Photo = { data: string; mediaType: "image/jpeg"; preview: string };
type ScanResult = {
  receipt: Receipt;
  totalCheck: { matches: boolean; differenceCents: number };
  approxCostUsd: number;
};

const STEPS = ["Luetaan tekstiä", "Etsitään tuotteet ja hinnat", "Lajitellaan luokkiin", "Tarkistetaan summa"];
const colorOf = (name: string) => DEFAULT_CATEGORIES.find((c) => c.name === name)?.color ?? "#888";

export default function ScanPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());

  // Progress steps are an estimate; the real call is one request.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [busy]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const shrunk = await Promise.all([...files].map((f) => shrinkImage(f)));
      setPhotos((p) => [...p, ...shrunk].slice(0, 6));
    } catch {
      setError("Kuvan avaaminen ei onnistunut. Kokeile toista kuvaa.");
    }
  }

  async function read() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images: photos.map(({ data, mediaType }) => ({ data, mediaType })) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kuitin lukeminen epäonnistui.");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function setCategory(index: number, category: string) {
    if (!result) return;
    const items = result.receipt.items.map((it, i) => (i === index ? { ...it, category } : it));
    setResult({ ...result, receipt: { ...result.receipt, items } });
    setConfirmed((c) => new Set(c).add(index));
  }

  if (result) return <Review result={result} confirmed={confirmed} onCategory={setCategory} onRestart={() => { setResult(null); setPhotos([]); setConfirmed(new Set()); }} />;

  return (
    <main className="app">
      <div className="top">
        <h1>{busy ? "Luetaan kuittia" : "Skannaa kuitti"}</h1>
        <Link className="pill" href="/">Sulje</Link>
      </div>

      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.preview} alt={`Kuva ${i + 1}`} />
          ))}
        </div>
      )}

      {busy ? (
        <section className="sheet">
          <ul className="steps">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>{s}</li>
            ))}
          </ul>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <label className="btn">
            <input id="photo" type="file" accept="image/*" capture="environment" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            {photos.length ? "Lisää toinen osa" : "Ota kuva"}
          </label>
          <label className="btn ghost">
            <input id="library" type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            Valitse kuvista
          </label>
          {photos.length > 0 && (
            <button className="btn" onClick={read}>Lue kuitti ({photos.length} {photos.length === 1 ? "kuva" : "kuvaa"})</button>
          )}
          <p className="muted small" style={{ margin: 0, textAlign: "center" }}>
            Pitkä kuitti? Ota useampi kuva ylhäältä alas, niin ne luetaan yhtenä kuittina.
          </p>
        </div>
      )}
      {error && <div className="check">{error}</div>}
    </main>
  );
}

function Review({ result, confirmed, onCategory, onRestart }: {
  result: ScanResult;
  confirmed: Set<number>;
  onCategory: (i: number, c: string) => void;
  onRestart: () => void;
}) {
  const r = result.receipt;
  const sums = new Map<string, number>();
  for (const it of r.items) sums.set(it.category, (sums.get(it.category) ?? 0) + it.amount_cents);
  const toCheck = r.items.filter((it, i) => it.confidence < 0.8 && !confirmed.has(i)).length;
  const date = r.purchased_on.split("-").reverse().join(".");

  return (
    <main className="app">
      <div className="top">
        <h1>Tarkista</h1>
        <button className="pill" onClick={onRestart}>Uusi kuva</button>
      </div>
      {!r.is_receipt && <div className="check">Kuva ei näytä kuitilta: {r.problems.join(" ")}</div>}
      <section className="sheet">
        <div className="rhead">
          <div>
            <b>{r.store_name}</b>
            <span className="muted small">{date} {r.purchased_time ?? ""} · {r.items.length} riviä</span>
          </div>
          <div className="total num">{formatEur(r.total_cents)}</div>
        </div>
        <div className="stack">
          {[...sums].filter(([, v]) => v > 0).map(([c, v]) => <i key={c} style={{ flex: v, background: colorOf(c) }} />)}
        </div>
        <div className="stackleg">
          {[...sums].map(([c, v]) => (
            <span key={c}><i className="dot" style={{ background: colorOf(c) }} />{c} <b className="num">{formatEur(v)}</b></span>
          ))}
        </div>
      </section>

      {toCheck > 0 && <div className="check">{toCheck === 1 ? "1 rivi kannattaa" : `${toCheck} riviä kannattaa`} tarkistaa. Vaihda luokka tarvittaessa.</div>}

      <section className="sheet" style={{ paddingBlock: 6 }}>
        {r.items.map((it, i) => (
          <div key={i} className={`item ${it.kind === "discount" ? "discount" : ""}`}>
            <span className="n">{it.name}</span>
            <span className="p num">{formatEur(it.amount_cents)}</span>
            <span className="raw">{it.raw_text}</span>
            <label className="catselect">
              <i className="dot" style={{ background: colorOf(it.category) }} />
              <select id={`cat-${i}`} value={it.category} onChange={(e) => onCategory(i, e.target.value)} aria-label={`Luokka: ${it.name}`}>
                {DEFAULT_CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            {it.confidence < 0.8 && !confirmed.has(i) && (
              <div className="check">{(it.note ?? "Epävarma luokka").replace(/[.!?]?$/, ".")} Onko {it.category} oikein?</div>
            )}
          </div>
        ))}
        <div className="item muted small">
          <span>{r.vat.map((v) => `ALV ${String(v.rate_percent).replace(".", ",")} %: ${formatEur(v.tax_cents)}`).join(" · ")}</span>
          <span className={result.totalCheck.matches ? "ok" : ""}>
            {result.totalCheck.matches ? "Summa täsmää ✓" : `Erotus ${formatEur(result.totalCheck.differenceCents)}`}
          </span>
        </div>
      </section>
      {r.problems.length > 0 && r.is_receipt && <div className="check">{r.problems.join(" ")}</div>}

      <button className="btn" disabled aria-disabled="true">Tallenna (tulossa seuraavaksi)</button>
      <p className="muted small" style={{ margin: 0, textAlign: "center" }}>
        Lukeminen maksoi noin {result.approxCostUsd.toFixed(3).replace(".", ",")} $.
      </p>
    </main>
  );
}
