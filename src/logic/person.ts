import { funktionLabel } from '../config/funktionen';
import type { Abrechnung } from './types';

/** Nur Ziffern, höchstens `max` Stück (für PLZ). */
export function nurZiffern(s: string, max = 5): string {
  return s.replace(/\D/g, '').slice(0, max);
}

export function plzGueltig(s: string): boolean {
  return /^\d{5}$/.test(s);
}

/** BIC: Großbuchstaben und Ziffern, höchstens 11 Zeichen. */
export function bicBereinigen(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
}

/** 8 oder 11 Zeichen: 4 Buchstaben Bank, 2 Buchstaben Land, 2 Zeichen Ort, optional 3 Zeichen Filiale */
export function bicGueltig(s: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s);
}

export function vollerName(d: Pick<Abrechnung, 'vorname' | 'nachname'>): string {
  return [d.vorname.trim(), d.nachname.trim()].filter(Boolean).join(' ');
}

export function anschriftText(d: Pick<Abrechnung, 'strasse' | 'plz' | 'wohnort'>): string {
  const ort = [d.plz.trim(), d.wohnort.trim()].filter(Boolean).join(' ');
  return [d.strasse.trim(), ort].filter(Boolean).join(', ');
}

/** „Delegierte – Landesdelegiertenkonferenz“ */
export function funktionText(d: Pick<Abrechnung, 'funktion' | 'anlass'>): string {
  return [funktionLabel(d.funktion), d.anlass.trim()].filter(Boolean).join(' – ');
}
