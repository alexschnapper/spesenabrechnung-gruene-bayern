import { describe, expect, it } from 'vitest';
import { berechne, berechneTag, dauerMinuten } from './calc';
import { neueSonstige, neuerTag, leereAbrechnung } from './defaults';
import { parseEuro, formatCent } from './money';
import { beispielAbrechnung } from './sample';

describe('money', () => {
  it('liest deutsche und englische Schreibweisen', () => {
    expect(parseEuro('12,50')).toBe(1250);
    expect(parseEuro('12.5')).toBe(1250);
    expect(parseEuro('1.234,56 €')).toBe(123456);
    expect(parseEuro('1.234')).toBe(123400);
    expect(parseEuro('abc')).toBe(0);
    expect(parseEuro('-5')).toBe(0);
    expect(parseEuro('')).toBe(0);
  });
  it('formatiert Cent', () => {
    expect(formatCent(1250)).toBe('12,50');
    expect(formatCent(123456)).toBe('1.234,56');
  });
});

describe('Fahrtkosten', () => {
  it('Pkw 0,30 €/km, Motorrad und Moped 0,20 €/km', () => {
    expect(berechneTag(neuerTag({ fahrzeug: 'pkw', km: '100' })).fahrt).toBe(3000);
    expect(berechneTag(neuerTag({ fahrzeug: 'motorrad', km: '100' })).fahrt).toBe(2000);
    expect(berechneTag(neuerTag({ fahrzeug: 'moped', km: '50' })).fahrt).toBe(1000);
  });
  it('addiert ÖPNV und Parkgebühren', () => {
    expect(berechneTag(neuerTag({ fahrzeug: 'pkw', km: '10', oepnv: '5', parken: '2,50' })).fahrt).toBe(300 + 500 + 250);
  });
  it('ohne Fahrzeug keine km-Erstattung', () => {
    expect(berechneTag(neuerTag({ km: '100' })).fahrt).toBe(0);
  });
});

describe('Verpflegung', () => {
  it('Formularbeispiel: An-/Abreise 14 €, Zwischentag 28 €', () => {
    expect(berechneTag(neuerTag({ tagTyp: 'anreise' })).verpflegung).toBe(1400);
    expect(berechneTag(neuerTag({ tagTyp: 'zwischen' })).verpflegung).toBe(2800);
    expect(berechneTag(neuerTag({ tagTyp: 'abreise' })).verpflegung).toBe(1400);
  });
  it('eintägig: nur bei mehr als 8 Stunden', () => {
    const t = (a: string, b: string) => neuerTag({ tagTyp: 'eintaegig', abfahrt: a, ankunft: b });
    expect(berechneTag(t('08:00', '16:00')).verpflegung).toBe(0);
    expect(berechneTag(t('08:00', '16:01')).verpflegung).toBe(1400);
    expect(berechneTag(t('', '')).verpflegung).toBe(0);
  });
  it('Kürzungen: Frühstück 5,60, Mittag/Abend je 11,20', () => {
    expect(berechneTag(neuerTag({ tagTyp: 'zwischen', fruehstueck: true })).verpflegung).toBe(2800 - 560);
    expect(berechneTag(neuerTag({ tagTyp: 'zwischen', mittag: true, abend: true })).verpflegung).toBe(2800 - 2240);
    expect(berechneTag(neuerTag({ tagTyp: 'zwischen', fruehstueck: true, mittag: true, abend: true })).verpflegung).toBe(0);
  });
  it('Kürzung geht nie unter 0', () => {
    expect(berechneTag(neuerTag({ tagTyp: 'anreise', mittag: true, abend: true })).verpflegung).toBe(0);
  });
  it('Dauer über Mitternacht', () => {
    expect(dauerMinuten('22:00', '07:00')).toBe(9 * 60);
    expect(dauerMinuten('', '07:00')).toBeNull();
  });
});

describe('Übernachtung', () => {
  it('zieht das Frühstück aus der Hotelrechnung ab', () => {
    const r = berechneTag(neuerTag({ uebernachtung: '98', fruehstueckAbzug: '12' }));
    expect(r.uebernachtung).toBe(8600);
    expect(r.uebernachtungGekappt).toBe(false);
  });
  it('begrenzt auf 120 € je Nacht', () => {
    const r = berechneTag(neuerTag({ uebernachtung: '150', fruehstueckAbzug: '15' }));
    expect(r.uebernachtung).toBe(12000);
    expect(r.uebernachtungGekappt).toBe(true);
  });
});

describe('Summen und Spende', () => {
  it('Telefon: 20 %, höchstens 20 € pro Monat', () => {
    const d = leereAbrechnung();
    d.tage = [];
    d.sonstige = [neueSonstige({ art: 'telefon', betrag: '39,90' }), neueSonstige({ art: 'telefon', betrag: '200' })];
    const e = berechne(d);
    expect(e.sonstigeErstattung.telefon).toBe(798 + 2000);
    expect(e.sonstigeBeleg.telefon).toBe(3990 + 20000);
  });
  it('Beispielabrechnung', () => {
    const e = berechne(beispielAbrechnung());
    // Fahrt: 2 × 165 km × 0,30 = 99,00 + 6,50 Parken
    expect(e.fahrt).toBe(9900 + 650);
    // Verpflegung: 14,00 + (14,00 − 5,60)
    expect(e.verpflegung).toBe(1400 + 840);
    expect(e.uebernachtung).toBe(8600);
    // Sonstige: 3,45 + 18,60 + 7,98
    expect(e.sonstige).toBe(345 + 1860 + 798);
    expect(e.summe).toBe(e.fahrt + e.verpflegung + e.uebernachtung + e.sonstige);
    expect(e.spende).toBe(2000);
    expect(e.auszahlung).toBe(e.summe - 2000);
  });
  it('Spende „ganz“ und Begrenzung', () => {
    const d = beispielAbrechnung();
    d.spendeModus = 'ganz';
    const e = berechne(d);
    expect(e.auszahlung).toBe(0);
    d.spendeModus = 'teilweise';
    d.spendeBetrag = '99999';
    expect(berechne(d).spende).toBe(e.summe);
  });
});
