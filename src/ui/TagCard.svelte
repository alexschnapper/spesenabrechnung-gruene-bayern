<script lang="ts">
  import type { Tag } from '../logic/types';
  import type { TagErgebnis } from '../logic/calc';
  import type { Meldung } from '../logic/validate';
  import { formatEuro } from '../logic/money';

  interface Props {
    tag: Tag;
    nr: number;
    ergebnis: TagErgebnis;
    meldungen: Meldung[];
    onremove: () => void;
  }
  let { tag = $bindable(), nr, ergebnis, meldungen, onremove }: Props = $props();
</script>

<div class="card">
  <div class="tag-head">
    <strong>Reisetag {nr}</strong>
    <button type="button" class="link danger" onclick={onremove}>Entfernen</button>
  </div>

  <div class="grid">
    <label class="f">Datum
      <input type="date" bind:value={tag.datum} />
    </label>
    <label class="f">Art der Abwesenheit (Verpflegung)
      <select bind:value={tag.tagTyp}>
        <option value="eintaegig">Eintägig, über 8 Stunden</option>
        <option value="anreise">Anreisetag (mehrtägig)</option>
        <option value="zwischen">Zwischentag (24 Stunden)</option>
        <option value="abreise">Abreisetag (mehrtägig)</option>
        <option value="keine">Keine Verpflegungspauschale</option>
      </select>
    </label>
    <label class="f">Abfahrt
      <input type="time" bind:value={tag.abfahrt} />
    </label>
    <label class="f">Ankunft
      <input type="time" bind:value={tag.ankunft} />
    </label>
    <label class="f span2">Anlass
      <input type="text" bind:value={tag.anlass} placeholder="z. B. Landesdelegiertenkonferenz" />
    </label>
    <label class="f">Von
      <input type="text" bind:value={tag.von} placeholder="Ansbach" />
    </label>
    <label class="f">Nach
      <input type="text" bind:value={tag.nach} placeholder="Augsburg" />
    </label>
  </div>

  <h3 style="margin: 16px 0 8px; font-size: 1rem">Fahrtkosten</h3>
  <div class="grid">
    <label class="f">Eigenes Fahrzeug
      <select bind:value={tag.fahrzeug}>
        <option value="">Keines</option>
        <option value="pkw">Pkw (0,30 € / km)</option>
        <option value="motorrad">Motorrad / Motorroller (0,20 € / km)</option>
        <option value="moped">Moped / Mofa (0,20 € / km)</option>
      </select>
    </label>
    <label class="f">Autokennzeichen {tag.fahrzeug ? '(Pflicht)' : ''}
      <input type="text" bind:value={tag.kennzeichen} placeholder="AN-GR 123" disabled={!tag.fahrzeug} />
    </label>
    <label class="f">Kilometer
      <input type="text" inputmode="decimal" bind:value={tag.km} placeholder="0" disabled={!tag.fahrzeug} />
    </label>
    <label class="f">Öffentl. Verkehrsmittel lt. Beleg (€)
      <input type="text" inputmode="decimal" bind:value={tag.oepnv} placeholder="0,00" />
    </label>
    <label class="f">Park- / Straßengebühren (€)
      <input type="text" inputmode="decimal" bind:value={tag.parken} placeholder="0,00" />
    </label>
  </div>

  <h3 style="margin: 16px 0 8px; font-size: 1rem">Übernachtung (nur mit Beleg, ohne Frühstück)</h3>
  <div class="grid">
    <label class="f">Betrag laut Hotelrechnung (€)
      <input type="text" inputmode="decimal" bind:value={tag.uebernachtung} placeholder="0,00" />
    </label>
    <label class="f">Darin enthaltenes Frühstück (€)
      <input type="text" inputmode="decimal" bind:value={tag.fruehstueckAbzug} placeholder="0,00" />
    </label>
  </div>

  <h3 style="margin: 16px 0 8px; font-size: 1rem">Verpflegung: heute erhalten (wird abgezogen)</h3>
  <div class="checks">
    <label class="check"><input type="checkbox" bind:checked={tag.fruehstueck} /> Frühstück (−5,60 €)</label>
    <label class="check"><input type="checkbox" bind:checked={tag.mittag} /> Mittagessen (−11,20 €)</label>
    <label class="check"><input type="checkbox" bind:checked={tag.abend} /> Abendessen (−11,20 €)</label>
  </div>

  <div style="margin-top: 14px">
    <div class="sumline"><span>Fahrtkosten</span><b>{formatEuro(ergebnis.fahrt)}</b></div>
    <div class="sumline"><span>Übernachtung</span><b>{formatEuro(ergebnis.uebernachtung)}</b></div>
    <div class="sumline"><span>Verpflegung</span><b>{formatEuro(ergebnis.verpflegung)}</b></div>
  </div>

  {#if meldungen.length > 0}
    <ul class="meldungen" style="margin-top: 12px">
      {#each meldungen as m}
        <li class={m.stufe}>{m.text}</li>
      {/each}
    </ul>
  {/if}
</div>
