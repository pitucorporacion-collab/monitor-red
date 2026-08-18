const icons = { APS:'📡', SW:'🔀', CAM:'📷', RFID:'🏷️', MPC:'🖥️', SATO:'🖨️', LEXMARK:'🖨️' };
const home = document.getElementById('home');
const listView = document.getElementById('listView');
const cards = document.getElementById('groupCards');
const table = document.getElementById('deviceTable');
const title = document.getElementById('listTitle');
const subtitle = document.getElementById('listSubtitle');
const total = document.getElementById('total');

function renderHome(){
  cards.innerHTML='';
  let count=0;
  Object.entries(DEVICES).forEach(([group,devices])=>{
    count += devices.length;
    const card=document.createElement('div');
    card.className='card '+group.toLowerCase();
    card.innerHTML=`<div class="icon">${icons[group]}</div><h3>${group}</h3><p>${devices.length} equipos</p>`;
    card.onclick=()=>openGroup(group);
    cards.appendChild(card);
  });
  total.textContent=`${count} equipos cargados`;
}

function openGroup(group){
  home.classList.remove('active');
  listView.classList.add('active');
  title.textContent=group;
  subtitle.textContent=`${DEVICES[group].length} equipos registrados`;
  renderTable(group);
}

function renderTable(group){
  table.innerHTML='';
  DEVICES[group].forEach(device=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="ip">${device.ip}</td><td>${device.name || '<span class="muted">Sin nombre</span>'}</td><td>${device.location || '<span class="muted">—</span>'}</td><td><span class="status"><span class="dot unknown"></span>PENDIENTE</span></td>`;
    table.appendChild(tr);
  });
}

document.getElementById('backBtn').onclick=()=>{
  listView.classList.remove('active');
  home.classList.add('active');
};

document.getElementById('refreshBtn').onclick=()=>{
  const group=title.textContent;
  renderTable(group);
};

function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('es-AR');}
tick(); setInterval(tick,1000); renderHome();
