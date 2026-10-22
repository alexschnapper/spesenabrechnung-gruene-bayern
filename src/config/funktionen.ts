/** Auswahl im Feld „Funktion“. Eintrag hinzufügen genügt, um weitere Funktionen anzubieten. */
export const FUNKTIONEN = [
  { id: 'delegierte', label: 'Delegierte' },
  { id: 'ersatzdelegierte', label: 'Ersatzdelegierte' },
] as const;

export function funktionLabel(id: string): string {
  return FUNKTIONEN.find((f) => f.id === id)?.label ?? '';
}
