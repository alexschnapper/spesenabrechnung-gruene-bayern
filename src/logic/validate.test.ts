import { describe, expect, it } from 'vitest';
import { berechne } from './calc';
import { neueSonstige, neuerTag } from './defaults';
import { beispielAbrechnung } from './sample';
import { addMonate, ibanGueltig, pruefe } from './validate';

const fehlerTexte = (d = beispielAbrechnung(), heute = '2026-10-26') =>
  pruefe(d, berechne(d), heute)
    .filter((m) => m.stufe === 'fehler')
    .map((m) => m.text);

describe('IBAN', () => {
  it('erkennt gültige und ungültige IBANs', () => {
    expect(ibanGueltig('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(ibanGueltig('de89370400440532013000')).toBe(true);
    expect(ibanGueltig('DE89 3704 0044 0532 0130 01')).toBe(false);
    expect(ibanGueltig('DE89 3704')).toBe(false);
    expect(ibanGueltig('')).toBe(false);
  });
});

describe('Prüfung', () => {
  it('Beispielabrechnung hat keine Fehler', () => {
    expect(fehlerTexte()).toEqual([]);
  });
  it('Kennzeichen ist Pflicht bei eigenem Fahrzeug', () => {
    const d = beispielAbrechnung();
    d.tage[0].kennzeichen = '';
    expect(fehlerTexte(d).some((t) => t.includes('Autokennzeichen'))).toBe(true);
  });
  it('Taxi braucht eine Begründung', () => {
    const d = beispielAbrechnung();
    d.sonstige = [neueSonstige({ art: 'taxi', betrag: '10' })];
    expect(fehlerTexte(d).some((t) => t.includes('Taxi'))).toBe(true);
  });
  it('eintägig ohne Zeiten ist ein Fehler', () => {
    const d = beispielAbrechnung();
    d.tage = [neuerTag({ datum: '2026-10-24', tagTyp: 'eintaegig' })];
    expect(fehlerTexte(d).some((t) => t.includes('Abfahrts- und Ankunftszeit'))).toBe(true);
  });
  it('Pflichtangaben und ungültige IBAN', () => {
    const d = beispielAbrechnung();
    d.name = '';
    d.iban = 'DE00 0000';
    const f = fehlerTexte(d);
    expect(f.some((t) => t.includes('Name'))).toBe(true);
    expect(f.some((t) => t.includes('IBAN'))).toBe(true);
  });
  it('warnt bei abgelaufener Spendenfrist (3 Monate)', () => {
    const d = beispielAbrechnung();
    const hinweise = (heute: string) =>
      pruefe(d, berechne(d), heute).filter((m) => m.stufe === 'hinweis' && m.text.includes('Verzichtsspende'));
    d.unterschriftDatum = '2027-01-24';
    expect(hinweise('2027-01-24')).toHaveLength(0);
    d.unterschriftDatum = '2027-01-25';
    expect(hinweise('2027-01-25')).toHaveLength(1);
  });
  it('warnt nach dem 31. Januar des Folgejahres', () => {
    const d = beispielAbrechnung();
    const frist = (heute: string) =>
      pruefe(d, berechne(d), heute).filter((m) => m.text.startsWith('Frist:'));
    expect(frist('2027-01-31')).toHaveLength(0);
    expect(frist('2027-02-01')).toHaveLength(1);
  });
  it('warnt bei Übernachtung über 120 €', () => {
    const d = beispielAbrechnung();
    d.tage[0].uebernachtung = '160';
    const w = pruefe(d, berechne(d), '2026-10-26').filter((m) => m.text.includes('120,00'));
    expect(w.length).toBe(1);
  });
  it('Monatsrechnung', () => {
    expect(addMonate('2026-10-24', 3)).toBe('2027-01-24');
  });
});
