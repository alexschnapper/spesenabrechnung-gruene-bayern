import { leereAbrechnung, neueSonstige, neuerTag } from './defaults';
import type { Abrechnung } from './types';

/** Beispiel-Abrechnung (frei erfunden) für Tests und die Beispiel-PDF */
export function beispielAbrechnung(): Abrechnung {
  const d = leereAbrechnung();
  d.name = 'Erika Mustermann';
  d.anschrift = 'Musterstraße 1, 91522 Ansbach';
  d.email = 'erika@example.org';
  d.funktion = 'Delegierte zur Landesdelegiertenkonferenz (LDK), gewählt von der Kreismitgliederversammlung';
  d.bank = 'Beispielbank';
  d.iban = 'DE89 3704 0044 0532 0130 00';
  d.bic = 'COBADEFFXXX';
  d.tage = [
    neuerTag({
      datum: '2026-10-24',
      abfahrt: '08:00',
      ankunft: '10:00',
      anlass: 'Anreise zur LDK',
      von: 'Ansbach',
      nach: 'Augsburg',
      fahrzeug: 'pkw',
      kennzeichen: 'AN-GR 123',
      km: '165',
      parken: '6,50',
      uebernachtung: '98,00',
      fruehstueckAbzug: '12,00',
      tagTyp: 'anreise',
    }),
    neuerTag({
      datum: '2026-10-25',
      abfahrt: '17:30',
      ankunft: '19:30',
      anlass: 'Rückreise von der LDK',
      von: 'Augsburg',
      nach: 'Ansbach',
      fahrzeug: 'pkw',
      kennzeichen: 'AN-GR 123',
      km: '165',
      tagTyp: 'abreise',
      fruehstueck: true,
    }),
  ];
  d.sonstige = [
    neueSonstige({ art: 'porto', beschreibung: 'Porto Einladungen Ortsverband', betrag: '3,45' }),
    neueSonstige({
      art: 'taxi',
      beschreibung: 'Taxi Hotel – Tagungsort',
      betrag: '18,60',
      begruendung: 'Abends kein ÖPNV mehr, Beleg vermerkt',
    }),
    neueSonstige({ art: 'telefon', beschreibung: 'Mobilfunk Oktober (Vorstandsarbeit)', betrag: '39,90' }),
  ];
  d.spendeModus = 'teilweise';
  d.spendeBetrag = '20,00';
  d.verpflegungSpende = true;
  d.ort = 'Ansbach';
  d.unterschriftDatum = '2026-10-26';
  return d;
}
