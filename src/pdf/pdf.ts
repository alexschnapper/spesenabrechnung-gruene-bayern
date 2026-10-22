import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import { RATES } from '../config/rates';
import { VERBAND } from '../config/verband';
import { berechne, erstattungSonstige } from '../logic/calc';
import type { Ergebnis } from '../logic/calc';
import { formatCent, formatDatum, parseEuro, parseZahl } from '../logic/money';
import type { Abrechnung, SonstigeArt, Tag } from '../logic/types';

export interface PdfOptionen {
  /** Markiert die PDF als unvollständigen Entwurf */
  entwurf?: boolean;
}

interface Fonts {
  font: PDFFont;
  bold: PDFFont;
}

const A4_HOCH: [number, number] = [595.28, 841.89];
const A4_QUER: [number, number] = [841.89, 595.28];
const SCHWARZ = rgb(0, 0, 0);
const ROT = rgb(0.8, 0, 0);
const BLAU = rgb(0.1, 0.3, 0.5);
const GRAU = rgb(0.93, 0.93, 0.93);
const WEISS_GELB = rgb(1, 1, 0.8);

// ---------- Hilfsfunktionen (Koordinaten: y = Abstand vom oberen Seitenrand) ----------

const ERLAUBT = /[ -~ -ÿ€„“”‘’–—…•]/;

/** Nur Zeichen, die die Standardschrift (WinAnsi) darstellen kann; Rest wird zu „?“. */
function clean(s: string): string {
  return Array.from(s.replace(/\s+/g, ' '))
    .map((c) => (ERLAUBT.test(c) ? c : '?'))
    .join('');
}

function text(
  p: PDFPage,
  s: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  o: { color?: RGB; align?: 'l' | 'r' | 'c' } = {},
): void {
  const t = clean(s);
  if (!t) return;
  const w = font.widthOfTextAtSize(t, size);
  const xx = o.align === 'r' ? x - w : o.align === 'c' ? x - w / 2 : x;
  p.drawText(t, { x: xx, y: p.getHeight() - y, size, font, color: o.color ?? SCHWARZ });
}

function linie(p: PDFPage, x1: number, y1: number, x2: number, y2: number, dicke = 0.6, color: RGB = SCHWARZ): void {
  p.drawLine({
    start: { x: x1, y: p.getHeight() - y1 },
    end: { x: x2, y: p.getHeight() - y2 },
    thickness: dicke,
    color,
  });
}

function kasten(p: PDFPage, x: number, y: number, w: number, h: number, fill?: RGB): void {
  p.drawRectangle({
    x,
    y: p.getHeight() - y - h,
    width: w,
    height: h,
    borderWidth: 0.6,
    borderColor: SCHWARZ,
    ...(fill ? { color: fill } : {}),
  });
}

function kuerze(s: string, font: PDFFont, size: number, maxW: number): string {
  let t = clean(s);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function umbrechen(s: string, font: PDFFont, size: number, maxW: number, maxZeilen: number): string[] {
  const t = clean(s).trim();
  if (!t) return [];
  const zeilen: string[] = [];
  let cur = '';
  for (const wort of t.split(' ')) {
    const probe = cur ? `${cur} ${wort}` : wort;
    if (font.widthOfTextAtSize(probe, size) <= maxW) {
      cur = probe;
      continue;
    }
    if (cur) zeilen.push(cur);
    cur = wort;
    while (font.widthOfTextAtSize(cur, size) > maxW && cur.length > 1) {
      let k = cur.length;
      while (k > 1 && font.widthOfTextAtSize(cur.slice(0, k), size) > maxW) k--;
      zeilen.push(cur.slice(0, k));
      cur = cur.slice(k);
    }
  }
  if (cur) zeilen.push(cur);
  if (zeilen.length <= maxZeilen) return zeilen;
  const rest = zeilen.slice(maxZeilen - 1).join(' ');
  return [...zeilen.slice(0, maxZeilen - 1), kuerze(rest, font, size, maxW)];
}

const eur = (c: number) => formatCent(c);

/** Zeile mit Beschriftung links und Wert auf einer Linie */
function feld(p: PDFPage, f: Fonts, label: string, wert: string, x: number, y: number, bis: number, wertX: number): void {
  text(p, label, x, y - 3, 9, f.font);
  text(p, kuerze(wert, f.font, 10, bis - wertX - 2), wertX, y - 3, 10, f.bold);
  linie(p, x, y, bis, y);
}

// ---------- Seite 1: Deckblatt ----------

function deckblatt(p: PDFPage, d: Abrechnung, e: Ergebnis, f: Fonts, o: PdfOptionen): void {
  const L = 57;
  const R = 538;

  if (o.entwurf) text(p, 'ENTWURF – unvollständig, nicht einreichen', R, 40, 9, f.bold, { color: ROT, align: 'r' });

  text(p, 'Spesenabrechnung', L, 62, 18, f.bold);
  text(p, 'An', L, 90, 10, f.font);
  VERBAND.anZeilen.forEach((z, i) => {
    const y = 112 + i * 18;
    text(p, z, L, y - 3, 10, f.font);
    linie(p, L, y, 277, y);
  });

  feld(p, f, 'Name:', d.name, L, 190, R, L + 70);
  feld(p, f, 'Anschrift:', d.anschrift, L, 212, R, L + 70);
  feld(p, f, 'e-mail Adresse:', d.email, L, 234, R, L + 70);

  text(p, 'Funktion/ Tätigkeit und Anlass', L, 258, 10, f.bold, { color: BLAU });
  text(p, '(durch Erstattungsordnung gedeckt, gegebenenfalls durch Beschluss belegen)', L, 268, 7, f.bold);
  const fz = umbrechen(d.funktion, f.bold, 9, R - L - 4, 2);
  for (let i = 0; i < 2; i++) {
    const y = 285 + i * 16;
    if (fz[i]) text(p, fz[i], L + 2, y - 3, 9, f.bold);
    linie(p, L, y, R, y);
  }

  feld(p, f, 'Bank', d.bank, L, 322, R, L + 40);
  text(p, 'IBAN', L, 345 - 3, 9, f.font);
  text(p, d.iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(), L + 40, 345 - 3, 10, f.bold);
  linie(p, L, 345, R, 345);
  text(p, 'BIC:', 400, 345 - 3, 9, f.font);
  text(p, d.bic, 425, 345 - 3, 10, f.bold);

  // Summen
  const zeilen: Array<[string, number, boolean]> = [
    ['Summe der Fahrtkosten lt. Aufstellung   (siehe S. 2)', e.fahrt, false],
    ['Summe des Verpflegungsaufwandes lt. Aufstellung (siehe S. 2)', e.verpflegung, false],
    ['Summe der Übernachtungskosten lt. Aufstellung (siehe S. 2)', e.uebernachtung, false],
    ['Summe der sonstigen Aufwendungen lt. Aufstellung (siehe unten)', e.sonstige, false],
    ['Summe der Aufwendungen', e.summe, true],
    ['abzüglich einer Spende', e.spende, false],
    ['Auszahlung', e.auszahlung, true],
  ];
  const y0 = 370;
  const rh = 18;
  const bx = 458;
  zeilen.forEach(([label, betrag, fett], i) => {
    const y = y0 + i * rh;
    kasten(p, L, y, R - L, rh, fett ? GRAU : undefined);
    linie(p, bx, y, bx, y + rh);
    text(p, label, L + 6, y + 12.5, 9, fett ? f.bold : f.font);
    text(p, `${eur(betrag)} €`, R - 5, y + 12.5, 9.5, fett ? f.bold : f.font, { align: 'r' });
  });

  // Sonstige Aufwendungen
  const ys = y0 + zeilen.length * rh + 22;
  text(p, 'Sonstige Aufwendungen (nur gegen Vorlage der Belege !)', L, ys, 9, f.bold);
  const kopf = ys + 6;
  const rh2 = 16;
  const c1 = 378;
  const c2 = 458;
  kasten(p, L, kopf, R - L, rh2, GRAU);
  linie(p, c1, kopf, c1, kopf + rh2);
  linie(p, c2, kopf, c2, kopf + rh2);
  text(p, 'Art', L + 6, kopf + 11, 8, f.bold);
  text(p, 'Betrag lt. Beleg', c2 - 5, kopf + 11, 8, f.bold, { align: 'r' });
  text(p, 'Erstattung', R - 5, kopf + 11, 8, f.bold, { align: 'r' });
  const arten: Array<[SonstigeArt, string]> = [
    ['porto', 'Porto/Bürobedarf'],
    ['taxi', 'Taxi (Notwendigkeit auf Beleg begründen)'],
    ['telefon', 'Telefon/Internet (20 % der Rechnung, max. 20 €/Monat)'],
    ['sonstiges', 'Sonstiges (Beschreibung siehe Anlage)'],
  ];
  arten.forEach(([art, label], i) => {
    const y = kopf + rh2 * (i + 1);
    kasten(p, L, y, R - L, rh2);
    linie(p, c1, y, c1, y + rh2);
    linie(p, c2, y, c2, y + rh2);
    text(p, kuerze(label, f.font, 7.5, c1 - L - 10), L + 6, y + 11, 7.5, f.font);
    if (e.sonstigeBeleg[art] > 0) {
      text(p, eur(e.sonstigeBeleg[art]), c2 - 5, y + 11, 9, f.font, { align: 'r' });
      text(p, eur(e.sonstigeErstattung[art]), R - 5, y + 11, 9, f.font, { align: 'r' });
    }
  });
  const yg = kopf + rh2 * 5;
  kasten(p, L, yg, R - L, rh2, GRAU);
  linie(p, c2, yg, c2, yg + rh2);
  text(p, 'Gesamtsumme', c2 - 6, yg + 11, 9, f.bold, { align: 'r' });
  text(p, `${eur(e.sonstige)} €`, R - 5, yg + 11, 9, f.bold, { align: 'r' });

  text(p, 'Achtung: Eine Verzichtspende kann max. drei Monate nach Entstehen des Anspruchs anerkannt werden.', L, yg + rh2 + 13, 7.5, f.bold, { color: ROT });

  // Erklärungen
  let y = yg + rh2 + 32;
  const lh = 10.5;
  const p1 = umbrechen(
    'Ich bin damit einverstanden, dass von mir nicht geltend gemachter Verpflegungsmehraufwand als Spende behandelt wird. Im gegenteiligem Fall bitte diesen Satz streichen.',
    f.font,
    8,
    R - L,
    3,
  );
  p1.forEach((z) => {
    text(p, z, L, y, 8, f.font);
    if (!d.verpflegungSpende) linie(p, L, y - 2.6, L + f.font.widthOfTextAtSize(clean(z), 8), y - 2.6, 0.7);
    y += lh;
  });
  y += 4;
  umbrechen(
    'Ich bestätige mit meiner Unterschrift, dass die beigelegten Belege zur Kostenerstattung meiner Auslagen bei keinem anderem Unternehmen/ keiner anderen Institution (z. B. Finanzamt) eingereicht worden sind.',
    f.font,
    8,
    R - L,
    4,
  ).forEach((z) => {
    text(p, z, L, y, 8, f.font);
    y += lh;
  });

  // Ort, Datum, Unterschrift
  y += 22;
  const ortDatum = [d.ort, d.unterschriftDatum ? formatDatum(d.unterschriftDatum) : ''].filter(Boolean).join(', den ');
  text(p, ortDatum, L, y - 3, 9, f.font);
  linie(p, L, y, 290, y);
  linie(p, 330, y, R, y);
  text(p, 'Ort, Datum', L, y + 9, 7, f.font);
  text(p, 'Unterschrift', 330, y + 9, 7, f.bold);
  text(p, 'Eine Verzichtspende wird nur im Jahr des Unterschriftsdatums berücksichtigt.', L, y + 20, 7.5, f.bold, { color: ROT });

  // Prüfvermerk Kassierung
  const yk = y + 32;
  kasten(p, L, yk, R - L, 44);
  text(p, 'Sachlich und rechnerisch geprüft; alle Belege vorhanden', L + 6, yk + 13, 9, f.font);
  linie(p, L + 8, yk + 36, 170, yk + 36, 0.4);
  linie(p, 200, yk + 36, 400, yk + 36, 0.4);
  text(p, 'Datum', L + 8, yk + 42, 7, f.bold);
  text(p, 'Unterschrift KassiererIn', 200, yk + 42, 7, f.bold);
}

// ---------- Aufstellung Fahrtkosten und Tagegelder (Querformat) ----------

const SPALTEN = [
  { key: 'datum', w: 50 },
  { key: 'zeit', w: 56 },
  { key: 'anlass', w: 126 },
  { key: 'strecke', w: 126 },
  { key: 'fahrt', w: 180 },
  { key: 'fahrtkosten', w: 52 },
  { key: 'uebernachtung', w: 58 },
  { key: 'verpflegung', w: 52 },
  { key: 'frueh', w: 26 },
  { key: 'mittag', w: 26 },
  { key: 'abend', w: 26 },
] as const;
const TAB_X = 30;
const TAB_W = SPALTEN.reduce((s, c) => s + c.w, 0);

const FZ_NAME = { pkw: 'PKW', motorrad: 'Motorrad', moped: 'Moped/Mofa' } as const;
const TYP_NAME = { keine: '', eintaegig: 'über 8 Std.', anreise: 'Anreisetag', zwischen: '24 Std.', abreise: 'Abreisetag' } as const;

function tabellenKopf(p: PDFPage, f: Fonts, y: number): number {
  const h = 30;
  let x = TAB_X;
  const titel: Record<string, string[]> = {
    datum: ['Datum'],
    zeit: ['Uhrzeit', 'Abfahrt – Ankunft'],
    anlass: ['Anlass'],
    strecke: ['von – nach'],
    fahrt: ['Fahrtkosten (siehe a)', 'Autokennzeichen angeben'],
    fahrtkosten: ['Fahrt-', 'kosten'],
    uebernachtung: ['Übernachtung', 'nur mit Beleg'],
    verpflegung: ['Verpflegung', '(siehe b)'],
    frueh: ['Früh-', 'stück'],
    mittag: ['Mittag-', 'essen'],
    abend: ['Abend-', 'essen'],
  };
  for (const c of SPALTEN) {
    const gelb = c.key === 'frueh' || c.key === 'mittag' || c.key === 'abend';
    kasten(p, x, y, c.w, h, gelb ? WEISS_GELB : GRAU);
    const t = titel[c.key];
    t.forEach((z, i) => {
      const rot = c.key === 'fahrt' && i === 1;
      text(p, z, x + 3, y + 11 + i * 10, i === 0 ? 7.5 : 6.5, i === 0 ? f.bold : f.font, rot ? { color: ROT } : {});
    });
    x += c.w;
  }
  return y + h;
}

function tabellenZeile(p: PDFPage, f: Fonts, t: Tag, r: Ergebnis['tage'][number], y: number, h: number): void {
  let x = TAB_X;
  const pos: Record<string, number> = {};
  for (const c of SPALTEN) {
    kasten(p, x, y, c.w, h);
    pos[c.key] = x;
    x += c.w;
  }
  const W = (k: string) => SPALTEN.find((c) => c.key === k)!.w;
  const z1 = y + 13;
  const z2 = y + 25;

  text(p, formatDatum(t.datum), pos.datum + 3, z1, 8, f.font);
  text(p, t.abfahrt || t.ankunft ? `${t.abfahrt || '?'}–${t.ankunft || '?'}` : '', pos.zeit + 3, z1, 8, f.font);

  umbrechen(t.anlass, f.font, 7.5, W('anlass') - 6, 2).forEach((z, i) => text(p, z, pos.anlass + 3, z1 + i * 11 - 1, 7.5, f.font));
  umbrechen([t.von, t.nach].filter(Boolean).join(' – '), f.font, 7.5, W('strecke') - 6, 2).forEach((z, i) =>
    text(p, z, pos.strecke + 3, z1 + i * 11 - 1, 7.5, f.font),
  );

  const km = parseZahl(t.km);
  const fz = t.fahrzeug
    ? `${FZ_NAME[t.fahrzeug]} ${t.kennzeichen || '(Kennzeichen fehlt)'} · ${t.km || '0'} km`
    : '–';
  text(p, kuerze(fz, f.bold, 7.5, W('fahrt') - 6), pos.fahrt + 3, z1, 7.5, f.bold);
  const oep = parseEuro(t.oepnv);
  const park = parseEuro(t.parken);
  const teile = [`ÖPNV lt. Beleg: ${oep ? eur(oep) : '–'}`];
  if (park) teile.push(`Park/Maut: ${eur(park)}`);
  if (t.fahrzeug && km > 0) teile.push(`km: ${eur(r.kmBetrag)}`);
  text(p, kuerze(teile.join(' · '), f.font, 7, W('fahrt') - 6), pos.fahrt + 3, z2, 7, f.font);

  text(p, r.fahrt ? eur(r.fahrt) : '', pos.fahrtkosten + W('fahrtkosten') - 3, z1, 8.5, f.font, { align: 'r' });

  if (r.uebernachtungRechnung > 0) {
    text(p, eur(r.uebernachtung), pos.uebernachtung + W('uebernachtung') - 3, z1, 8.5, f.font, { align: 'r' });
    if (r.uebernachtungRechnung !== r.uebernachtungOhneFruehstueck || r.uebernachtungGekappt) {
      const hinweis = r.uebernachtungGekappt
        ? `max. ${eur(RATES.uebernachtungMax)}`
        : `Rechn. ${eur(r.uebernachtungRechnung)}`;
      text(p, hinweis, pos.uebernachtung + W('uebernachtung') - 3, z2, 5.8, f.font, { align: 'r' });
      if (!r.uebernachtungGekappt) {
        text(p, `ohne Frühst.`, pos.uebernachtung + 3, z2, 5.8, f.font);
      }
    }
  }

  if (r.verpflegungBrutto > 0) {
    text(p, eur(r.verpflegung), pos.verpflegung + W('verpflegung') - 3, z1, 8.5, f.font, { align: 'r' });
    text(p, TYP_NAME[t.tagTyp], pos.verpflegung + W('verpflegung') - 3, z2, 6, f.font, { align: 'r' });
  } else if (t.tagTyp !== 'keine') {
    text(p, '0,00', pos.verpflegung + W('verpflegung') - 3, z1, 8.5, f.font, { align: 'r' });
  }
  const mitte = (k: string) => pos[k] + W(k) / 2;
  if (t.fruehstueck) text(p, 'ja', mitte('frueh'), z1 + 4, 8, f.font, { align: 'c' });
  if (t.mittag) text(p, 'ja', mitte('mittag'), z1 + 4, 8, f.font, { align: 'c' });
  if (t.abend) text(p, 'ja', mitte('abend'), z1 + 4, 8, f.font, { align: 'c' });
}

function aufstellung(doc: PDFDocument, d: Abrechnung, e: Ergebnis, f: Fonts): void {
  const ROW_H = 34;
  const UNTEN = 540;
  const tage = d.tage
    .map((t, i) => ({ t, r: e.tage[i] }))
    .sort((a, b) => (a.t.datum || '9').localeCompare(b.t.datum || '9'));
  let idx = 0;
  let erste = true;

  while (idx < tage.length || erste) {
    const p = doc.addPage(A4_QUER);
    text(p, `Spesenabrechnung – ${d.name}`, TAB_X, 28, 8, f.font);
    text(p, `${VERBAND.kreisverband} · Sätze ${RATES.gueltigkeitsjahr}`, TAB_X + TAB_W, 28, 8, f.font, { align: 'r' });
    text(p, 'Fahrtkosten und Tagegelder', TAB_X, 50, 13, f.bold);
    let y = 60;

    if (erste) {
      const bh = 52;
      const bw = [220, 290, TAB_W - 510];
      let bx = TAB_X;
      bw.forEach((w) => {
        kasten(p, bx, y, w, bh);
        bx += w;
      });
      const kmZeile = (n: string, c: number) => `${n}  ${eur(c)} € / km`;
      text(p, 'a) Fahrtkosten *', TAB_X + 5, y + 11, 8, f.bold);
      text(p, kmZeile('eigener PKW', RATES.kmCent.pkw), TAB_X + 5, y + 22, 7.5, f.font);
      text(p, '(Auto-Kennzeichen angeben!!)', TAB_X + 5, y + 31, 7, f.bold, { color: ROT });
      text(p, kmZeile('Motorrad / Motorroller', RATES.kmCent.motorrad), TAB_X + 5, y + 40, 7.5, f.font);
      text(p, kmZeile('Moped / Mofa', RATES.kmCent.moped), TAB_X + 115, y + 40, 7.5, f.font);
      const bx2 = TAB_X + bw[0] + 5;
      text(p, 'b) Verpflegungspauschalen *', bx2, y + 11, 8, f.bold);
      text(p, `über 8 Stunden: ${eur(RATES.verpflegung.kurz)} €   ·   24 Stunden: ${eur(RATES.verpflegung.voll)} €`, bx2, y + 22, 7.5, f.font);
      text(p, `Frühstück selbst gezahlt: ${eur(RATES.verpflegung.fruehstueckAbzug)} € abziehen.`, bx2, y + 32, 7, f.font);
      text(p, `Mittag- und Abendessen erhalten: je ${eur(RATES.verpflegung.mittagAbzug)} € abziehen.`, bx2, y + 41, 7, f.font);
      const bx3 = TAB_X + bw[0] + bw[1] + 5;
      text(p, 'Bei mehrtägigen Reisen ist die Pauschale für An- und', bx3, y + 22, 7, f.font);
      text(p, 'Abreise unabhängig von der Zeit der Abwesenheit.', bx3, y + 31, 7, f.font);
      text(p, 'Jeden Tag einzeln abrechnen. * Sätze nach Steuerrecht', bx3, y + 40, 7, f.font);
      y += bh + 10;
    }

    y = tabellenKopf(p, f, y);
    const platz = Math.floor((UNTEN - y - 22) / ROW_H);
    const rest = tage.length - idx;
    const n = Math.min(Math.max(platz, 1), rest);
    for (let i = 0; i < n; i++) {
      tabellenZeile(p, f, tage[idx + i].t, tage[idx + i].r, y, ROW_H);
      y += ROW_H;
    }
    idx += n;
    erste = false;

    if (idx >= tage.length) {
      // Summenzeile
      const sx = (k: string) => {
        let x = TAB_X;
        for (const c of SPALTEN) {
          if (c.key === k) return x + c.w;
          x += c.w;
        }
        return x;
      };
      const h = 22;
      kasten(p, TAB_X, y, TAB_W, h, GRAU);
      text(p, 'Summe', sx('fahrt') - 8, y + 15, 9, f.bold, { align: 'r' });
      text(p, eur(e.fahrt), sx('fahrtkosten') - 3, y + 15, 9, f.bold, { align: 'r' });
      text(p, eur(e.uebernachtung), sx('uebernachtung') - 3, y + 15, 9, f.bold, { align: 'r' });
      text(p, eur(e.verpflegung), sx('verpflegung') - 3, y + 15, 9, f.bold, { align: 'r' });
    }
  }
}

// ---------- Anlage: sonstige Aufwendungen ----------

const ART_NAME: Record<SonstigeArt, string> = {
  porto: 'Porto/Bürobedarf',
  taxi: 'Taxi',
  telefon: 'Telefon/Internet',
  sonstiges: 'Sonstiges',
};

function anlageSonstige(doc: PDFDocument, d: Abrechnung, e: Ergebnis, f: Fonts): void {
  const L = 40;
  const spalten = [
    { w: 24, t: 'Nr.' },
    { w: 78, t: 'Art' },
    { w: 150, t: 'Beschreibung' },
    { w: 143, t: 'Begründung / Zusammenhang' },
    { w: 60, t: 'Beleg €' },
    { w: 60, t: 'Erstattung €' },
  ];
  const breite = spalten.reduce((s, c) => s + c.w, 0);
  const RH = 30;
  let i = 0;
  while (i < d.sonstige.length) {
    const p = doc.addPage(A4_HOCH);
    text(p, `Spesenabrechnung – ${d.name}`, L, 28, 8, f.font);
    text(p, 'Anlage: Sonstige Aufwendungen (nur gegen Vorlage der Belege)', L, 52, 13, f.bold);
    let y = 66;
    let x = L;
    spalten.forEach((c) => {
      kasten(p, x, y, c.w, 18, GRAU);
      text(p, c.t, x + 3, y + 12, 8, f.bold);
      x += c.w;
    });
    y += 18;
    while (i < d.sonstige.length && y + RH < 790) {
      const s = d.sonstige[i];
      const b = parseEuro(s.betrag);
      x = L;
      const werte = [String(i + 1), ART_NAME[s.art], s.beschreibung, s.begruendung];
      spalten.forEach((c, k) => {
        kasten(p, x, y, c.w, RH);
        if (k < 4) {
          const zeilen = k < 2 ? [kuerze(werte[k], f.font, 7.5, c.w - 6)] : umbrechen(werte[k], f.font, 7.5, c.w - 6, 2);
          zeilen.forEach((z, zi) => text(p, z, x + 3, y + 12 + zi * 10, 7.5, f.font));
        }
        x += c.w;
      });
      text(p, b ? eur(b) : '', L + breite - 60 - 3, y + 12, 8.5, f.font, { align: 'r' });
      text(p, eur(erstattungSonstige(s.art, b)), L + breite - 3, y + 12, 8.5, f.font, { align: 'r' });
      y += RH;
      i++;
    }
    if (i >= d.sonstige.length) {
      kasten(p, L, y, breite, 20, GRAU);
      text(p, 'Gesamtsumme', L + breite - 66, y + 14, 9, f.bold, { align: 'r' });
      text(p, eur(e.sonstige), L + breite - 3, y + 14, 9, f.bold, { align: 'r' });
    }
  }
}

// ---------- Zusammenbau ----------

export async function erzeugePdf(d: Abrechnung, opt: PdfOptionen = {}): Promise<Uint8Array> {
  const e = berechne(d);
  const doc = await PDFDocument.create();
  doc.setTitle(`Spesenabrechnung ${d.name}`.trim());
  doc.setAuthor(d.name || 'Spesenabrechnung');
  doc.setCreator('spesenabrechnung-gruene-bayern');
  const f: Fonts = {
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  deckblatt(doc.addPage(A4_HOCH), d, e, f, opt);
  if (d.tage.length > 0) aufstellung(doc, d, e, f);
  if (d.sonstige.length > 0) anlageSonstige(doc, d, e, f);

  const seiten = doc.getPages();
  seiten.forEach((p, i) => {
    text(p, `Seite ${i + 1}/${seiten.length}`, p.getWidth() / 2, p.getHeight() - 14, 8, f.font, { align: 'c' });
  });
  return doc.save();
}
