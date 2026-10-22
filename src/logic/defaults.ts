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
    name: '',
    anschrift: '',
    email: '',
    funktion: '',
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
  const o = roh as Record<string, unknown>;
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
  return d as unknown as Abrechnung;
}
