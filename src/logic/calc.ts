import { RATES } from '../config/rates';
import { parseEuro, parseZahl } from './money';
import type { Abrechnung, SonstigeArt, Tag } from './types';

export function zeitMin(z: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(z.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Abwesenheitsdauer in Minuten (über Mitternacht hinweg), null wenn Zeiten fehlen */
export function dauerMinuten(abfahrt: string, ankunft: string): number | null {
  const a = zeitMin(abfahrt);
  const b = zeitMin(ankunft);
  if (a === null || b === null) return null;
  let d = b - a;
  if (d < 0) d += 24 * 60;
  return d;
}

export interface TagErgebnis {
  kmBetrag: number;
  fahrt: number;
  verpflegungBrutto: number;
  verpflegungAbzug: number;
  verpflegung: number;
  uebernachtungRechnung: number;
  uebernachtungOhneFruehstueck: number;
  /** erstattungsfähiger Betrag (max. 120 € je Nacht) */
  uebernachtung: number;
  uebernachtungGekappt: boolean;
}

export function berechneTag(t: Tag): TagErgebnis {
  const satz = t.fahrzeug ? RATES.kmCent[t.fahrzeug] : 0;
  const kmBetrag = Math.round(parseZahl(t.km) * satz);
  const fahrt = kmBetrag + parseEuro(t.oepnv) + parseEuro(t.parken);

  const V = RATES.verpflegung;
  let brutto = 0;
  switch (t.tagTyp) {
    case 'eintaegig': {
      const d = dauerMinuten(t.abfahrt, t.ankunft);
      brutto = d !== null && d > 8 * 60 ? V.kurz : 0;
      break;
    }
    case 'anreise':
    case 'abreise':
      brutto = V.kurz;
      break;
    case 'zwischen':
      brutto = V.voll;
      break;
    default:
      brutto = 0;
  }
  const abzug =
    (t.fruehstueck ? V.fruehstueckAbzug : 0) + (t.mittag ? V.mittagAbzug : 0) + (t.abend ? V.abendAbzug : 0);
  const verpflegung = brutto > 0 ? Math.max(0, brutto - abzug) : 0;

  const rechnung = parseEuro(t.uebernachtung);
  const ohneFr = Math.max(0, rechnung - parseEuro(t.fruehstueckAbzug));
  const uebernachtung = Math.min(ohneFr, RATES.uebernachtungMax);

  return {
    kmBetrag,
    fahrt,
    verpflegungBrutto: brutto,
    verpflegungAbzug: brutto > 0 ? Math.min(abzug, brutto) : 0,
    verpflegung,
    uebernachtungRechnung: rechnung,
    uebernachtungOhneFruehstueck: ohneFr,
    uebernachtung,
    uebernachtungGekappt: ohneFr > RATES.uebernachtungMax,
  };
}

export const SONSTIGE_ARTEN: SonstigeArt[] = ['porto', 'taxi', 'telefon', 'sonstiges'];

export function erstattungSonstige(art: SonstigeArt, betragCent: number): number {
  if (art === 'telefon') {
    return Math.min(Math.round((betragCent * RATES.telefon.prozent) / 100), RATES.telefon.maxProMonat);
  }
  return betragCent;
}

export interface Ergebnis {
  tage: TagErgebnis[];
  fahrt: number;
  verpflegung: number;
  uebernachtung: number;
  sonstigeBeleg: Record<SonstigeArt, number>;
  sonstigeErstattung: Record<SonstigeArt, number>;
  sonstige: number;
  summe: number;
  spende: number;
  auszahlung: number;
}

const nullen = (): Record<SonstigeArt, number> => ({ porto: 0, taxi: 0, telefon: 0, sonstiges: 0 });

export function berechne(d: Abrechnung): Ergebnis {
  const tage = d.tage.map(berechneTag);
  const fahrt = tage.reduce((s, t) => s + t.fahrt, 0);
  const verpflegung = tage.reduce((s, t) => s + t.verpflegung, 0);
  const uebernachtung = tage.reduce((s, t) => s + t.uebernachtung, 0);

  const sonstigeBeleg = nullen();
  const sonstigeErstattung = nullen();
  for (const s of d.sonstige) {
    const b = parseEuro(s.betrag);
    sonstigeBeleg[s.art] += b;
    sonstigeErstattung[s.art] += erstattungSonstige(s.art, b);
  }
  const sonstige = SONSTIGE_ARTEN.reduce((sum, a) => sum + sonstigeErstattung[a], 0);

  const summe = fahrt + verpflegung + uebernachtung + sonstige;
  let spende = 0;
  if (d.spendeModus === 'ganz') spende = summe;
  else if (d.spendeModus === 'teilweise') spende = Math.min(parseEuro(d.spendeBetrag), summe);

  return {
    tage,
    fahrt,
    verpflegung,
    uebernachtung,
    sonstigeBeleg,
    sonstigeErstattung,
    sonstige,
    summe,
    spende,
    auszahlung: summe - spende,
  };
}
