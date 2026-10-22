import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { leereAbrechnung, neuerTag } from '../logic/defaults';
import { beispielAbrechnung } from '../logic/sample';
import { erzeugePdf } from './pdf';

describe('PDF', () => {
  it('erzeugt die Beispiel-PDF (Deckblatt, Aufstellung, Anlage)', async () => {
    const bytes = await erzeugePdf(beispielAbrechnung());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    mkdirSync('sample-output', { recursive: true });
    writeFileSync('sample-output/beispiel-abrechnung.pdf', bytes);
  });

  it('kommt mit leeren Daten und Sonderzeichen zurecht', async () => {
    const leer = await erzeugePdf(leereAbrechnung(), { entwurf: true });
    expect((await PDFDocument.load(leer)).getPageCount()).toBeGreaterThanOrEqual(2);
    const d = beispielAbrechnung();
    d.vorname = 'Zoë 😀';
    d.nachname = 'Łukasz';
    d.funktion = 'x'.repeat(500);
    await expect(erzeugePdf(d)).resolves.toBeInstanceOf(Uint8Array);
  });

  it('verteilt viele Reisetage auf mehrere Seiten', async () => {
    const d = beispielAbrechnung();
    d.tage = Array.from({ length: 30 }, (_, i) =>
      neuerTag({ datum: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, tagTyp: 'zwischen', anlass: 'LDK' }),
    );
    const doc = await PDFDocument.load(await erzeugePdf(d));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
  });
});
