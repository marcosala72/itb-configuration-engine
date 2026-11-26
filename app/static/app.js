let catalog, result, activeGroup, selected = [], discounts = { boatPct: 0, accessoriesPct: 0 };

const euro = n => new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(n);

async function init() {
  catalog = await fetch('/api/v1/models/BS120OB').then(r => r.json());
  activeGroup = catalog.groups[0].code;

  const saved = null;
  if (saved) {
    try {
      const state = JSON.parse(saved);
      selected = state.selectedOptions || [];
      discounts = state.discounts || discounts;
    } catch {}
  }

  document.querySelector('#boatDiscount').value = discounts.boatPct;
  document.querySelector('#accDiscount').value = discounts.accessoriesPct;
  wire();
  await evaluate();
}

function wire() {
  document.querySelector('#saveServer').onclick = saveOnline;
  document.querySelector('#findSaved').onclick = findSaved;
  document.querySelector('#reset').onclick = () => {
    selected = [];
    discounts = { boatPct: 0, accessoriesPct: 0 };
    document.querySelector('#boatDiscount').value = 0;
    document.querySelector('#accDiscount').value = 0;
    activeGroup = 'ENGINES';
    evaluate();
  };

  for (const id of ['boatDiscount', 'accDiscount']) {
    document.querySelector('#' + id).onchange = e => {
      discounts[id === 'boatDiscount' ? 'boatPct' : 'accessoriesPct'] = Number(e.target.value) || 0;
      evaluate();
    };
  }

  document.querySelector('#save').onclick = () => {
    const blob = new Blob([JSON.stringify({
      schemaVersion: '1.0',
      modelCode: 'BS120OB',
      catalogVersion: catalog.model.catalogVersion,
      selectedOptions: selected,
      discounts
    }, null, 2)], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'BS120OB-configurazione.json';
    a.click();
  };

  document.querySelector('#load').onchange = async e => {
    const state = JSON.parse(await e.target.files[0].text());
    selected = state.selectedOptions || [];
    discounts = state.discounts || discounts;
    document.querySelector('#boatDiscount').value = discounts.boatPct;
    document.querySelector('#accDiscount').value = discounts.accessoriesPct;
    evaluate();
  };
}

async function evaluate() {
  result = await fetch('/api/v1/configurations/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelCode: 'BS120OB',
      selectedOptions: selected,
      discounts
    })
  }).then(r => r.json());

  localStorage.setItem('itb-cpq-poc-v2', JSON.stringify({ selectedOptions: selected, discounts }));
  render();
}

function toggle(code) {
  const option = result.options.find(x => x.code === code);
  if (!option.available && !option.selected) return;

  const selecting = !selected.includes(code);
  selected = selecting ? [...selected, code] : selected.filter(x => x !== code);

  // Guided selling: una volta scelta la motorizzazione, porta alla sezione successiva.
  if (selecting && option.group === 'ENGINES') activeGroup = 'PROPULSION';

  evaluate();
}

function relevantViolation(v) {
  return v.scopeGroup === activeGroup || (v.scopeGroups || []).includes(activeGroup);
}

function selectedEngine() {
  return result.options.find(o => o.group === 'ENGINES' && o.selected);
}

function sectionGuidance() {
  const engine = selectedEngine();

  if (activeGroup === 'ENGINES') {
    return engine
      ? `Motorizzazione selezionata: <strong>${engine.name}</strong>. Puoi cambiarla scegliendone un'altra.`
      : 'Scegli una motorizzazione per proseguire con gli accessori compatibili.';
  }

  if (activeGroup === 'PROPULSION') {
    if (!engine) return 'Seleziona prima una motorizzazione: i joystick compatibili verranno abilitati automaticamente.';
    return `Gli accessori disponibili sono filtrati in base a <strong>${engine.name}</strong>.`;
  }

  if (activeGroup === 'AUDIO') {
    return 'I due sistemi audio sono alternativi: selezionandone uno, lâ€™altro viene disabilitato.';
  }

  if (activeGroup === 'RAYMARINE' || activeGroup === 'GARMIN') {
    return 'Raymarine e Garmin sono pacchetti alternativi. Allâ€™interno del pacchetto scelto puoi selezionare piÃ¹ componenti.';
  }

  return '';
}

function render() {
  const nav = document.querySelector('#nav');
  nav.innerHTML = '';

  catalog.groups.forEach(group => {
    const button = document.createElement('button');
    button.textContent = group.label;
    button.className = group.code === activeGroup ? 'active' : '';
    button.onclick = () => {
      activeGroup = group.code;
      render();
    };
    nav.appendChild(button);
  });

  const group = catalog.groups.find(x => x.code === activeGroup);
  document.querySelector('#groupTitle').textContent = group.label;
  document.querySelector('#groupHint').textContent = group.max === 1
    ? (group.min === 1 ? 'Seleziona una sola opzione' : 'Selezione singola')
    : 'Selezione multipla';

  const guidance = sectionGuidance();
  const violations = result.violations.filter(relevantViolation);
  document.querySelector('#errors').innerHTML = [
    guidance ? `<div style="background:#eaf5f7;color:#155d68;padding:10px 12px;border-radius:8px;margin:8px 0;border:1px solid #c9e6ea">${guidance}</div>` : '',
    ...violations.map(v => `<div class="error">${v.message}</div>`)
  ].join('');

  document.querySelector('#cards').innerHTML = result.options
    .filter(o => o.group === activeGroup)
    .map(o => `
      <article class="card ${o.selected ? 'selected' : ''} ${!o.available && !o.selected ? 'disabled' : ''}" onclick="toggle('${o.code}')">
        <img src="${o.image}" alt="${o.name}" onerror="this.src='/static/assets/boat.png'">
        <div class="body">
          <h3>${o.name}</h3>
          <div class="price">${euro(o.price)}</div>
          <div class="status">${o.selected ? 'Selezionato' : o.available ? 'Disponibile' : o.disabledReason}</div>
        </div>
      </article>`)
    .join('');

  const picks = result.options.filter(o => o.selected);
  document.querySelector('#selected').innerHTML = picks.length
    ? picks.map(o => `<div class="pick"><span>${o.name}</span><b>${euro(o.price)}</b></div>`).join('')
    : '<p>Nessuna opzione selezionata.</p>';

  const p = result.pricing;
  document.querySelector('#pricing').innerHTML = `
    <div class="sub"><span>Imbarcazione</span><b>${euro(p.boatSubtotal)}</b></div>
    <div class="sub"><span>Accessori</span><b>${euro(p.accessoriesSubtotal)}</b></div>
    <div class="sub"><span>Sconti</span><b>-${euro(p.discountTotal)}</b></div>
    <div class="total"><span>Totale</span><span>${euro(p.netTotal)}</span></div>`;
}


let currentSavedCode = null;

function savedPayload() {
  const firstName = document.querySelector('#firstName').value.trim();
  const lastName = document.querySelector('#lastName').value.trim();
  const configurationName = document.querySelector('#configurationName').value.trim();
  if (!firstName || !lastName || !configurationName) throw new Error('Compila nome, cognome e nome configurazione.');
  return {
    configurationName,
    customer: { firstName, lastName, company: document.querySelector('#company').value.trim() },
    modelCode: 'BS120OB',
    catalogVersion: catalog.model.catalogVersion,
    selectedOptions: selected,
    discounts,
    pricingSnapshot: result.pricing
  };
}

async function saveOnline() {
  try {
    const payload = savedPayload();
    const url = currentSavedCode ? `/api/v1/saved-configurations/${currentSavedCode}` : '/api/v1/saved-configurations';
    const response = await fetch(url, { method: currentSavedCode ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).detail || 'Salvataggio non riuscito');
    const saved = await response.json();
    currentSavedCode = saved.configurationCode;
    alert(`Configurazione salvata: ${currentSavedCode}`);
    await findSaved();
  } catch (error) { alert(error.message); }
}

async function findSaved() {
  const query = prompt('Cerca per cognome, azienda, codice o nome configurazione:', '') ?? '';
  const response = await fetch(`/api/v1/saved-configurations?query=${encodeURIComponent(query)}`);
  if (!response.ok) { alert('Ricerca non disponibile'); return; }
  const data = await response.json();
  document.querySelector('#savedPanel').innerHTML = data.items.length ? data.items.map(item => `<div class="saved-item"><b>${item.configurationCode} - ${item.configurationName}</b>${item.customer.firstName} ${item.customer.lastName}${item.customer.company ? '  -  '+item.customer.company : ''}<div>${euro(item.pricingSnapshot?.netTotal || 0)}  -  ${new Date(item.updatedAt).toLocaleString('it-IT')}</div><div class="saved-actions"><button onclick="openSaved('${item.configurationCode}')">Apri</button><button onclick="deleteSaved('${item.configurationCode}')">Elimina</button></div></div>`).join('') : '<p>Nessuna configurazione trovata.</p>';
}

async function openSaved(code) {
  const response = await fetch(`/api/v1/saved-configurations/${code}`);
  if (!response.ok) { alert('Configurazione non trovata'); return; }
  const item = await response.json();
  currentSavedCode = item.configurationCode;
  selected = item.selectedOptions || [];
  discounts = item.discounts || {boatPct:0, accessoriesPct:0};
  document.querySelector('#firstName').value = item.customer.firstName || '';
  document.querySelector('#lastName').value = item.customer.lastName || '';
  document.querySelector('#company').value = item.customer.company || '';
  document.querySelector('#configurationName').value = item.configurationName || '';
  document.querySelector('#boatDiscount').value = discounts.boatPct;
  document.querySelector('#accDiscount').value = discounts.accessoriesPct;
  await evaluate();
}

async function deleteSaved(code) {
  if (!confirm(`Eliminare ${code}?`)) return;
  const response = await fetch(`/api/v1/saved-configurations/${code}`, {method:'DELETE'});
  if (!response.ok) { alert('Eliminazione non riuscita'); return; }
  if (currentSavedCode === code) currentSavedCode = null;
  await findSaved();
}
init();

