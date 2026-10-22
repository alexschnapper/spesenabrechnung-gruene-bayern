import { FUNKTIONEN } from '../config/funktionen';
import { bicBereinigen, nurZiffern } from './person';
import type { Abrechnung, Tag, Sonstige } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function neuerTag(vorlage?: Partial<Tag>): Tag {
  return {
    id: uid(),
    datum: '',
    abfahrt: '',
    ankunft: '',
    anlass: '',
    von: '',
    nach: '',
    fahrzeug: '',
    kennzeichen: '',
    km: '',
    oepnv: '',
    parken: '',
    uebernachtung: '',
    fruehstueckAbzug: '',
    tagTyp: 'eintaegig',
    fruehstueck: false,
    mittag: false,
    abend: false,
    ...vorlage,
  };
}

export function neueSonstige(vorlage?: Partial<Sonstige>): Sonstige {
  return { id: uid(), art: 'porto', beschreibung: '', betrag: '', begruendung: '', ...vorlage };
}

export function leereAbrechnung(): Abrechnung {
  return {
    version: 1,
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    wohnort: '',
    email: '',
    funktion: '',
    anlass: '',
    bank: '',
    iban: '',
    bic: '',
    tage: [neuerTag()],
    sonstige: [],
    spendeModus: 'keine',
    spendeBetrag: '',
    verpflegungSpende: true,
    ort: '',
    unterschriftDatum: '',
  };
}

/** Gespeicherte oder importierte Daten robust in eine gültige Abrechnung überführen. */
export function normalisiere(roh: unknown): Abrechnung {
  const basis = leereAbrechnung();
  if (!roh || typeof roh !== 'object') return basis;
  const o = migriereAlt(roh as Record<string, unknown>);
  const d: Record<string, unknown> = { ...basis };
  for (const [k, v] of Object.entries(basis)) {
    if (k === 'tage' || k === 'sonstige' || k === 'version') continue;
    if (typeof v === typeof o[k]) d[k] = o[k];
  }
  d.tage = Array.isArray(o.tage)
    ? o.tage.filter((t) => t && typeof t === 'object').map((t) => neuerTag(t as Partial<Tag>))
    : basis.tage;
  d.sonstige = Array.isArray(o.sonstige)
    ? o.sonstige.filter((t) => t && typeof t === 'object').map((t) => neueSonstige(t as Partial<Sonstige>))
    : [];
  const fertig = d as unknown as Abrechnung;
  fertig.plz = nurZiffern(fertig.plz);
  fertig.bic = bicBereinigen(fertig.bic);
  return fertig;
}

/** Ältere Entwürfe/Sicherungen hatten „name“, „anschrift“ und eine Freitext-„funktion“. */
function migriereAlt(o: Record<string, unknown>): Record<string, unknown> {
  const r = { ...o };
  if (typeof o.name === 'string' && r.vorname === undefined && r.nachname === undefined) {
    const t = o.name.trim();
    const i = t.lastIndexOf(' ');
    r.vorname = i > 0 ? t.slice(0, i) : '';
    r.nachname = i > 0 ? t.slice(i + 1) : t;
  }
  if (typeof o.anschrift === 'string' && r.strasse === undefined) {
    const m = /^(.*?),?\s*(\d{5})\s+(.+)$/.exec(o.anschrift.trim());
    if (m) {
      r.strasse = m[1];
      r.plz = m[2];
      r.wohnort = m[3];
    } else {
      r.strasse = o.anschrift;
    }
  }
  if (typeof o.funktion === 'string' && o.funktion && !FUNKTIONEN.some((f) => f.id === o.funktion)) {
    if (r.anlass === undefined) r.anlass = o.funktion;
    r.funktion = '';
  }
  return r;
}
