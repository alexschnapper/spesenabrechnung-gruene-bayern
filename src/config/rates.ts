/**
 * Erstattungssätze (alle Beträge in Cent).
 * Quelle: Erstattungsordnung Bündnis 90/DIE GRÜNEN LV Bayern (ab 2022) und
 * Formular Spesenabrechnung LV Bayern; Sätze nach Steuerrecht, bestätigt für 2026.
 * Ändern sich die Sätze, nur diese Datei anpassen.
 */
export const RATES = {
  gueltigkeitsjahr: 2026,
  /** Cent pro Kilometer */
  kmCent: { pkw: 30, motorrad: 20, moped: 20 },
  verpflegung: {
    /** mehr als 8 Stunden Abwesenheit sowie An-/Abreisetag bei mehrtägigen Reisen */
    kurz: 1400,
    /** 24 Stunden Abwesenheit */
    voll: 2800,
    fruehstueckAbzug: 560,
    mittagAbzug: 1120,
    abendAbzug: 1120,
  },
  /** Übernachtung ohne Frühstück, je Nacht */
  uebernachtungMax: 12000,
  telefon: { prozent: 20, maxProMonat: 2000 },
  /** Verzichtsspende muss innerhalb dieser Monate nach Entstehen des Anspruchs erklärt werden */
  spendeFristMonate: 3,
} as const;
