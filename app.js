const icons = { APS:'📡', SW:'🔀', CAM:'📷', RFID:'🏷️', MPC:'🖥️', SATO:'🖨️', LEXMARK:'🖨️' };
const home = document.getElementById('home');
const listView = document.getElementById('listView');
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
const saveBtn = document.getElementById('saveBtn');
const addRowBtn = document.getElementById('addRowBtn');

const statusCache = {};
let lastCheckAt = null;
let isChecking = false;
let currentGroup = null;
let sortState = { key: 'ip', direction: 'asc' };

function cloneDevices(source) {
  return Object.fromEntries(Object.entries(source).map(([group, devices]) => [group, devices.map(d => ({ ...d }))]));
}

let editableDevices = cloneDevices(DEVICES);

async function loadSavedConfig() {
  try {
    const saved = await window.monitorAPI.loadDeviceConfig();
    if (saved && typeof saved === 'object') {
      editableDevices = saved;
      Object.keys(DEVICES).forEach(group => {
        if (!Array.isArray(editableDevices[group])) editableDevices[group] = [];
      });
    } else {
      await saveConfig();
    }
  } catch (e) {
    console.log('No se pudo cargar la configuración:', e.message);
  }
}

async function saveConfig() {
  try {
    await window.monitorAPI.saveDeviceConfig(editableDevices);
    return true;
  } catch (e) {
    console.log('No se pudo guardar la configuración:', e.message);
    return false;
  }
}

function setCardStatus(group, status){
  const card = [...cards.children].find(c => c.dataset.group === group);
  if(!card) return;
  card.classList.remove('group-online','group-offline','group-checking');
  card.classList.add(`group-${status}`);
}

function renderHome(){
  cards.innerHTML='';
  let count=0;
  Object.entries(editableDevices).forEach(([group,devices])=>{
    count += devices.length;
    const card=document.createElement('div');
    card.className='card group-checking';
    card.dataset.group=group;
    card.innerHTML=`<div class="icon">${icons[group] || '🖧'}</div><h3>${group}</h3><p>${devices.length} equipos</p>`;
    card.onclick=()=>openGroup(group);
    cards.appendChild(card);
  });
  Object.entries(statusCache).forEach(([group, devices]) => {
    const hasError = Object.values(devices).some(d => !d.online);
    setCardStatus(group, hasError ? 'offline' : 'online');
  });
  total.textContent=count;
  updateTotals();
}

function updateTotals(){
  let online=0, offline=0;
  Object.values(statusCache).forEach(group => Object.values(group).forEach(device => device.online ? online++ : offline++));
  onlineTotal.textContent=online;
  offlineTotal.textContent=offline;
}

function updateLastCheck(){
  if(!lastCheckAt){ lastCheck.textContent='Último chequeo: —'; return; }
  lastCheck.textContent=`Último chequeo: ${lastCheckAt.toLocaleTimeString('es-AR')}`;
}

function sortedDevices(group) {
  const devices = [...(editableDevices[group] || [])];
  const key = sortState.key;
  const direction = sortState.direction === 'asc' ? 1 : -1;
  return devices.sort((a,b) => {
    let av, bv;
    if(key === 'status') {
      av = statusCache[group]?.[a.ip]?.online ? 1 : 0;
      bv = statusCache[group]?.[b.ip]?.online ? 1 : 0;
    } else if(key === 'ip') {
      av = String(a.ip || '').split('.').map(n => n.padStart(3,'0')).join('.');
      bv = String(b.ip || '').split('.').map(n => n.padStart(3,'0')).join('.');
    } else {
      av = String(a[key] ?? '').toLocaleLowerCase('es');
      bv = String(b[key] ?? '').toLocaleLowerCase('es');
    }
    if(av < bv) return -1 * direction;
    if(av > bv) return 1 * direction;
    return 0;
  });
}

function inputCell(value, field, placeholder='') {
  const input = document.createElement('input');
  input.className = 'cellInput';
  input.value = value || '';
  input.placeholder = placeholder;
  input.dataset.field = field;
  return input;
}

function renderTable(group, statuses){
  table.innerHTML='';
  sortedDevices(group).forEach(device=>{
    const state = statuses?.[device.ip];
    const tr=document.createElement('tr');
    tr.dataset.ip=device.ip;
    const ipCell=document.createElement('td');
    ipCell.className='ip';
    ipCell.textContent=device.ip || 'NUEVA IP';
    const nameCell=document.createElement('td');
    const nameInput=inputCell(device.name,'name','Nombre');
    nameInput.oninput=()=>{ device.name=nameInput.value; };
    nameCell.appendChild(nameInput);
    const locationCell=document.createElement('td');
    const locationInput=inputCell(device.location,'location','Ubicación');
    locationInput.oninput=()=>{ device.location=locationInput.value; };
    locationCell.appendChild(locationInput);
    const statusCell=document.createElement('td');
    let statusHtml='<span class="status"><span class="dot unknown"></span>COMPROBANDO</span>';
    if(state){
      statusHtml=state.online
        ? `<span class="status online"><span class="dot"></span>ONLINE · ${state.latency != null ? state.latency + ' ms' : '—'}</span>`
        : `<span class="status offline"><span class="dot"></span>OFFLINE${state.latency != null ? ' · ' + state.latency + ' ms' : ''}</span>`;
    }
    statusCell.innerHTML=statusHtml;
    tr.append(ipCell,nameCell,locationCell,statusCell);
    table.appendChild(tr);
  });
}

function openGroup(group){
  currentGroup=group;
  sortState={key:'ip',direction:'asc'};
  home.classList.remove('active');
  listView.classList.add('active');
  title.textContent=group;
  subtitle.textContent=`${editableDevices[group].length} IPs registradas`;
  renderTable(group, statusCache[group] || null);
  updateSortMarks();
}

function openProblems(){
  home.classList.remove('active');
  listView.classList.add('active');
  currentGroup=null;
  title.textContent='SOLO PROBLEMAS';
  const problems=[];
  Object.entries(editableDevices).forEach(([group,devices])=>{
    devices.forEach(device=>{
      const state=statusCache[group]?.[device.ip];
      if(state && !state.online) problems.push({ ...device, ...state, group });
    });
  });
  subtitle.textContent=`${problems.length} IPs con error`;
  table.innerHTML='';
  problems.forEach(device=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="ip">${device.ip}</td><td>${device.name || '<span class="muted">Sin nombre</span>'}</td><td>${device.location || '<span class="muted">—</span>'}</td><td><span class="problemGroup">${device.group}</span> <span class="status offline"><span class="dot"></span>OFFLINE</span></td>`;
    table.appendChild(tr);
  });
}

function cacheResults(result){
  Object.entries(result).forEach(([group,devices])=>{
    statusCache[group] = {};
    let hasError = false;
    devices.forEach(device=>{
      statusCache[group][device.ip] = device;
      if(!device.online) hasError = true;
    });
    setCardStatus(group, hasError ? 'offline' : 'online');
  });
  updateTotals();
}

async function checkAll(){
  if(isChecking) return;
  isChecking=true;
  Object.keys(editableDevices).forEach(group=>setCardStatus(group,'checking'));
  try{
    const response = await fetch('http://127.0.0.1:3000/api/all');
    if(!response.ok) throw new Error('Servidor local no disponible');
    const result = await response.json();
    cacheResults(result);
    lastCheckAt = new Date();
    updateLastCheck();
    if(listView.classList.contains('active') && currentGroup && editableDevices[currentGroup]) renderTable(currentGroup, statusCache[currentGroup]);
  }catch(e){
    Object.keys(editableDevices).forEach(group=>setCardStatus(group,'offline'));
  }finally{
    isChecking=false;
  }
}

async function checkGroup(group){
  if(!editableDevices[group]) return;
  setCardStatus(group,'checking');
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/group/${encodeURIComponent(group)}`);
    if(!response.ok) throw new Error('Servidor local no disponible');
    const devices = await response.json();
    statusCache[group] = {};
    let hasError = false;
    devices.forEach(device=>{
      statusCache[group][device.ip] = device;
      if(!device.online) hasError = true;
    });
    setCardStatus(group, hasError ? 'offline' : 'online');
    updateTotals();
    lastCheckAt = new Date();
    updateLastCheck();
    if(listView.classList.contains('active') && currentGroup === group) renderTable(group,statusCache[group]);
  } catch(e) {
    setCardStatus(group,'offline');
  }
}

function updateSortMarks(){
  document.querySelectorAll('th[data-sort]').forEach(th=>{
    const mark=th.querySelector('.sortMark');
    mark.textContent=th.dataset.sort===sortState.key ? (sortState.direction==='asc' ? ' ▲' : ' ▼') : ' ↕';
  });
}

document.querySelectorAll('th[data-sort]').forEach(th=>{
  th.addEventListener('click',()=>{
    if(sortState.key===th.dataset.sort) sortState.direction=sortState.direction==='asc'?'desc':'asc';
    else { sortState.key=th.dataset.sort; sortState.direction='asc'; }
    if(currentGroup) renderTable(currentGroup,statusCache[currentGroup]||null);
    updateSortMarks();
  });
});

document.getElementById('backBtn').onclick=()=>{
  listView.classList.remove('active');
  home.classList.add('active');
  currentGroup=null;
  renderHome();
};

document.getElementById('refreshBtn').onclick=()=>{
  if(currentGroup) checkGroup(currentGroup);
  else checkAll().then(openProblems);
};

addRowBtn.onclick=()=>{
  if(!currentGroup) return;
  const newDevice={ ip:'', name:'', location:'', group:currentGroup, newRow:true };
  editableDevices[currentGroup].push(newDevice);
  renderTable(currentGroup,statusCache[currentGroup]||null);
  subtitle.textContent=`${editableDevices[currentGroup].length} IPs registradas`;
  const inputs=table.querySelectorAll('input');
  if(inputs.length) inputs[inputs.length-2].focus();
};

saveBtn.onclick=async()=>{
  if(!currentGroup) return;
  const rows=[...table.querySelectorAll('tr')];
  const current=editableDevices[currentGroup];
  rows.forEach(row=>{
    const ip=row.dataset.ip;
    const device=current.find(d=>d.ip===ip);
    if(device){
      const inputs=row.querySelectorAll('input');
      if(inputs[0]) device.name=inputs[0].value;
      if(inputs[1]) device.location=inputs[1].value;
    }
  });
  const ok=await saveConfig();
  saveBtn.textContent=ok?'✓ GUARDADO':'⚠ ERROR';
  setTimeout(()=>saveBtn.textContent='💾 GUARDAR',1200);
  renderHome();
};

onlyProblemsBtn.onclick=openProblems;
rfidPageBtn.onclick=()=>window.monitorAPI.openRfidPages();

function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('es-AR');}

async function init(){
  await loadSavedConfig();
  tick();
  setInterval(tick,1000);
  renderHome();
  updateLastCheck();
  checkAll();
  setInterval(checkAll,180000);
}

init();
