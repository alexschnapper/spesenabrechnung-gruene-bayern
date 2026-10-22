<script lang="ts">
  import { berechne } from './logic/calc';
  import { leereAbrechnung, neueSonstige, neuerTag, normalisiere } from './logic/defaults';
  import { formatEuro } from './logic/money';
  import { bicBereinigen, bicGueltig, nurZiffern, plzGueltig, vollerName } from './logic/person';
  import { ibanGueltig, pruefe } from './logic/validate';
  import { FUNKTIONEN } from './config/funktionen';
  import type { Abrechnung } from './logic/types';
  import { erzeugePdf } from './pdf/pdf';
  import { herunterladen, ladeDatei, ladeEntwurf, loescheEntwurf, speichereEntwurf } from './storage';
  import TagCard from './ui/TagCard.svelte';

  function heuteIso(): string {
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  }
  const heute = heuteIso();

  let data = $state<Abrechnung>(ladeEntwurf() ?? leereAbrechnung());
  let importFehler = $state('');
  let erzeugt = $state(false);

  const ergebnis = $derived(berechne(data));
  const meldungen = $derived(pruefe(data, ergebnis, heute));
  const fehler = $derived(meldungen.filter((m) => m.stufe === 'fehler'));
  const allgemein = $derived(meldungen.filter((m) => !m.tagId));

  $effect(() => {
    speichereEntwurf($state.snapshot(data) as Abrechnung);
  });

  function tagHinzu() {
    const letzter = data.tage[data.tage.length - 1];
    let datum = '';
    if (letzter?.datum) {
      const [y, m, d] = letzter.datum.split('-').map(Number);
      datum = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    }
    data.tage.push(
      neuerTag({
        datum,
        anlass: letzter?.anlass ?? '',
        von: letzter?.nach ?? '',
        nach: letzter?.von ?? '',
        fahrzeug: letzter?.fahrzeug ?? '',
        kennzeichen: letzter?.kennzeichen ?? '',
        tagTyp: letzter ? 'abreise' : 'eintaegig',
      }),
    );
  }

  function tagWeg(id: string) {
    data.tage = data.tage.filter((t) => t.id !== id);
  }

  async function pdf(entwurf: boolean) {
    const bytes = await erzeugePdf($state.snapshot(data) as Abrechnung, { entwurf });
    const name = (vollerName(data) || 'Abrechnung').replace(/[^\p{L}\p{N}]+/gu, '_');
    herunterladen(bytes as unknown as BlobPart, `Spesenabrechnung_${name}_${heute}.pdf`, 'application/pdf');
    erzeugt = true;
  }

  function jsonExport() {
    const name = (vollerName(data) || 'Abrechnung').replace(/[^\p{L}\p{N}]+/gu, '_');
    herunterladen(JSON.stringify($state.snapshot(data), null, 2), `Spesenabrechnung_${name}.json`, 'application/json');
  }

  async function jsonImport(ev: Event) {
    importFehler = '';
    const input = ev.currentTarget as HTMLInputElement;
    const datei = input.files?.[0];
    if (!datei) return;
    try {
      data = ladeDatei(await datei.text());
    } catch {
      importFehler = 'Die Datei konnte nicht gelesen werden.';
    }
    input.value = '';
  }

  function alleLoeschen() {
    if (confirm('Alle eingegebenen Daten (auch IBAN und Anschrift) in diesem Browser löschen?')) {
      loescheEntwurf();
      data = normalisiere(null);
      erzeugt = false;
    }
  }
</script>

<main>
  <h1>Spesenabrechnung für Delegierte</h1>
  <p class="sub">Bündnis 90/DIE GRÜNEN Bayern · Kreisverband Ansbach Stadt und Land · Sätze 2026</p>

  <div class="notice">
    Inoffizielles Hilfsmittel. Alle Eingaben bleiben in Ihrem Browser und werden nirgendwohin gesendet. Die erzeugte PDF
    bildet das Formular „Spesenabrechnung LV Bayern“ nach. Bitte <b>drucken, unterschreiben</b> und mit den
    <b>Originalbelegen</b> bei der Schatzmeisterei einreichen.
  </div>

  <section>
    <h2>Persönliche Angaben</h2>
    <div class="grid">
      <label class="f">Vorname
        <input type="text" bind:value={data.vorname} autocomplete="given-name" />
      </label>
      <label class="f">Nachname
        <input type="text" bind:value={data.nachname} autocomplete="family-name" />
      </label>
      <label class="f span2">Straße und Hausnummer
        <input type="text" bind:value={data.strasse} autocomplete="street-address" />
      </label>
      <label class="f">PLZ (5 Ziffern)
        <input
          type="text"
          inputmode="numeric"
          maxlength="5"
          autocomplete="postal-code"
          value={data.plz}
          oninput={(e) => {
            data.plz = nurZiffern(e.currentTarget.value);
            e.currentTarget.value = data.plz;
          }}
        />
        {#if data.plz && !plzGueltig(data.plz)}
          <span class="hint">Bitte genau 5 Ziffern eingeben ({data.plz.length} von 5).</span>
        {/if}
      </label>
      <label class="f">Wohnort
        <input type="text" bind:value={data.wohnort} autocomplete="address-level2" />
      </label>
      <label class="f span2">E-Mail
        <input type="email" bind:value={data.email} autocomplete="email" />
      </label>
      <label class="f">Funktion
        <select bind:value={data.funktion}>
          <option value="">Bitte wählen</option>
          {#each FUNKTIONEN as fn}
            <option value={fn.id}>{fn.label}</option>
          {/each}
        </select>
      </label>
      <label class="f">Anlass
        <input type="text" bind:value={data.anlass} placeholder="z. B. Landesdelegiertenkonferenz" />
      </label>
      <label class="f">Bank
        <input type="text" bind:value={data.bank} />
      </label>
      <label class="f">BIC (8 oder 11 Zeichen)
        <input
          type="text"
          maxlength="11"
          autocapitalize="characters"
          autocomplete="off"
          value={data.bic}
          oninput={(e) => {
            data.bic = bicBereinigen(e.currentTarget.value);
            e.currentTarget.value = data.bic;
          }}
        />
        {#if data.bic && !bicGueltig(data.bic)}
          <span class="hint">Der BIC hat 8 oder 11 Zeichen ({data.bic.length} eingegeben), z. B. COBADEFFXXX.</span>
        {/if}
      </label>
      <label class="f span2">IBAN
        <input type="text" bind:value={data.iban} placeholder="DE00 0000 0000 0000 0000 00" />
        {#if data.iban && !ibanGueltig(data.iban)}
          <span class="hint">Die IBAN ist noch ungültig (Prüfziffer oder Länge).</span>
        {/if}
      </label>
    </div>
  </section>

  <h2 style="margin: 0 0 12px">Reisetage</h2>
  {#each data.tage as t, i (t.id)}
    <TagCard
      bind:tag={data.tage[i]}
      nr={i + 1}
      ergebnis={ergebnis.tage[i]}
      meldungen={meldungen.filter((m) => m.tagId === t.id)}
      onremove={() => tagWeg(t.id)}
    />
  {/each}
  <p><button type="button" onclick={tagHinzu}>+ Reisetag hinzufügen</button></p>

  <section>
    <h2>Sonstige Aufwendungen (nur gegen Beleg)</h2>
    {#each data.sonstige as s, i (s.id)}
      <div class="card">
        <div class="tag-head">
          <strong>Position {i + 1}</strong>
          <button type="button" class="link danger" onclick={() => (data.sonstige = data.sonstige.filter((x) => x.id !== s.id))}>Entfernen</button>
        </div>
        <div class="grid">
          <label class="f">Art
            <select bind:value={data.sonstige[i].art}>
              <option value="porto">Porto / Bürobedarf</option>
              <option value="taxi">Taxi (Ausnahme, mit Begründung)</option>
              <option value="telefon">Telefon / Internet (20 %, max. 20 € / Monat)</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label class="f">Betrag laut Beleg (€)
            <input type="text" inputmode="decimal" bind:value={data.sonstige[i].betrag} placeholder="0,00" />
          </label>
          <label class="f span2">Beschreibung
            <input type="text" bind:value={data.sonstige[i].beschreibung} />
          </label>
          <label class="f span2">Begründung / Zusammenhang mit Auftrag oder Wahl {s.art === 'taxi' ? '(Pflicht)' : ''}
            <input type="text" bind:value={data.sonstige[i].begruendung} />
          </label>
        </div>
      </div>
    {/each}
    <button type="button" onclick={() => data.sonstige.push(neueSonstige())}>+ Position hinzufügen</button>
  </section>

  <section>
    <h2>Spende und Unterschrift</h2>
    <div class="checks" style="flex-direction: column; gap: 4px">
      <label class="check"><input type="radio" name="spende" value="keine" bind:group={data.spendeModus} /> Keine Spende, volle Auszahlung</label>
      <label class="check"><input type="radio" name="spende" value="teilweise" bind:group={data.spendeModus} /> Teilweiser Verzicht zugunsten einer Spende</label>
      <label class="check"><input type="radio" name="spende" value="ganz" bind:group={data.spendeModus} /> Vollständiger Verzicht (alles als Spende)</label>
    </div>
    {#if data.spendeModus === 'teilweise'}
      <label class="f" style="max-width: 240px; margin-top: 8px">Spendenbetrag (€)
        <input type="text" inputmode="decimal" bind:value={data.spendeBetrag} placeholder="0,00" />
      </label>
    {/if}
    <label class="check" style="margin-top: 8px">
      <input type="checkbox" bind:checked={data.verpflegungSpende} />
      Nicht geltend gemachter Verpflegungsmehraufwand darf als Spende behandelt werden
    </label>
    <p class="small">Eine Verzichtsspende muss innerhalb von drei Monaten nach Entstehen des Anspruchs erklärt werden und zählt im Jahr des Unterschriftsdatums.</p>
    <div class="grid" style="margin-top: 8px">
      <label class="f">Ort
        <input type="text" bind:value={data.ort} />
      </label>
      <label class="f">Datum der Unterschrift
        <input type="date" bind:value={data.unterschriftDatum} />
      </label>
    </div>
  </section>

  <section>
    <h2>Zusammenfassung</h2>
    <table class="summe">
      <tbody>
        <tr><td>Fahrtkosten</td><td>{formatEuro(ergebnis.fahrt)}</td></tr>
        <tr><td>Verpflegung</td><td>{formatEuro(ergebnis.verpflegung)}</td></tr>
        <tr><td>Übernachtung</td><td>{formatEuro(ergebnis.uebernachtung)}</td></tr>
        <tr><td>Sonstige Aufwendungen</td><td>{formatEuro(ergebnis.sonstige)}</td></tr>
        <tr class="fett"><td>Summe der Aufwendungen</td><td>{formatEuro(ergebnis.summe)}</td></tr>
        <tr><td>abzüglich einer Spende</td><td>{formatEuro(ergebnis.spende)}</td></tr>
        <tr class="fett"><td>Auszahlung</td><td>{formatEuro(ergebnis.auszahlung)}</td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2>Prüfung</h2>
    {#if allgemein.length === 0 && fehler.length === 0}
      <p class="ok">Keine Auffälligkeiten.</p>
    {/if}
    {#if allgemein.length > 0}
      <ul class="meldungen">
        {#each allgemein as m}
          <li class={m.stufe}>{m.text}</li>
        {/each}
      </ul>
    {/if}
    {#if fehler.length > allgemein.filter((m) => m.stufe === 'fehler').length}
      <p class="small">Weitere Fehler stehen direkt bei den betroffenen Reisetagen.</p>
    {/if}
  </section>

  <section>
    <h2>PDF erzeugen</h2>
    <div class="row">
      <button type="button" class="primary" disabled={fehler.length > 0} onclick={() => pdf(false)}>PDF herunterladen</button>
      {#if fehler.length > 0}
        <span class="small">{fehler.length} Fehler müssen erst behoben werden.</span>
        <button type="button" class="link" onclick={() => pdf(true)}>Unvollständigen Entwurf trotzdem erzeugen</button>
      {/if}
    </div>
    {#if erzeugt}
      <div class="card" style="margin-top: 12px">
        <b>Vor dem Einreichen:</b>
        <ul style="margin: 8px 0 0; padding-left: 20px">
          <li><b>Original-Belege</b> beilegen (Papier ist für die Schatzmeisterei am besten)</li>
          <li><b>Autokennzeichen</b> angegeben</li>
          <li>Hotelfrühstück aus der Rechnung herausgerechnet</li>
          <li><b>Datum und Unterschrift</b> auf dem Ausdruck nicht vergessen</li>
          <li>Spenden sind gerne gesehen</li>
        </ul>
      </div>
    {/if}
  </section>

  <section>
    <h2>Daten</h2>
    <p class="small">Der Entwurf wird automatisch in diesem Browser gespeichert. Mit der Sicherung können Sie ihn auf ein anderes Gerät übertragen.</p>
    <div class="row">
      <button type="button" onclick={jsonExport}>Sicherung herunterladen (JSON)</button>
      <label class="row" style="gap: 6px">
        <span class="small">Sicherung laden:</span>
        <input type="file" accept="application/json,.json" onchange={jsonImport} />
      </label>
      <button type="button" class="danger" onclick={alleLoeschen}>Alle Daten löschen</button>
    </div>
    {#if importFehler}<p style="color: var(--err)">{importFehler}</p>{/if}
  </section>

  <footer>
    Quellen: Erstattungsordnung Bündnis 90/DIE GRÜNEN Landesverband Bayern (ab 2022), Formular Spesenabrechnung LV Bayern.
    Inoffizielles Projekt ohne Gewähr, <a href="beispiel-abrechnung.pdf">Beispiel-PDF ansehen</a>.
  </footer>
</main>
