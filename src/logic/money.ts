/** Text („12,50“, „1.234,56 €“, „12.5“) in Cent. Ungültiges oder Negatives ergibt 0. */
export function parseEuro(s: string): number {
  const n = parseZahl(s);
  return Math.round(n * 100);
}

/** Text in Dezimalzahl (deutsch oder englisch geschrieben). Ungültiges oder Negatives ergibt 0. */
export function parseZahl(s: string): number {
  if (!s) return 0;
  let t = s.replace(/[€\s]/g, '');
  if (!t) return 0;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Cent als „12,50“ */
export function formatCent(c: number): string {
  return (c / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Cent als „12,50 €“ */
export function formatEuro(c: number): string {
  return `${formatCent(c)} €`;
}

/** „2026-10-24“ → „24.10.2026“ */
export function formatDatum(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}
