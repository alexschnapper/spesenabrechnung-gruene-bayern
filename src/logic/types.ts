export type Fahrzeug = '' | 'pkw' | 'motorrad' | 'moped';
/** eintaegig: Abwesenheit > 8 h · anreise/abreise: mehrtägige Reise · zwischen: voller Tag (24 h) */
export type TagTyp = 'keine' | 'eintaegig' | 'anreise' | 'zwischen' | 'abreise';
export type SonstigeArt = 'porto' | 'taxi' | 'telefon' | 'sonstiges';
export type SpendeModus = 'keine' | 'teilweise' | 'ganz';

/** Ein Reisetag (eine Zeile der Aufstellung). Geldbeträge als Text, so wie eingegeben. */
export interface Tag {
  id: string;
  datum: string; // YYYY-MM-DD
  abfahrt: string; // HH:MM
  ankunft: string; // HH:MM
  anlass: string;
  von: string;
  nach: string;
  fahrzeug: Fahrzeug;
  kennzeichen: string;
  km: string;
  oepnv: string; // € laut Beleg
  parken: string; // € Park-/Straßenbenutzungsgebühren
  uebernachtung: string; // € laut Hotelrechnung
  fruehstueckAbzug: string; // € Frühstücksanteil laut Hotelrechnung (wird abgezogen)
  tagTyp: TagTyp;
  fruehstueck: boolean; // Frühstück erhalten
  mittag: boolean;
  abend: boolean;
}

export interface Sonstige {
  id: string;
  art: SonstigeArt;
  beschreibung: string;
  betrag: string; // € laut Beleg
  begruendung: string;
}

export interface Abrechnung {
  version: 1;
  vorname: string;
  nachname: string;
  strasse: string; // Straße und Hausnummer
  plz: string; // genau 5 Ziffern
  wohnort: string;
  email: string;
  funktion: string; // Id aus config/funktionen.ts
  anlass: string; // z. B. Landesdelegiertenkonferenz
  bank: string;
  iban: string;
  bic: string;
  tage: Tag[];
  sonstige: Sonstige[];
  spendeModus: SpendeModus;
  spendeBetrag: string;
  verpflegungSpende: boolean;
  ort: string;
  unterschriftDatum: string; // YYYY-MM-DD, optional
}
