import { RATES } from '../config/rates';
import { formatCent, formatDatum, parseEuro, parseZahl } from './money';
import { dauerMinuten } from './calc';
import { bicGueltig, plzGueltig } from './person';
import type { Ergebnis } from './calc';
import type { Abrechnung } from './types';

export type Stufe = 'fehler' | 'hinweis';
export interface Meldung {
  stufe: Stufe;
  text: string;
  /** Reisetag, auf den sich die Meldung bezieht */
  tagId?: string;
}

export function ibanGueltig(eingabe: string): boolean {
  const i = eingabe.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(i)) return false;
  if (i.startsWith('DE') && i.length !== 22) return false;
  const r = i.slice(4) + i.slice(0, 4);
  let rest = 0;
  for (const ch of r) {
    const v = ch >= 'A' ? ch.charCodeAt(0) - 55 : Number(ch);
    rest = Number(String(rest) + String(v)) % 97;
  }
  return rest === 1;
}

export function addMonate(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
}

function addTage(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const istDatum = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Prüft die Abrechnung gegen die Erstattungsordnung und die Hinweise des Formulars. */
export function pruefe(d: Abrechnung, e: Ergebnis, heute: string): Meldung[] {
  const m: Meldung[] = [];
  const fehler = (text: string, tagId?: string) => m.push({ stufe: 'fehler', text, tagId });
  const hinweis = (text: string, tagId?: string) => m.push({ stufe: 'hinweis', text, tagId });

  if (!d.vorname.trim()) fehler('Vorname fehlt.');
  if (!d.nachname.trim()) fehler('Nachname fehlt.');
  if (!d.strasse.trim()) fehler('Straße und Hausnummer fehlen.');
  if (!d.plz) fehler('Postleitzahl fehlt.');
  else if (!plzGueltig(d.plz)) fehler('Die Postleitzahl muss aus genau 5 Ziffern bestehen.');
  if (!d.wohnort.trim()) fehler('Wohnort fehlt.');
  if (!d.funktion) fehler('Funktion fehlt (Delegierte oder Ersatzdelegierte).');
  if (!d.anlass.trim()) fehler('Anlass fehlt (durch die Erstattungsordnung gedeckt, ggf. durch Beschluss belegen).');
  if (d.bic && !bicGueltig(d.bic)) fehler('Der BIC muss aus 8 oder 11 Zeichen bestehen (Buchstaben und Ziffern, z. B. COBADEFFXXX).');
  if (!d.iban.trim()) fehler('IBAN fehlt.');
  else if (!ibanGueltig(d.iban)) fehler('Die IBAN ist ungültig (Prüfziffer oder Länge stimmt nicht).');
  if (!d.email.trim()) hinweis('E-Mail-Adresse fehlt (steht im Formular, für Rückfragen sinnvoll).');

  if (d.tage.length === 0 && d.sonstige.length === 0) fehler('Es ist weder ein Reisetag noch eine sonstige Aufwendung eingetragen.');

  d.tage.forEach((t, i) => {
    const r = e.tage[i];
    const nr = `Reisetag ${i + 1}`;
    if (!istDatum(t.datum)) fehler(`${nr}: Datum fehlt.`, t.id);
    if (t.fahrzeug) {
      if (!t.kennzeichen.trim()) fehler(`${nr}: Autokennzeichen angeben (Pflicht bei eigenem Fahrzeug).`, t.id);
      if (parseZahl(t.km) <= 0) fehler(`${nr}: Kilometer fehlen.`, t.id);
    } else if (parseZahl(t.km) > 0) {
      fehler(`${nr}: Kilometer eingetragen, aber kein Fahrzeug gewählt.`, t.id);
    }
    if (t.tagTyp === 'eintaegig') {
      const dauer = dauerMinuten(t.abfahrt, t.ankunft);
      if (dauer === null) fehler(`${nr}: Abfahrts- und Ankunftszeit angeben (Nachweis für mehr als 8 Stunden Abwesenheit).`, t.id);
      else if (dauer <= 8 * 60) hinweis(`${nr}: Bei höchstens 8 Stunden Abwesenheit gibt es keine Verpflegungspauschale.`, t.id);
    }
    if (r.uebernachtungGekappt) {
      hinweis(
        `${nr}: Übernachtung ohne Frühstück liegt über ${formatCent(RATES.uebernachtungMax)} €. Erstattet werden höchstens ${formatCent(RATES.uebernachtungMax)} €; höhere Kosten brauchen eine vorherige Genehmigung.`,
        t.id,
      );
    }
    if (r.uebernachtungRechnung > 0 && parseEuro(t.fruehstueckAbzug) === 0) {
      hinweis(`${nr}: Übernachtung wird nur ohne Frühstück erstattet. Ist Frühstück im Preis enthalten, den Frühstücksanteil laut Rechnung eintragen.`, t.id);
    }
    if (parseEuro(t.fruehstueckAbzug) > 0 && istDatum(t.datum)) {
      const folgetag = d.tage.find((x) => x.datum === addTage(t.datum, 1));
      if (folgetag && !folgetag.fruehstueck) {
        hinweis(`${nr}: Das Hotelfrühstück am Folgetag bitte dort als „Frühstück erhalten“ markieren (Kürzung der Verpflegungspauschale).`, t.id);
      }
    }
  });

  d.sonstige.forEach((s, i) => {
    const nr = `Sonstige Aufwendung ${i + 1}`;
    if (parseEuro(s.betrag) === 0) hinweis(`${nr}: Betrag fehlt.`);
    if (s.art === 'taxi' && !s.begruendung.trim()) {
      fehler(`${nr} (Taxi): Besondere Veranlassung begründen. Taxi wird nur im Ausnahmefall erstattet und die Begründung gehört auch auf den Beleg.`);
    }
    if (s.art === 'sonstiges' && !s.begruendung.trim()) {
      hinweis(`${nr}: Zusammenhang zu Auftrag, Beschluss oder Wahl kurz begründen.`);
    }
  });

  if (d.spendeModus === 'teilweise') {
    const b = parseEuro(d.spendeBetrag);
    if (b === 0) fehler('Spende „teilweise“ gewählt, aber kein Betrag eingetragen.');
    else if (b > e.summe) hinweis('Der Spendenbetrag ist höher als die Summe der Aufwendungen und wird auf die Summe begrenzt.');
  }

  const daten = d.tage.map((t) => t.datum).filter(istDatum).sort();
  const bezug = istDatum(d.unterschriftDatum) ? d.unterschriftDatum : heute;
  const hatSpende = d.spendeModus !== 'keine' || d.verpflegungSpende;
  if (daten.length > 0) {
    const ersterTag = daten[0];
    if (hatSpende && addMonate(ersterTag, RATES.spendeFristMonate) < bezug) {
      hinweis(
        `Verzichtsspende: Sie kann nur innerhalb von ${RATES.spendeFristMonate} Monaten nach Entstehen des Anspruchs erklärt werden. Für Ausgaben ab dem ${formatDatum(ersterTag)} ist diese Frist (bezogen auf ${formatDatum(bezug)}) bereits abgelaufen.`,
      );
    }
    const letzterTag = daten[daten.length - 1];
    const jahr = Number(letzterTag.slice(0, 4));
    if (`${jahr + 1}-01-31` < heute) {
      hinweis(`Frist: Die Abrechnung ist spätestens am 31.01.${jahr + 1} einzureichen. Spätere Ansprüche werden nur bei besonderen Gründen erstattet.`);
    }
  }
  if (!istDatum(d.unterschriftDatum)) {
    hinweis('Datum der Unterschrift fehlt. Das Datum und die Unterschrift gehören auf den Ausdruck; eine Verzichtsspende zählt im Jahr des Unterschriftsdatums.');
  }

  return m;
}
