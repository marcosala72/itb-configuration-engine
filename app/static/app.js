let catalog = null;
let result = null;
let activeGroup = null;
let selected = [];
let discounts = { boatPct: 0, accessoriesPct: 0 };
let currentSavedCode = null;
let uiLanguage = localStorage.getItem('itb-ui-language') || 'EN';

const I18N = {
  EN: {
    subtitle: 'API-first demonstrator, independent from the user interface.',
    configuration: 'Configuration', reset: 'Reset', firstName: 'First name *', lastName: 'Last name *',
    company: 'Company', configurationName: 'Configuration name *', configurationPlaceholder: 'E.g. BS 120 demo customer',
    boatDiscount: 'Boat discount %', accessoriesDiscount: 'Accessories discount %', saveOnline: 'Save online',
    generatePdf: 'Generate PDF', searchSaved: 'Search saved', multiple: 'Multiple selection', single: 'Single selection', one: 'Select one option',
    selected: 'Selected', available: 'Available', unavailable: 'Not available', noSelection: 'No option selected.',
    boat: 'Boat', accessories: 'Accessories', discounts: 'Discounts', total: 'Total',
    saved: 'Configuration saved:', searchPrompt: 'Search by last name, company, code or configuration name:',
    noneSaved: 'No saved configuration found.', open: 'Open', delete: 'Delete',
    requiredFirst: 'Enter the first name.', requiredLast: 'Enter the last name.', requiredConfig: 'Enter a configuration name.',
    deleteConfirm: 'Delete', pdfFailed: 'PDF generation failed', initializationFailed: 'Unable to initialize the configurator:',
    engineNone: 'Select an engine option to continue with compatible accessories.', enginePrefix: 'Selected engine:',
    engineSuffix: 'You can change it by selecting another one.', propulsionNone: 'Select an engine first: compatible joysticks will be enabled automatically.',
    propulsionPrefix: 'Available accessories are filtered according to', audioGuide: 'The two audio systems are alternatives: selecting one disables the other.',
    electronicsGuide: 'Raymarine and Garmin are alternative packages. You can select multiple items within the chosen package.',
    groups: { ENGINES:'Engine Options', PROPULSION:'Propulsion Package', HULL_DECK:'Hull and Deck Finishing', DECK:'Deck Equipment', COCKPIT:'Cockpit and Interior', ELECTRICAL:'Electric System', AUDIO:'Audio System', NAV_COMMON:'Navigation Equipment', RAYMARINE:'Raymarine Electronics Package', GARMIN:'Garmin Electronics Package', UPHOLSTERY:'Upholstery, Sunshades and Covers' },
    rules: { ENGINE_ONE:'Select one engine option.', JOYSTICK_ONE:'The maneuvering joysticks are alternative accessories.', JOYSTICK_300_COMPAT:'Available only with Mercury F300.', JOYSTICK_350_400_COMPAT:'Available only with Mercury V350 or V400.', JOYSTICK_500_COMPAT:'Available only with Mercury Racing 500.', ENGINE_COVER_ONE:'The two engine cover finishes are alternative accessories.', BOW_CONFIGURATION_ONE:'The bow configurations are alternative accessories.', UNDERWATER_LIGHTS_ONE:'Select one underwater light set.', AUDIO_ONE:'The two audio systems are alternative accessories.', ELECTRONICS_BRAND:'Raymarine and Garmin electronics cannot be combined.' }
  },
  IT: {
    subtitle: 'Dimostratore API-first, indipendente dall\u2019interfaccia utente.',
    configuration: 'Configurazione', reset: 'Azzera', firstName: 'Nome *', lastName: 'Cognome *',
    company: 'Azienda', configurationName: 'Nome configurazione *', configurationPlaceholder: 'Es. BS 120 cliente demo',
    boatDiscount: 'Sconto imbarcazione %', accessoriesDiscount: 'Sconto accessori %', saveOnline: 'Salva online',
    generatePdf: 'Genera PDF', searchSaved: 'Cerca salvate', multiple: 'Selezione multipla', single: 'Selezione singola', one: 'Seleziona una sola opzione',
    selected: 'Selezionato', available: 'Disponibile', unavailable: 'Non disponibile', noSelection: 'Nessuna opzione selezionata.',
    boat: 'Imbarcazione', accessories: 'Accessori', discounts: 'Sconti', total: 'Totale',
    saved: 'Configurazione salvata:', searchPrompt: 'Cerca per cognome, azienda, codice o nome configurazione:',
    noneSaved: 'Nessuna configurazione trovata.', open: 'Apri', delete: 'Elimina',
    requiredFirst: 'Inserisci il nome.', requiredLast: 'Inserisci il cognome.', requiredConfig: 'Inserisci un nome per la configurazione.',
    deleteConfirm: 'Eliminare', pdfFailed: 'Generazione PDF non riuscita', initializationFailed: 'Impossibile inizializzare il configuratore:',
    engineNone: 'Scegli una motorizzazione per proseguire con gli accessori compatibili.', enginePrefix: 'Motorizzazione selezionata:',
    engineSuffix: 'Puoi cambiarla scegliendone un\u2019altra.', propulsionNone: 'Seleziona prima una motorizzazione: i joystick compatibili verranno abilitati automaticamente.',
    propulsionPrefix: 'Gli accessori disponibili sono filtrati in base a', audioGuide: 'I due sistemi audio sono alternativi: selezionandone uno, l\u2019altro viene disabilitato.',
    electronicsGuide: 'Raymarine e Garmin sono pacchetti alternativi. Nel pacchetto scelto puoi selezionare pi\u00f9 componenti.',
    groups: { ENGINES:'Motorizzazione', PROPULSION:'Propulsione e manovra', HULL_DECK:'Scafo, coperta e finiture', DECK:'Accessori di coperta', COCKPIT:'Cockpit e interni', ELECTRICAL:'Sistemi elettrici', AUDIO:'Sistema audio', NAV_COMMON:'Navigazione comune', RAYMARINE:'Pacchetto Raymarine', GARMIN:'Pacchetto Garmin', UPHOLSTERY:'Tappezzeria, tendalini e coperture' },
    rules: { ENGINE_ONE:'Seleziona una sola motorizzazione.', JOYSTICK_ONE:'I joystick di manovra sono accessori alternativi.', JOYSTICK_300_COMPAT:'Disponibile solo con Mercury F300.', JOYSTICK_350_400_COMPAT:'Disponibile solo con Mercury V350 o V400.', JOYSTICK_500_COMPAT:'Disponibile solo con Mercury Racing 500.', ENGINE_COVER_ONE:'Le due finiture delle coperture motore sono alternative.', BOW_CONFIGURATION_ONE:'Le configurazioni di prua sono alternative.', UNDERWATER_LIGHTS_ONE:'Seleziona un solo set di luci subacquee.', AUDIO_ONE:'I due sistemi audio sono alternativi.', ELECTRONICS_BRAND:'Gli accessori Raymarine e Garmin non possono essere combinati.' }
  }
};

const t = key => I18N[uiLanguage][key] || I18N.EN[key] || key;
const euro = value => new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', maximumFractionDigits:2 }).format(Number(value || 0));
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

async function api(url, options={}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { message = (await response.json()).detail || message; } catch (_) {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

async function init() {
  try {
    catalog = await api('/api/v1/models/BS120OB');
    activeGroup = catalog.groups[0].code;
    selected = [];
    discounts = { boatPct:0, accessoriesPct:0 };
    wire();
    applyStaticTranslations();
    await evaluate();
  } catch (error) {
    const area = document.querySelector('#errors');
    if (area) area.innerHTML = `<div class="error">${esc(t('initializationFailed'))} ${esc(error.message)}</div>`;
    console.error(error);
  }
}

function wire() {
  document.querySelector('#langEN').onclick = () => setLanguage('EN');
  document.querySelector('#langIT').onclick = () => setLanguage('IT');
  document.querySelector('#reset').onclick = resetConfiguration;
  document.querySelector('#boatDiscount').onchange = onDiscountChange;
  document.querySelector('#accDiscount').onchange = onDiscountChange;
  document.querySelector('#saveServer').onclick = saveOnline;
  document.querySelector('#generatePdf').onclick = generatePdf;
  document.querySelector('#findSaved').onclick = () => findSaved(true);
  ['firstName','lastName','configurationName'].forEach(id => document.querySelector('#'+id).addEventListener('input', updateSaveValidation));
}

function setLanguage(language) {
  uiLanguage = language;
  localStorage.setItem('itb-ui-language', language);
  applyStaticTranslations();
  if (result) render();
}

function setLabel(id, text) {
  const input = document.querySelector('#'+id);
  if (!input) return;
  const label = input.closest('label');
  if (label && label.firstChild) label.firstChild.nodeValue = text;
}

function applyStaticTranslations() {
  document.documentElement.lang = uiLanguage.toLowerCase();
  const subtitleElement = document.querySelector('header p'); if (subtitleElement) subtitleElement.textContent = t('subtitle');
  const configurationHeading = document.querySelector('aside h2'); if (configurationHeading) configurationHeading.textContent = t('configuration');
  document.querySelector('#reset').textContent = t('reset');
  document.querySelector('#saveServer').textContent = t('saveOnline');
  document.querySelector('#generatePdf').textContent = t('generatePdf');
  document.querySelector('#findSaved').textContent = t('searchSaved');
  setLabel('firstName', t('firstName')); setLabel('lastName', t('lastName')); setLabel('company', t('company'));
  setLabel('configurationName', t('configurationName')); setLabel('boatDiscount', t('boatDiscount')); setLabel('accDiscount', t('accessoriesDiscount'));
  document.querySelector('#configurationName').placeholder = t('configurationPlaceholder');
  document.querySelector('#langEN').classList.toggle('active', uiLanguage === 'EN');
  document.querySelector('#langIT').classList.toggle('active', uiLanguage === 'IT');
  updateSaveValidation();
}

function resetConfiguration() {
  selected=[]; discounts={boatPct:0,accessoriesPct:0}; currentSavedCode=null; activeGroup=catalog.groups[0].code;
  ['firstName','lastName','company','configurationName'].forEach(id => document.querySelector('#'+id).value='');
  document.querySelector('#boatDiscount').value=0; document.querySelector('#accDiscount').value=0;
  document.querySelector('#savedPanel').innerHTML='';
  evaluate();
}

function onDiscountChange(event) {
  discounts[event.target.id === 'boatDiscount' ? 'boatPct' : 'accessoriesPct'] = Number(event.target.value)||0;
  evaluate();
}

async function evaluate() {
  result = await api('/api/v1/configurations/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelCode:'BS120OB',selectedOptions:selected,discounts})});
  render();
}

function toggle(code) {
  const option=result.options.find(x=>x.code===code);
  if(!option || (!option.available && !option.selected)) return;
  const selecting=!selected.includes(code);
  selected=selecting?[...selected,code]:selected.filter(x=>x!==code);
  if(selecting && option.group==='ENGINES') activeGroup='PROPULSION';
  evaluate();
}

function ruleText(violation) { return I18N[uiLanguage].rules[violation.ruleId] || violation.message; }
function selectedEngine(){return result.options.find(o=>o.group==='ENGINES'&&o.selected);}
function relevantViolation(v){return v.scopeGroup===activeGroup||(v.scopeGroups||[]).includes(activeGroup);}
function guidance(){
  const engine=selectedEngine();
  if(activeGroup==='ENGINES') return engine?`${t('enginePrefix')} <strong>${esc(engine.name)}</strong>. ${t('engineSuffix')}`:t('engineNone');
  if(activeGroup==='PROPULSION') return engine?`${t('propulsionPrefix')} <strong>${esc(engine.name)}</strong>.`:t('propulsionNone');
  if(activeGroup==='AUDIO') return t('audioGuide');
  if(activeGroup==='RAYMARINE'||activeGroup==='GARMIN') return t('electronicsGuide');
  return '';
}

function render(){renderNav();renderGroup();renderSummary();}
function renderNav(){
  const nav=document.querySelector('#nav'); nav.innerHTML='';
  catalog.groups.forEach(group=>{const b=document.createElement('button');b.type='button';b.textContent=I18N[uiLanguage].groups[group.code]||group.label;b.className=group.code===activeGroup?'active':'';b.onclick=()=>{activeGroup=group.code;render();};nav.appendChild(b);});
}
function renderGroup(){
  const group=catalog.groups.find(x=>x.code===activeGroup);
  document.querySelector('#groupTitle').textContent=I18N[uiLanguage].groups[group.code]||group.label;
  document.querySelector('#groupHint').textContent=group.max===1?(group.min===1?t('one'):t('single')):t('multiple');
  const msg=[];const guide=guidance();if(guide)msg.push(`<div class="guidance">${guide}</div>`);
  result.violations.filter(relevantViolation).forEach(v=>msg.push(`<div class="error">${esc(ruleText(v))}</div>`));
  document.querySelector('#errors').innerHTML=msg.join('');
  document.querySelector('#cards').innerHTML=result.options.filter(o=>o.group===activeGroup).map(o=>`<article class="card ${o.selected?'selected':''} ${!o.available&&!o.selected?'disabled':''}" onclick="toggle('${o.code}')"><img src="${o.image}" alt="${esc(o.name)}" onerror="this.src='/static/assets/boat.png'"><div class="body"><h3>${esc(o.name)}</h3><div class="price">${euro(o.price)}</div><div class="status">${o.selected?t('selected'):o.available?t('available'):esc(I18N[uiLanguage].rules[disabledRuleFor(o.code)]||o.disabledReason||t('unavailable'))}</div></div></article>`).join('');
}
function disabledRuleFor(code){const rules=result.appliedRules||[];if(code.startsWith('JOYSTICK_'))return code==='JOYSTICK_300'?'JOYSTICK_300_COMPAT':code==='JOYSTICK_500'?'JOYSTICK_500_COMPAT':'JOYSTICK_350_400_COMPAT';if(code.startsWith('AUDIO_'))return'AUDIO_ONE';if(code.startsWith('RAY_')||code.startsWith('GARMIN_'))return'ELECTRONICS_BRAND';return'';}
function renderSummary(){
  const picks=result.options.filter(o=>o.selected);document.querySelector('#selected').innerHTML=picks.length?picks.map(o=>`<div class="pick"><span>${esc(o.name)}</span><b>${euro(o.price)}</b></div>`).join(''):`<p>${t('noSelection')}</p>`;
  const p=result.pricing;document.querySelector('#pricing').innerHTML=`<div class="sub"><span>${t('boat')}</span><b>${euro(p.boatSubtotal)}</b></div><div class="sub"><span>${t('accessories')}</span><b>${euro(p.accessoriesSubtotal)}</b></div><div class="sub"><span>${t('discounts')}</span><b>-${euro(p.discountTotal)}</b></div><div class="total"><span>${t('total')}</span><span>${euro(p.netTotal)}</span></div>`;
}

function requiredFields(){return[{id:'firstName',message:t('requiredFirst')},{id:'lastName',message:t('requiredLast')},{id:'configurationName',message:t('requiredConfig')}];}
function updateSaveValidation(){let valid=true;requiredFields().forEach(({id})=>{const input=document.querySelector('#'+id);const empty=!input.value.trim();input.classList.toggle('field-invalid',empty&&input.dataset.touched==='true');valid=valid&&!empty;});document.querySelector('#saveServer').disabled=!valid;document.querySelector('#generatePdf').disabled=!valid;}
function validateFields(){let first=null;requiredFields().forEach(({id,message})=>{const input=document.querySelector('#'+id);input.dataset.touched='true';const empty=!input.value.trim();input.classList.toggle('field-invalid',empty);let error=document.querySelector('#'+id+'-error');if(!error){error=document.createElement('span');error.id=id+'-error';error.className='field-error';input.insertAdjacentElement('afterend',error);}error.textContent=empty?message:'';if(empty&&!first)first=input;});updateSaveValidation();if(first)first.focus();return!first;}
function payload(){if(!validateFields())throw new Error('VALIDATION_FIELDS');return{configurationName:document.querySelector('#configurationName').value.trim(),customer:{firstName:document.querySelector('#firstName').value.trim(),lastName:document.querySelector('#lastName').value.trim(),company:document.querySelector('#company').value.trim()},modelCode:'BS120OB',catalogVersion:catalog.model.catalogVersion,selectedOptions:selected,discounts,pricingSnapshot:result.pricing};}

async function saveOnline(){try{const body=payload();const url=currentSavedCode?`/api/v1/saved-configurations/${encodeURIComponent(currentSavedCode)}`:'/api/v1/saved-configurations';const saved=await api(url,{method:currentSavedCode?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});currentSavedCode=saved.configurationCode;alert(`${t('saved')} ${currentSavedCode}`);await findSaved(false);}catch(e){if(e.message!=='VALIDATION_FIELDS')alert(e.message);}}
async function generatePdf(){
  const button=document.querySelector('#generatePdf');
  try{
    const body=payload();
    setPdfBusy(true);
    const response=await fetch('/api/v1/documents/quote.pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok){let message=t('pdfFailed');try{message=(await response.json()).detail||message;}catch(_){}throw new Error(message);}
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=(body.configurationName||'configuration').replace(/[^a-zA-Z0-9_-]+/g,'_')+'.pdf';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){if(e.message!=='VALIDATION_FIELDS')alert(e.message);}
  finally{setPdfBusy(false);}
}
function setPdfBusy(busy){
  const button=document.querySelector('#generatePdf');
  button.disabled=busy||!document.querySelector('#firstName').value.trim()||!document.querySelector('#lastName').value.trim()||!document.querySelector('#configurationName').value.trim();
  button.innerHTML=busy?'<span class="button-spinner"></span>'+ (uiLanguage==='IT'?'Generazione...':'Generating...'):t('generatePdf');
  let overlay=document.querySelector('#pdfBusyOverlay');
  if(!overlay){overlay=document.createElement('div');overlay.id='pdfBusyOverlay';overlay.className='pdf-busy-overlay';overlay.innerHTML='<div class="pdf-busy-card"><span class="pdf-spinner"></span><strong id="pdfBusyTitle"></strong><span id="pdfBusyText"></span></div>';document.body.appendChild(overlay);}
  document.querySelector('#pdfBusyTitle').textContent=uiLanguage==='IT'?'Creazione PDF':'Generating PDF';
  document.querySelector('#pdfBusyText').textContent=uiLanguage==='IT'?'Attendi qualche secondo...':'Please wait a few seconds...';
  overlay.classList.toggle('visible',busy);
}
async function findSaved(ask=true){try{const query=ask?(prompt(t('searchPrompt'),'')??''):'';const data=await api(`/api/v1/saved-configurations?query=${encodeURIComponent(query)}`);document.querySelector('#savedPanel').innerHTML=data.items.length?data.items.map(savedCard).join(''):`<p>${t('noneSaved')}</p>`;}catch(e){alert(e.message);}}
function savedCard(item){const c=item.customer||{};const company=c.company?` - ${esc(c.company)}`:'';const date=item.updatedAt?new Date(item.updatedAt).toLocaleString(uiLanguage==='IT'?'it-IT':'en-GB'):'';return`<div class="saved-item"><b>${esc(item.configurationCode)} - ${esc(item.configurationName)}</b><div>${esc(c.firstName||'')} ${esc(c.lastName||'')}${company}</div><div>${euro(item.pricingSnapshot?.netTotal||0)} - ${esc(date)}</div><div class="saved-actions"><button type="button" onclick="openSaved('${item.configurationCode}')">${t('open')}</button><button type="button" onclick="deleteSaved('${item.configurationCode}')">${t('delete')}</button></div></div>`;}
async function openSaved(code){const item=await api(`/api/v1/saved-configurations/${encodeURIComponent(code)}`);currentSavedCode=item.configurationCode;selected=item.selectedOptions||[];discounts=item.discounts||{boatPct:0,accessoriesPct:0};document.querySelector('#firstName').value=item.customer?.firstName||'';document.querySelector('#lastName').value=item.customer?.lastName||'';document.querySelector('#company').value=item.customer?.company||'';document.querySelector('#configurationName').value=item.configurationName||'';document.querySelector('#boatDiscount').value=discounts.boatPct;document.querySelector('#accDiscount').value=discounts.accessoriesPct;activeGroup=catalog.groups[0].code;updateSaveValidation();await evaluate();}
async function deleteSaved(code){if(!confirm(`${t('deleteConfirm')} ${code}?`))return;await api(`/api/v1/saved-configurations/${encodeURIComponent(code)}`,{method:'DELETE'});if(currentSavedCode===code)currentSavedCode=null;await findSaved(false);}


let selectedSummaryExpanded = false;

function renderCompactSelectedList(picks) {
  const visible = selectedSummaryExpanded ? picks : picks.slice(0, 4);
  const hiddenCount = Math.max(0, picks.length - visible.length);
  const rows = visible.map(option => `<div class="pick"><span>${esc(option.name)}</span><b>${euro(option.price)}</b></div>`).join('');
  const toggle = picks.length > 4
    ? `<button type="button" class="selected-toggle" onclick="toggleSelectedSummary()">${selectedSummaryExpanded ? (uiLanguage === 'IT' ? 'Mostra meno' : 'Show less') : '+' + hiddenCount + ' ' + (uiLanguage === 'IT' ? 'altri elementi' : 'more selected items')}</button>`
    : '';
  document.querySelector('#selected').innerHTML = picks.length ? rows + toggle : `<p>${t('noSelection')}</p>`;
}

function toggleSelectedSummary() {
  selectedSummaryExpanded = !selectedSummaryExpanded;
  renderSummary();
}

const originalRenderSummary = renderSummary;
renderSummary = function() {
  const picks = result.options.filter(option => option.selected);
  renderCompactSelectedList(picks);
  const p = result.pricing;
  document.querySelector('#pricing').innerHTML = `
    <div class="sub"><span>${t('boat')}</span><b>${euro(p.boatSubtotal)}</b></div>
    <div class="sub"><span>${t('accessories')}</span><b>${euro(p.accessoriesSubtotal)}</b></div>
    <div class="sub"><span>${t('discounts')}</span><b>-${euro(p.discountTotal)}</b></div>
    <div class="total"><span>${t('total')}</span><span>${euro(p.netTotal)}</span></div>`;
};

const originalApplyStaticTranslations = applyStaticTranslations;
applyStaticTranslations = function() {
  originalApplyStaticTranslations();
  const heroSmall = document.querySelector('.summary-hero span');
  const heroStrong = document.querySelector('.summary-hero strong');
  if (heroSmall) heroSmall.textContent = uiLanguage === 'IT' ? 'LA TUA' : 'YOUR';
  if (heroStrong) heroStrong.textContent = uiLanguage === 'IT' ? 'CONFIGURAZIONE' : 'CONFIGURATION';
  const engineLabel = document.querySelector('.engine-label');
  if (engineLabel) engineLabel.textContent = uiLanguage === 'IT' ? 'MOTORE DI CONFIGURAZIONE ITB' : 'ITB CONFIGURATION ENGINE';
  const progressLabel = document.querySelector('.progress-heading span');
  if (progressLabel) progressLabel.textContent = uiLanguage === 'IT' ? 'CONFIGURAZIONE PERSONALE' : 'PERSONAL CONFIGURATION';
  const welcomeKicker = document.querySelector('.welcome .kicker');
  if (welcomeKicker) welcomeKicker.textContent = uiLanguage === 'IT' ? 'CONFIGURAZIONE PERSONALE' : 'PERSONAL CONFIGURATION';
  if (result) renderCompactSelectedList(result.options.filter(option => option.selected));
};
init();
