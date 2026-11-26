let catalog;
let result;
let activeGroup;
let selected = [];
let discounts = { boatPct: 0, accessoriesPct: 0 };
let currentSavedCode = null;

const euro = (value) => new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(Number(value || 0));

async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Errore HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch (_) {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

async function init() {
  try {
    catalog = await api('/api/v1/models/BS120OB');
    activeGroup = catalog.groups[0].code;
    selected = [];
    discounts = { boatPct: 0, accessoriesPct: 0 };
    localStorage.removeItem('itb-cpq-poc-v2');

    document.querySelector('#boatDiscount').value = 0;
    document.querySelector('#accDiscount').value = 0;
    wire();
    await evaluate();
  } catch (error) {
    showFatal(error.message);
  }
}

function showFatal(message) {
  const errors = document.querySelector('#errors');
  if (errors) errors.innerHTML = `<div class="error">Impossibile inizializzare il configuratore: ${escapeHtml(message)}</div>`;
}

function wire() {
  document.querySelector('#reset').onclick = resetConfiguration;
  document.querySelector('#boatDiscount').onchange = onDiscountChange;
  document.querySelector('#accDiscount').onchange = onDiscountChange;
  document.querySelector('#saveServer').onclick = saveOnline;
  document.querySelector('#generatePdf').onclick = generatePdf;
  ['firstName','lastName','configurationName'].forEach(id => document.querySelector('#'+id).addEventListener('input', updateSaveValidation));
  updateSaveValidation();
  document.querySelector('#findSaved').onclick = findSaved;
}

function resetConfiguration() {
  selected = [];
  discounts = { boatPct: 0, accessoriesPct: 0 };
  currentSavedCode = null;
  activeGroup = catalog.groups[0].code;
  document.querySelector('#boatDiscount').value = 0;
  document.querySelector('#accDiscount').value = 0;
  document.querySelector('#firstName').value = '';
  document.querySelector('#lastName').value = '';
  document.querySelector('#company').value = '';
  document.querySelector('#configurationName').value = '';
  document.querySelector('#savedPanel').innerHTML = '';
  evaluate();
}

function onDiscountChange(event) {
  const key = event.target.id === 'boatDiscount' ? 'boatPct' : 'accessoriesPct';
  discounts[key] = Number(event.target.value) || 0;
  evaluate();
}

async function evaluate() {
  try {
    result = await api('/api/v1/configurations/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelCode: 'BS120OB', selectedOptions: selected, discounts })
    });
    render();
  } catch (error) {
    showFatal(error.message);
  }
}

function toggle(code) {
  const option = result.options.find((item) => item.code === code);
  if (!option || (!option.available && !option.selected)) return;

  const selecting = !selected.includes(code);
  selected = selecting ? [...selected, code] : selected.filter((item) => item !== code);
  if (selecting && option.group === 'ENGINES') activeGroup = 'PROPULSION';
  evaluate();
}

function relevantViolation(violation) {
  return violation.scopeGroup === activeGroup || (violation.scopeGroups || []).includes(activeGroup);
}

function selectedEngine() {
  return result.options.find((option) => option.group === 'ENGINES' && option.selected);
}

function sectionGuidance() {
  const engine = selectedEngine();
  if (activeGroup === 'ENGINES') {
    return engine
      ? `Motorizzazione selezionata: <strong>${escapeHtml(engine.name)}</strong>. Puoi cambiarla scegliendone un'altra.`
      : 'Scegli una motorizzazione per proseguire con gli accessori compatibili.';
  }
  if (activeGroup === 'PROPULSION') {
    return engine
      ? `Gli accessori disponibili sono filtrati in base a <strong>${escapeHtml(engine.name)}</strong>.`
      : 'Seleziona prima una motorizzazione: i joystick compatibili verranno abilitati automaticamente.';
  }
  if (activeGroup === 'AUDIO') {
    return "I due sistemi audio sono alternativi: selezionandone uno, l'altro viene disabilitato.";
  }
  if (activeGroup === 'RAYMARINE' || activeGroup === 'GARMIN') {
    return "Raymarine e Garmin sono pacchetti alternativi. All'interno del pacchetto scelto puoi selezionare piu componenti.";
  }
  return '';
}

function render() {
  renderNavigation();
  renderGroup();
  renderSummary();
}

function renderNavigation() {
  const nav = document.querySelector('#nav');
  nav.innerHTML = '';
  catalog.groups.forEach((group) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = group.label;
    button.className = group.code === activeGroup ? 'active' : '';
    button.onclick = () => {
      activeGroup = group.code;
      render();
    };
    nav.appendChild(button);
  });
}

function renderGroup() {
  const group = catalog.groups.find((item) => item.code === activeGroup);
  document.querySelector('#groupTitle').textContent = group.label;
  document.querySelector('#groupHint').textContent = group.max === 1
    ? (group.min === 1 ? 'Seleziona una sola opzione' : 'Selezione singola')
    : 'Selezione multipla';

  const messages = [];
  const guidance = sectionGuidance();
  if (guidance) messages.push(`<div class="guidance">${guidance}</div>`);
  result.violations.filter(relevantViolation).forEach((violation) => {
    messages.push(`<div class="error">${escapeHtml(violation.message)}</div>`);
  });
  document.querySelector('#errors').innerHTML = messages.join('');

  document.querySelector('#cards').innerHTML = result.options
    .filter((option) => option.group === activeGroup)
    .map((option) => `
      <article class="card ${option.selected ? 'selected' : ''} ${!option.available && !option.selected ? 'disabled' : ''}" onclick="toggle('${option.code}')">
        <img src="${option.image}" alt="${escapeHtml(option.name)}" onerror="this.src='/static/assets/boat.png'">
        <div class="body">
          <h3>${escapeHtml(option.name)}</h3>
          <div class="price">${euro(option.price)}</div>
          <div class="status">${option.selected ? 'Selezionato' : option.available ? 'Disponibile' : escapeHtml(option.disabledReason || 'Non disponibile')}</div>
        </div>
      </article>`)
    .join('');
}

function renderSummary() {
  const picks = result.options.filter((option) => option.selected);
  document.querySelector('#selected').innerHTML = picks.length
    ? picks.map((option) => `<div class="pick"><span>${escapeHtml(option.name)}</span><b>${euro(option.price)}</b></div>`).join('')
    : '<p>Nessuna opzione selezionata.</p>';

  const pricing = result.pricing;
  document.querySelector('#pricing').innerHTML = `
    <div class="sub"><span>Imbarcazione</span><b>${euro(pricing.boatSubtotal)}</b></div>
    <div class="sub"><span>Accessori</span><b>${euro(pricing.accessoriesSubtotal)}</b></div>
    <div class="sub"><span>Sconti</span><b>-${euro(pricing.discountTotal)}</b></div>
    <div class="total"><span>Totale</span><span>${euro(pricing.netTotal)}</span></div>`;
}

function requiredFields() {
  return [
    { id: 'firstName', message: 'Inserisci il nome.' },
    { id: 'lastName', message: 'Inserisci il cognome.' },
    { id: 'configurationName', message: 'Inserisci un nome per la configurazione.' }
  ];
}

function updateSaveValidation() {
  let valid = true;
  requiredFields().forEach(({ id }) => {
    const input = document.querySelector('#' + id);
    const empty = !input.value.trim();
    input.classList.toggle('field-invalid', empty && input.dataset.touched === 'true');
    valid = valid && !empty;
  });
  document.querySelector('#saveServer').disabled = !valid;
}

function validateSavedFields() {
  let firstInvalid = null;
  requiredFields().forEach(({ id, message }) => {
    const input = document.querySelector('#' + id);
    input.dataset.touched = 'true';
    const empty = !input.value.trim();
    input.classList.toggle('field-invalid', empty);
    let error = document.querySelector('#' + id + '-error');
    if (!error) {
      error = document.createElement('span');
      error.id = id + '-error';
      error.className = 'field-error';
      input.insertAdjacentElement('afterend', error);
    }
    error.textContent = empty ? message : '';
    if (empty && !firstInvalid) firstInvalid = input;
  });
  updateSaveValidation();
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function savedPayload() {
  if (!validateSavedFields()) throw new Error('VALIDATION_FIELDS');
  const firstName = document.querySelector('#firstName').value.trim();
  const lastName = document.querySelector('#lastName').value.trim();
  const configurationName = document.querySelector('#configurationName').value.trim();
  return {
    configurationName,
    customer: {
      firstName,
      lastName,
      company: document.querySelector('#company').value.trim()
    },
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
    const url = currentSavedCode
      ? `/api/v1/saved-configurations/${encodeURIComponent(currentSavedCode)}`
      : '/api/v1/saved-configurations';
    const saved = await api(url, {
      method: currentSavedCode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    currentSavedCode = saved.configurationCode;
    alert(`Configurazione salvata: ${currentSavedCode}`);
    await findSaved(false);
  } catch (error) {
    alert(error.message);
  }
}

async function findSaved(askQuery = true) {
  try {
    const query = askQuery ? (prompt('Cerca per cognome, azienda, codice o nome configurazione:', '') ?? '') : '';
    const data = await api(`/api/v1/saved-configurations?query=${encodeURIComponent(query)}`);
    document.querySelector('#savedPanel').innerHTML = data.items.length
      ? data.items.map(savedCard).join('')
      : '<p>Nessuna configurazione trovata.</p>';
  } catch (error) {
    alert(error.message);
  }
}

function savedCard(item) {
  const customer = item.customer || {};
  const company = customer.company ? ` - ${escapeHtml(customer.company)}` : '';
  const date = item.updatedAt ? new Date(item.updatedAt).toLocaleString('it-IT') : '';
  return `
    <div class="saved-item">
      <b>${escapeHtml(item.configurationCode)} - ${escapeHtml(item.configurationName)}</b>
      <div>${escapeHtml(customer.firstName || '')} ${escapeHtml(customer.lastName || '')}${company}</div>
      <div>${euro(item.pricingSnapshot?.netTotal || 0)} - ${escapeHtml(date)}</div>
      <div class="saved-actions">
        <button type="button" onclick="openSaved('${item.configurationCode}')">Apri</button>
        <button type="button" onclick="deleteSaved('${item.configurationCode}')">Elimina</button>
      </div>
    </div>`;
}

async function openSaved(code) {
  try {
    const item = await api(`/api/v1/saved-configurations/${encodeURIComponent(code)}`);
    currentSavedCode = item.configurationCode;
    selected = item.selectedOptions || [];
    discounts = item.discounts || { boatPct: 0, accessoriesPct: 0 };
    document.querySelector('#firstName').value = item.customer?.firstName || '';
    document.querySelector('#lastName').value = item.customer?.lastName || '';
    document.querySelector('#company').value = item.customer?.company || '';
    document.querySelector('#configurationName').value = item.configurationName || '';
    document.querySelector('#boatDiscount').value = discounts.boatPct;
    document.querySelector('#accDiscount').value = discounts.accessoriesPct;
    activeGroup = catalog.groups[0].code;
    await evaluate();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteSaved(code) {
  if (!confirm(`Eliminare ${code}?`)) return;
  try {
    await api(`/api/v1/saved-configurations/${encodeURIComponent(code)}`, { method: 'DELETE' });
    if (currentSavedCode === code) currentSavedCode = null;
    await findSaved(false);
  } catch (error) {
    alert(error.message);
  }
}


async function generatePdf() {
  try {
    const payload = savedPayload();
    const response = await fetch('/api/v1/documents/quote.pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let message = 'Generazione PDF non riuscita';
      try { message = (await response.json()).detail || message; } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (payload.configurationName || 'configurazione').replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf';
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    if (error.message !== 'VALIDATION_FIELDS') alert(error.message);
  }
}
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
