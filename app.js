const icons = { APS:'📡', SW:'🔀', CAM:'📷', RFID:'🏷️', MPC:'🖥️', SATO:'🖨️', LEXMARK:'🖨️' };
const home = document.getElementById('home');
const listView = document.getElementById('listView');
const cards = document.getElementById('groupCards');
const table = document.getElementById('deviceTable');
const title = document.getElementById('listTitle');
const subtitle = document.getElementById('listSubtitle');
const total = document.getElementById('total');

const statusCache = {};

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
  total.innerHTML=`<span class="count">${count}</span> IPs contabilizadas`;
}

function openGroup(group){
  home.classList.remove('active');
  listView.classList.add('active');
  title.textContent=group;
  subtitle.textContent=`${DEVICES[group].length} IPs registradas`;
  renderTable(group, statusCache[group] || null);
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
        ? `<span class="status online"><span class="dot"></span>ONLINE · ${state.latency != null ? state.latency + ' ms' : 'ONLINE'}</span>`
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
}

async function checkAll(){
  Object.keys(DEVICES).forEach(group=>setCardStatus(group,'checking'));
  try{
    const response = await fetch('http://127.0.0.1:3000/api/all');
    if(!response.ok) throw new Error('Servidor local no disponible');
    const result = await response.json();
    cacheResults(result);
    if(listView.classList.contains('active')) renderTable(title.textContent, statusCache[title.textContent]);
  }catch(e){
    Object.keys(DEVICES).forEach(group=>setCardStatus(group,'offline'));
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
    if(listView.classList.contains('active') && title.textContent === group) renderTable(group,statusCache[group]);
  } catch(e) {
    setCardStatus(group,'offline');
    if(listView.classList.contains('active') && title.textContent === group){
      [...table.rows].forEach(row=>row.cells[3].innerHTML='<span class="status offline"><span class="dot"></span>SERVIDOR NO INICIADO</span>');
    }
  }
}

document.getElementById('backBtn').onclick=()=>{
  listView.classList.remove('active');
  home.classList.add('active');
};

document.getElementById('refreshBtn').onclick=()=>checkGroup(title.textContent);

function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('es-AR');}
tick();
setInterval(tick,1000);
renderHome();
checkAll();
