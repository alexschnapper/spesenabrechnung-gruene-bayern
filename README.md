# Spesenabrechnung für Delegierte (Bündnis 90/DIE GRÜNEN Bayern)

Webapp, die die **Spesenabrechnung für Delegierte** (z. B. zu Parteitagen) vereinfacht. Sie bildet das Formular
„Spesenabrechnung LV Bayern“ und die Erstattungsordnung (ab 2022) nach: Eingabe, automatische Berechnung, Prüfung
und Ausgabe als druckfertige PDF.

> **Inoffizielles Hilfsmittel.** Kein Angebot des Landesverbands, ohne Gewähr. Aktuell eingerichtet für den
> **Kreisverband Ansbach Stadt und Land**.

## Wichtig für die Einreichung

- PDF ausdrucken, **Datum und Unterschrift** nicht vergessen.
- **Originalbelege** beilegen (Papier ist für die Schatzmeisterei am besten), **Autokennzeichen** angeben.
- Frühstück aus der Hotelrechnung herausrechnen (Übernachtung wird ohne Frühstück erstattet).
- Spenden (Verzicht auf Erstattung) sind gerne gesehen.

## Datenschutz

Es gibt keinen Server. Alle Eingaben (auch IBAN und Anschrift) bleiben im Browser (localStorage) und können dort mit
„Alle Daten löschen“ entfernt werden.

## Was der MVP kann

- Deckblatt-Angaben, Reisetage mit Fahrtkosten (Pkw 0,30 €/km, Motorrad/Moped 0,20 €/km), Park-/ÖPNV-Kosten
- Verpflegungspauschalen (14 € / 28 €) mit Kürzungen (Frühstück 5,60 €, Mittag-/Abendessen je 11,20 €)
- Übernachtung ohne Frühstück, höchstens 120 € je Nacht
- Sonstige Aufwendungen (Porto, Taxi mit Begründung, Telefon 20 %/max. 20 € je Monat)
- Spende (ganz/teilweise), Auszahlung, Prüfungen (Kennzeichen, IBAN, Fristen …)
- PDF im Layout des Originalformulars (Deckblatt, Aufstellung, Anlage), Entwurf speichern, JSON-Sicherung

Geplant: Beleg-Upload, Unterschrift, XLSX-Export, OCR, Versand – siehe [Issues](../../issues).

## Entwicklung

```bash
npm install
npm test        # Tests der Berechnung, Prüfung und PDF-Erzeugung
npm run dev     # lokale Entwicklung
npm run build   # Produktions-Build nach dist/
```

Technik: Vite, TypeScript, Svelte 5, [pdf-lib](https://pdf-lib.js.org/), Vitest. Deployment per GitHub Actions auf
GitHub Pages (Einstellungen → Pages → Quelle „GitHub Actions“).

Sätze: `src/config/rates.ts` · Verband/Empfänger: `src/config/verband.ts`.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
