import { normalisiere } from './logic/defaults';
import type { Abrechnung } from './logic/types';

const KEY = 'spesenabrechnung-gruene-bayern:entwurf:v1';

export function ladeEntwurf(): Abrechnung | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? normalisiere(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function speichereEntwurf(d: Abrechnung): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* Speicher nicht verfügbar (z. B. privates Fenster): App läuft trotzdem */
  }
}

export function loescheEntwurf(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
}

export function ladeDatei(inhalt: string): Abrechnung {
  return normalisiere(JSON.parse(inhalt));
}

export function herunterladen(daten: BlobPart, dateiname: string, typ: string): void {
  const url = URL.createObjectURL(new Blob([daten], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
