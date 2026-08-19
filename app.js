const icons = { APS:'🛜', SW:'🌐', CAM:'🎥', RFID:'🏷️', MPC:'🖥️', SATO:'🖨️', LEXMARK:'📇' };
const home = document.getElementById('home');
const listView = document.getElementById('listView');
const racksView = document.getElementById('racksView');
const cards = document.getElementById('groupCards');
const table = document.getElementById('deviceTable');
const title = document.getElementById('listTitle');
const subtitle = document.getElementById('listSubtitle');
const total = document.getElementById('total');
const onlineTotal = document.getElementById('onlineTotal');
const offlineTotal = document.getElementById('offlineTotal');
const lastCheck = document.getElementById('lastCheck');
const onlyProblemsBtn = document.getElementById('onlyProblemsBtn');
const rfidPageBtn = document.getElementById('rfidPageBtn');
const racksBtn = document.getElementById('racksBtn');
const saveBtn = document.getElementById('saveBtn');
const addRowBtn = document.getElementById('addRowBtn');

const rackButtons = document.getElementById('rackButtons');
const selectedRackHeader = document.getElementById('selectedRackHeader');
const rackHeaderImage = document.getElementById('rackHeaderImage');
const rackTableBody = document.getElementById('rackTableBody');
const rackTableSubtitle = document.getElementById('rackTableSubtitle');
const addRackRowBtn = document.getElementById('addRackRowBtn');
const saveRackBtn = document.getElementById('saveRackBtn');

const statusCache = {};
let lastCheckAt = null;
let isChecking = false;
let currentGroup = null;
let sortState = { key: 'ip', direction: 'asc' };
let selectedRack = null;
let selectedRackImage = null;

const LOCATION_OPTIONS = [
  'ADMIN', 'AIRE', 'CAÑOS', 'CALIDAD', 'CELULARES', 'COMEDOR', 'FCT', 'GUARDIA',
  'IA', 'INGENIERIA', 'IT', 'LABORATORIO', 'MANTENIMIENTO', 'MEDICO', 'MYT',
  'NACIONALES', 'OFDEPOSITO', 'PRODUCCIÓN', 'SOLDADURA', 'SUM', 'TV'
];

const TYPE_OPTIONS = ['APS', 'CORE', 'SW', 'CAM', 'RFID', 'MPC', 'SATO', 'LEXMARK', 'OTRO'];

const RACKS = [
  ['01', 'IA DEPO'], ['02', 'IA SALA'], ['04', 'IA FONDO'], ['05', 'NACIONALES'],
  ['06', 'RESIDUOS'], ['07', 'TELEVISION'], ['Cel1', 'CEL01'], ['Cel2', 'CEL02'],
  ['08', 'NAC2'], ['08b', 'MYT'], ['09', 'EXPEDISION'], ['09b', 'CALIDAD'],
  ['10', 'MAT PRIMA'], ['11', 'DEP RVF'], ['12', 'AIRE 1'], ['13', 'DARSENAS'],
  ['14', 'AIRE 2'], ['15', 'SALA BOMBAS'], ['16', 'FCT'], ['17', 'LABORATORIO'],
  ['18', 'DEP NUEVO'], ['19', 'NVR SALA'], ['20', 'IA FONDO'], ['tv1', 'TV 1'],
  ['tv2', 'TV 2'], ['tv3', 'TV 3'], ['tv4', 'TV 4']
];

function cloneDevices(source) {
  return Object.fromEntries(Object.entries(source).map(([group, devices]) => [group, devices.map(d => ({ ...d }))]));
}

let editableDevices = cloneDevices(DEVICES);
let rackData = {};

function normalizeDevice(device, group) {
  const hostname = device.hostname ?? device.name ?? '';
  const type = device.type || (group === 'SW' ? 'SW' : group === 'CAM' ? 'CAM' : group === 'APS' ? 'APS' : group === 'RFID' ? 'RFID' : group);
  return {
    ...device,
    ip: device.ip || '',
    hostname,
    name: undefined,
    type,
    location: device.location || '',
    connection: device.connection || '',
    group,
    newRow: device.newRow || false
  };
}

function normalizeAllDevices(devices) {
  const result = {};
  Object.entries(devices || {}).forEach(([group, list]) => {
    result[group] = Array.isArray(list) ? list.map(d => normalizeDevice(d, group)) : [];
  });
  Object.keys(DEVICES).forEach(group => {
    if (!Array.isArray(result[group])) result[group] = [];
  });
  return result;
}

async function loadSavedConfig() {
  try {
    const saved = await window.monitorAPI.loadDeviceConfig();
    if (saved && typeof saved === 'object') {
      editableDevices = normalizeAllDevices(saved);
    } else {
      editableDevices = normalizeAllDevices(DEVICES);
      await saveConfig();
    }
  } catch (e) {
    console.log('No se pudo cargar la configuración:', e.message);
    editableDevices = normalizeAllDevices(DEVICES);
  }
}

async function saveConfig() {
  try {
    const clean = {};
    Object.entries(editableDevices).forEach(([group, devices]) => {
      clean[group] = devices.map(d => {
        const copy = { ...d };
        delete copy.name;
        delete copy.newRow;
        return copy;
      });
    });
    await window.monitorAPI.saveDeviceConfig(clean);
    return true;
  } catch (e) {
    console.log('No se pudo guardar la configuración:', e.message);
    return false;
  }
}

async function loadRackConfig() {
  try {
    const saved = await window.monitorAPI.loadRackConfig();
    rackData = saved && typeof saved === 'object' ? saved : {};
  } catch (e) {
    console.log('No se pudo cargar la configuración de racks:', e.message);
    rackData = {};
  }
}

async function saveRackConfig() {
  try {
    await window.monitorAPI.saveRackConfig(rackData);
    return true;
  } catch (e) {
    console.log('No se pudo guardar la configuración de racks:', e.message);
    return false;
  }
}

function setCardStatus(group, status) {
  const card = [...cards.children].find(c => c.dataset.group === group);
  if (!card) return;
  card.classList.remove('group-online', 'group-offline', 'group-checking');
  card.classList.add(`group-${status}`);
}

function renderHome() {
  cards.innerHTML = '';
  let count = 0;
  Object.entries(editableDevices).forEach(([group, devices]) => {
    count += devices.length;
    const card = document.createElement('div');
    card.className = 'card group-checking';
    card.dataset.group = group;
    card.innerHTML = `<div class="icon">${icons[group] || '🖧'}</div><h3>${group}</h3><p>${devices.length} equipos</p>`;
    card.onclick = () => openGroup(group);
    cards.appendChild(card);
  });
  Object.entries(statusCache).forEach(([group, devices]) => {
    const hasError = Object.values(devices).some(d => !d.online);
    setCardStatus(group, hasError ? 'offline' : 'online');
  });
  total.textContent = count;
  updateTotals();
}

function updateTotals() {
  let online = 0, offline = 0;
  Object.values(statusCache).forEach(group => Object.values(group).forEach(device => device.online ? online++ : offline++));
  onlineTotal.textContent = online;
  offlineTotal.textContent = offline;
}

function formatTime(date) {
  return date.toLocaleTimeString('es-AR', { hour12: false });
}

function updateClock() {
  document.getElementById('clock').textContent = `HORA ACTUAL: ${formatTime(new Date())}`;
}

function updateLastCheck() {
  lastCheck.textContent = `ÚLTIMO PING: ${lastCheckAt ? formatTime(lastCheckAt) : '—'}`;
}

function sortedDevices(group) {
  const devices = [...(editableDevices[group] || [])];
  const key = sortState.key;
  const direction = sortState.direction === 'asc' ? 1 : -1;
  return devices.sort((a, b) => {
    let av, bv;
    if (key === 'status') {
      av = statusCache[group]?.[a.ip]?.online ? 1 : 0;
      bv = statusCache[group]?.[b.ip]?.online ? 1 : 0;
    } else if (key === 'ip') {
      av = String(a.ip || '').split('.').map(n => n.padStart(3, '0')).join('.');
      bv = String(b.ip || '').split('.').map(n => n.padStart(3, '0')).join('.');
    } else {
      av = String(a[key] ?? '').toLocaleLowerCase('es');
      bv = String(b[key] ?? '').toLocaleLowerCase('es');
    }
    if (av < bv) return -1 * direction;
    if (av > bv) return 1 * direction;
    return 0;
  });
}

function inputCell(value, field, placeholder = '') {
  const input = document.createElement('input');
  input.className = 'cellInput';
  input.value = value || '';
  input.placeholder = placeholder;
  input.dataset.field = field;
  return input;
}

function selectCell(value, field, options) {
  const select = document.createElement('select');
  select.className = 'cellSelect';
  const values = [...options];
  if (value && !values.includes(value)) values.unshift(value);
  values.forEach(optionValue => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue || '—';
    if (optionValue === value) option.selected = true;
    select.appendChild(option);
  });
  return select;
}

function renderTable(group, statuses) {
  table.innerHTML = '';
  sortedDevices(group).forEach(device => {
    const state = statuses?.[device.ip];
    const tr = document.createElement('tr');
    tr.dataset.deviceIndex = editableDevices[group].indexOf(device);

    const typeCell = document.createElement('td');
    const typeSelect = selectCell(device.type, 'type', TYPE_OPTIONS);
    typeSelect.onchange = () => { device.type = typeSelect.value; };
    typeCell.appendChild(typeSelect);

    const ipCell = document.createElement('td');
    ipCell.className = 'ip';
    if (device.newRow) {
      const ipInput = inputCell(device.ip, 'ip', 'Nueva IP');
      ipInput.classList.add('newIpInput');
      ipInput.oninput = () => { device.ip = ipInput.value.trim(); };
      ipCell.appendChild(ipInput);
    } else {
      ipCell.textContent = device.ip;
    }

    const hostnameCell = document.createElement('td');
    const hostnameInput = inputCell(device.hostname, 'hostname', 'HOSTNAME');
    hostnameInput.oninput = () => { device.hostname = hostnameInput.value; };
    hostnameCell.appendChild(hostnameInput);

    const locationCell = document.createElement('td');
    const locationSelect = selectCell(device.location, 'location', LOCATION_OPTIONS);
    locationSelect.onchange = () => { device.location = locationSelect.value; };
    locationCell.appendChild(locationSelect);

    const connectionCell = document.createElement('td');
    const connectionInput = inputCell(device.connection, 'connection', 'Conexión');
    connectionInput.oninput = () => { device.connection = connectionInput.value; };
    connectionCell.appendChild(connectionInput);

    const statusCell = document.createElement('td');
    let statusHtml = '<span class="status"><span class="dot unknown"></span>COMPROBANDO</span>';
    if (state) {
      statusHtml = state.online
        ? `<span class="status online"><span class="dot"></span>ONLINE · ${state.latency != null ? state.latency + ' ms' : '—'}</span>`
        : `<span class="status offline"><span class="dot"></span>OFFLINE${state.latency != null ? ' · ' + state.latency + ' ms' : ''}</span>`;
    }
    statusCell.innerHTML = statusHtml;
    tr.append(typeCell, ipCell, hostnameCell, locationCell, connectionCell, statusCell);
    table.appendChild(tr);
  });
}

function openGroup(group) {
  currentGroup = group;
  sortState = { key: 'ip', direction: 'asc' };
  racksView.classList.remove('active');
  home.classList.remove('active');
  listView.classList.add('active');
  title.textContent = group;
  subtitle.textContent = `${editableDevices[group].length} IPs registradas`;
  renderTable(group, statusCache[group] || null);
  updateSortMarks();
}

function openProblems() {
  home.classList.remove('active');
  racksView.classList.remove('active');
  listView.classList.add('active');
  currentGroup = null;
  title.textContent = 'SOLO PROBLEMAS';
  const problems = [];
  Object.entries(editableDevices).forEach(([group, devices]) => {
    devices.forEach(device => {
      const state = statusCache[group]?.[device.ip];
      if (state && !state.online) problems.push({ ...device, ...state, group });
    });
  });
  subtitle.textContent = `${problems.length} IPs con error`;
  table.innerHTML = '';
  problems.forEach(device => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${device.type || device.group}</td><td class="ip">${device.ip}</td><td>${device.hostname || '<span class="muted">Sin hostname</span>'}</td><td>${device.location || '<span class="muted">—</span>'}</td><td>${device.connection || '<span class="muted">—</span>'}</td><td><span class="problemGroup">${device.group}</span> <span class="status offline"><span class="dot"></span>OFFLINE</span></td>`;
    table.appendChild(tr);
  });
}

function cacheResults(result) {
  Object.entries(result).forEach(([group, devices]) => {
    statusCache[group] = {};
    let hasError = false;
    devices.forEach(device => {
      statusCache[group][device.ip] = device;
      if (!device.online) hasError = true;
    });
    setCardStatus(group, hasError ? 'offline' : 'online');
  });
  updateTotals();
}

async function checkAll() {
  if (isChecking) return;
  isChecking = true;
  Object.keys(editableDevices).forEach(group => setCardStatus(group, 'checking'));
  try {
    const response = await fetch('http://127.0.0.1:3000/api/all');
    if (!response.ok) throw new Error('Servidor local no disponible');
    const result = await response.json();
    cacheResults(result);
    lastCheckAt = new Date();
    updateLastCheck();
    if (listView.classList.contains('active') && currentGroup && editableDevices[currentGroup]) renderTable(currentGroup, statusCache[currentGroup]);
  } catch (e) {
    Object.keys(editableDevices).forEach(group => setCardStatus(group, 'offline'));
  } finally {
    isChecking = false;
  }
}

async function checkGroup(group) {
  if (!editableDevices[group]) return;
  setCardStatus(group, 'checking');
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/group/${encodeURIComponent(group)}`);
    if (!response.ok) throw new Error('Servidor local no disponible');
    const devices = await response.json();
    statusCache[group] = {};
    let hasError = false;
    devices.forEach(device => {
      statusCache[group][device.ip] = device;
      if (!device.online) hasError = true;
    });
    setCardStatus(group, hasError ? 'offline' : 'online');
    updateTotals();
    lastCheckAt = new Date();
    updateLastCheck();
    if (listView.classList.contains('active') && currentGroup === group) renderTable(group, statusCache[group]);
  } catch (e) {
    setCardStatus(group, 'offline');
  }
}

function updateSortMarks() {
  document.querySelectorAll('#listView th[data-sort]').forEach(th => {
    const mark = th.querySelector('.sortMark');
    mark.textContent = th.dataset.sort === sortState.key ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  });
}

document.querySelectorAll('#listView th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    if (sortState.key === th.dataset.sort) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    else { sortState.key = th.dataset.sort; sortState.direction = 'asc'; }
    if (currentGroup) renderTable(currentGroup, statusCache[currentGroup] || null);
    updateSortMarks();
  });
});

document.getElementById('backBtn').onclick = () => {
  listView.classList.remove('active');
  racksView.classList.remove('active');
  home.classList.add('active');
  currentGroup = null;
  renderHome();
};

document.getElementById('refreshBtn').onclick = () => {
  if (currentGroup) checkGroup(currentGroup);
  else checkAll().then(openProblems);
};

addRowBtn.onclick = () => {
  if (!currentGroup) return;
  const newDevice = { ip: '', hostname: '', type: currentGroup, location: '', connection: '', group: currentGroup, newRow: true };
  editableDevices[currentGroup].push(newDevice);
  renderTable(currentGroup, statusCache[currentGroup] || null);
  subtitle.textContent = `${editableDevices[currentGroup].length} IPs registradas`;
  const newIp = table.querySelector('.newIpInput');
  if (newIp) newIp.focus();
};

saveBtn.onclick = async () => {
  if (!currentGroup) return;
  const rows = [...table.querySelectorAll('tr')];
  const current = editableDevices[currentGroup];
  rows.forEach(row => {
    const index = Number(row.dataset.deviceIndex);
    const device = current[index];
    if (!device) return;
    const inputs = row.querySelectorAll('input');
    const selects = row.querySelectorAll('select');
    if (device.newRow) {
      if (inputs[0]) device.ip = inputs[0].value.trim();
      if (inputs[1]) device.hostname = inputs[1].value;
      if (inputs[2]) device.connection = inputs[2].value;
    } else {
      if (inputs[0]) device.hostname = inputs[0].value;
      if (inputs[1]) device.connection = inputs[1].value;
    }
    if (selects[0]) device.type = selects[0].value;
    if (selects[1]) device.location = selects[1].value;
  });
  editableDevices[currentGroup] = current.filter(d => d.ip || !d.newRow);
  const ok = await saveConfig();
  saveBtn.textContent = ok ? '✓ GUARDADO' : '⚠ ERROR';
  setTimeout(() => saveBtn.textContent = '💾 GUARDAR', 1200);
  subtitle.textContent = `${editableDevices[currentGroup].length} IPs registradas`;
  renderHome();
  renderTable(currentGroup, statusCache[currentGroup] || null);
};

function renderRacks() {
  rackButtons.innerHTML = '';
  RACKS.forEach(([rack, location]) => {
    const button = document.createElement('button');
    button.className = 'rackCard';
    button.dataset.rack = rack;
    button.innerHTML = `<strong>${rack}</strong><span>${location}</span>`;
    button.onclick = () => selectRack(rack, location, button);
    rackButtons.appendChild(button);
  });
}

function rackRowsFor(rack, location) {
  if (!Array.isArray(rackData[rack])) {
    rackData[rack] = [];
  }
  return rackData[rack];
}

function rackInput(value, field, placeholder = '') {
  const input = document.createElement('input');
  input.className = 'rackCellInput';
  input.value = value || '';
  input.placeholder = placeholder;
  input.dataset.field = field;
  return input;
}

function renderRackTable(rack, location) {
  rackTableBody.innerHTML = '';
  const rows = rackRowsFor(rack, location);
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.dataset.index = index;
    const fields = ['rack', 'sector', 'patch', 'sw', 'boca', 'marca', 'descripcion', 'hostname', 'ip'];
    fields.forEach(field => {
      const td = document.createElement('td');
      const input = rackInput(row[field], field, field === 'rack' ? rack : '');
      input.oninput = () => { row[field] = input.value; };
      td.appendChild(input);
      tr.appendChild(td);
    });
    rackTableBody.appendChild(tr);
  });
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="9" class="empty">No hay equipos cargados en este rack. Use “AGREGAR FILA”.</td>';
    rackTableBody.appendChild(tr);
  }
  rackTableSubtitle.textContent = `${rows.length} equipos registrados`;
}

async function selectRack(rack, location, button) {
  selectedRack = rack;
  document.querySelectorAll('.rackCard').forEach(el => el.classList.remove('selected'));
  button.classList.add('selected');
  selectedRackHeader.textContent = `RACK ${rack} - ${location}`;
  rackHeaderImage.removeAttribute('src');
  rackHeaderImage.classList.remove('visible');
  selectedRackImage = await window.monitorAPI.loadRackImage(rack);
  if (selectedRackImage) {
    rackHeaderImage.src = selectedRackImage;
    rackHeaderImage.classList.add('visible');
  }
  renderRackTable(rack, location);
}

function openRacks() {
  home.classList.remove('active');
  listView.classList.remove('active');
  racksView.classList.add('active');
  currentGroup = null;
  selectedRack = null;
  selectedRackHeader.textContent = 'SELECCIONE UN RACK';
  rackHeaderImage.removeAttribute('src');
  rackHeaderImage.classList.remove('visible');
  rackTableBody.innerHTML = '<tr><td colspan="9" class="empty">Seleccione un rack para ver sus equipos.</td></tr>';
  rackTableSubtitle.textContent = 'Seleccione un rack para ver sus equipos';
  if (!rackButtons.children.length) renderRacks();
}

function closeRacks() {
  racksView.classList.remove('active');
  home.classList.add('active');
  selectedRack = null;
  selectedRackImage = null;
  rackHeaderImage.removeAttribute('src');
  rackHeaderImage.classList.remove('visible');
  document.querySelectorAll('.rackCard').forEach(el => el.classList.remove('selected'));
  renderHome();
}

addRackRowBtn.onclick = () => {
  if (!selectedRack) return;
  if (!Array.isArray(rackData[selectedRack])) rackData[selectedRack] = [];
  const location = RACKS.find(([rack]) => rack === selectedRack)?.[1] || '';
  rackData[selectedRack].push({ rack: selectedRack, sector: location, patch: '', sw: '', boca: '', marca: '', descripcion: '', hostname: '', ip: '' });
  renderRackTable(selectedRack, location);
  const rows = rackTableBody.querySelectorAll('tr');
  const lastRow = rows[rows.length - 1];
  if (lastRow) lastRow.querySelector('input')?.focus();
};

saveRackBtn.onclick = async () => {
  if (!selectedRack) return;
  const rows = [...rackTableBody.querySelectorAll('tr[data-index]')];
  const current = rackData[selectedRack] || [];
  rows.forEach(row => {
    const index = Number(row.dataset.index);
    const item = current[index];
    if (!item) return;
    row.querySelectorAll('input').forEach(input => { item[input.dataset.field] = input.value; });
  });
  const ok = await saveRackConfig();
  saveRackBtn.textContent = ok ? '✓ GUARDADO' : '⚠ ERROR';
  setTimeout(() => saveRackBtn.textContent = '💾 GUARDAR', 1200);
  const location = RACKS.find(([rack]) => rack === selectedRack)?.[1] || '';
  renderRackTable(selectedRack, location);
};

onlyProblemsBtn.onclick = openProblems;
rfidPageBtn.onclick = () => window.monitorAPI.openRfidPages();
racksBtn.onclick = openRacks;
document.getElementById('racksBackBtn').onclick = closeRacks;
rackHeaderImage.onclick = () => { if (selectedRack) window.monitorAPI.openRackImage(selectedRack); };

function init() {
  updateClock();
  setInterval(updateClock, 1000);
}

async function start() {
  await loadSavedConfig();
  await loadRackConfig();
  init();
  renderHome();
  updateLastCheck();
  checkAll();
  setInterval(checkAll, 180000);
}

start();
