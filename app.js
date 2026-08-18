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

const statusCache = {};
let lastCheckAt = null;
let isChecking = false;

function setCardStatus(group, status){
  const card = [...cards.children].find(c => c.dataset.group === group);
  if(!card) return;
  card.classList.remove('group-online','group-offline','group-checking');
  card.classList.add(`group-${status}`);
}

function renderHome(){
  cards.innerHTML='';
  let count=0;
  Object.entries(DEVICES).forEach(([group,devices])=>{
    count += devices.length;
    const card=document.createElement('div');
    card.className='card group-checking';
    card.dataset.group=group;
    card.innerHTML=`<div class="icon">${icons[group] || '🖧'}</div><h3>${group}</h3><p>${devices.length} equipos</p>`;
    card.onclick=()=>openGroup(group);
    cards.appendChild(card);
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

function openGroup(group){
  home.classList.remove('active');
  listView.classList.add('active');
  title.textContent=group;
  subtitle.textContent=`${DEVICES[group].length} IPs registradas`;
  renderTable(group, statusCache[group] || null);
}

function openProblems(){
  home.classList.remove('active');
  listView.classList.add('active');
  title.textContent='SOLO PROBLEMAS';
  const problems=[];
  Object.entries(DEVICES).forEach(([group,devices])=>{
    devices.forEach(device=>{
      const state=statusCache[group]?.[device.ip];
      if(state && !state.online) problems.push({ ...state, group });
    });
  });
  subtitle.textContent=`${problems.length} IPs con error`;
  renderProblems(problems);
}

function renderProblems(problems){
  table.innerHTML='';
  if(!problems.length){
    table.innerHTML='<tr><td colspan="4" class="empty">No hay IPs con error.</td></tr>';
    return;
  }
  problems.forEach(device=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="ip">${device.ip}</td><td>${device.name || '<span class="muted">Sin nombre</span>'}</td><td>${device.location || '<span class="muted">—</span>'}</td><td><span class="problemGroup">${device.group}</span> <span class="status offline"><span class="dot"></span>OFFLINE</span></td>`;
    table.appendChild(tr);
  });
}

function renderTable(group, statuses){
  table.innerHTML='';
  DEVICES[group].forEach(device=>{
    const state = statuses?.[device.ip];
    const tr=document.createElement('tr');
    tr.dataset.ip=device.ip;
    let statusHtml='<span class="status"><span class="dot unknown"></span>COMPROBANDO</span>';
    if(state){
      statusHtml=state.online
        ? `<span class="status online"><span class="dot"></span>ONLINE</span>`
        : '<span class="status offline"><span class="dot"></span>OFFLINE</span>';
    }
    tr.innerHTML=`<td class="ip">${device.ip}</td><td>${device.name || '<span class="muted">Sin nombre</span>'}</td><td>${device.location || '<span class="muted">—</span>'}</td><td>${statusHtml}</td>`;
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
  Object.keys(DEVICES).forEach(group=>setCardStatus(group,'checking'));
  try{
    const response = await fetch('http://127.0.0.1:3000/api/all');
    if(!response.ok) throw new Error('Servidor local no disponible');
    const result = await response.json();
    cacheResults(result);
    lastCheckAt = new Date();
    updateLastCheck();
    if(listView.classList.contains('active') && DEVICES[title.textContent]) renderTable(title.textContent, statusCache[title.textContent]);
  }catch(e){
    Object.keys(DEVICES).forEach(group=>setCardStatus(group,'offline'));
  }finally{
    isChecking=false;
  }
}

async function checkGroup(group){
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
    if(listView.classList.contains('active') && title.textContent === group) renderTable(group,statusCache[group]);
  } catch(e) {
    setCardStatus(group,'offline');
  }
}

document.getElementById('backBtn').onclick=()=>{
  listView.classList.remove('active');
  home.classList.add('active');
};

document.getElementById('refreshBtn').onclick=()=>{
  if(title.textContent === 'SOLO PROBLEMAS') checkAll().then(openProblems);
  else checkGroup(title.textContent);
};

onlyProblemsBtn.onclick=openProblems;
rfidPageBtn.onclick=()=>window.monitorAPI.openRfidPages();

function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('es-AR');}
tick();
setInterval(tick,1000);
renderHome();
updateLastCheck();
checkAll();
setInterval(checkAll,60000);
