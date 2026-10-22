import { describe, expect, it } from 'vitest';
import { normalisiere } from './defaults';
import { anschriftText, bicBereinigen, bicGueltig, funktionText, nurZiffern, plzGueltig, vollerName } from './person';

describe('Eingabehilfen', () => {
  it('PLZ: nur Ziffern, höchstens 5', () => {
    expect(nurZiffern('91-522 ab')).toBe('91522');
    expect(nurZiffern('1234567')).toBe('12345');
    expect(plzGueltig('91522')).toBe(true);
    expect(plzGueltig('9152')).toBe(false);
  });
  it('BIC: Großbuchstaben, keine Sonderzeichen, höchstens 11', () => {
    expect(bicBereinigen('cobadeff xxx-1234')).toBe('COBADEFFXXX');
    expect(bicGueltig('COBADEFFXXX')).toBe(true);
    expect(bicGueltig('COBADEFF')).toBe(true);
    expect(bicGueltig('COBADEFFXX')).toBe(false);
    expect(bicGueltig('1OBADEFF')).toBe(false);
  });
  it('setzt Name, Anschrift und Funktion zusammen', () => {
    const d = normalisiere({ vorname: 'Erika', nachname: 'Mustermann', strasse: 'Weg 1', plz: '91522', wohnort: 'Ansbach', funktion: 'ersatzdelegierte', anlass: 'LDK' });
    expect(vollerName(d)).toBe('Erika Mustermann');
    expect(anschriftText(d)).toBe('Weg 1, 91522 Ansbach');
    expect(funktionText(d)).toBe('Ersatzdelegierte – LDK');
  });
});

describe('alte Entwürfe', () => {
  it('übernimmt Name, Anschrift und Freitext-Funktion', () => {
    const d = normalisiere({
      name: 'Erika Maria Mustermann',
      anschrift: 'Musterstraße 1, 91522 Ansbach',
      funktion: 'Delegierte zur LDK',
      bic: 'cobadeffxxx',
    });
    expect(d.vorname).toBe('Erika Maria');
    expect(d.nachname).toBe('Mustermann');
    expect(d.strasse).toBe('Musterstraße 1');
    expect(d.plz).toBe('91522');
    expect(d.wohnort).toBe('Ansbach');
    expect(d.funktion).toBe('');
    expect(d.anlass).toBe('Delegierte zur LDK');
    expect(d.bic).toBe('COBADEFFXXX');
  });
  it('kennt neue Daten unverändert', () => {
    const d = normalisiere({ vorname: 'A', nachname: 'B', funktion: 'delegierte', anlass: 'LDK' });
    expect(d.funktion).toBe('delegierte');
    expect(d.anlass).toBe('LDK');
  });
});
