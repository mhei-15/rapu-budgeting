import Link from "next/link";

export const dynamic = "force-dynamic";

const MONTHS = ["Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"];

export default function Overview() {
  const month = MONTHS[new Date().getMonth()];
  return (
    <main className="app">
      <div className="top">
        <div>
          <div className="eyebrow">Yleiskatsaus</div>
          <h1>{month}</h1>
        </div>
      </div>
      <section className="sheet" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ fontSize: 19 }}>Kuukauden kulutus tulee tähän</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kuittien tallennus ja kuukausigraafit tulevat seuraavaksi. Nyt voit jo kokeilla, miten kuitti luetaan.
        </p>
      </section>
      <Link className="btn" href="/skannaa">
        Skannaa kuitti
      </Link>
    </main>
  );
}
