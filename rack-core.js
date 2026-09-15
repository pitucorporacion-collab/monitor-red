const RACKS = [['01','IA DEPO'],['02','IA SALA'],['04','IA FONDO'],['05','NACIONALES'],['06','RESIDUOS'],['07','TELEVISION'],['Cel1','CEL01'],['Cel2','CEL02'],['08','NAC2'],['08b','MYT'],['09','EXPEDISION'],['09b','CALIDAD'],['10','MAT PRIMA'],['11','DEP RVF'],['12','AIRE 1'],['13','DARSENAS'],['14','AIRE 2'],['15','SALA BOMBAS'],['16','FCT'],['17','LABORATORIO'],['18','DEP NUEVO'],['19','NVR SALA'],['20','IA FONDO'],['tv1','TV 1'],['tv2','TV 2'],['tv3','TV 3'],['tv4','TV 4']];
let rackData = {};
let selectedRack = null;

async function loadRackConfig(){
  try { const saved = await window.monitorAPI.loadRackConfig(); rackData = saved && typeof saved === 'object' ? saved : {}; }
  catch(e){ rackData = {}; }
}
async function saveRackConfig(){
  try { await window.monitorAPI.saveRackConfig(rackData); return true; }
  catch(e){ return false; }
}
function openRacks(){
  const home=document.getElementById('home'), list=document.getElementById('listView'), racks=document.getElementById('racksView');
  if(!racks) return;
  home.classList.remove('active'); list.classList.remove('active'); racks.classList.add('active');
  document.getElementById('selectedRackHeader').textContent='SELECCIONE UN RACK';
  document.getElementById('rackTableSubtitle').textContent='Seleccione un rack para ver sus equipos';
  document.getElementById('rackTableBody').innerHTML='<tr><td colspan="9" class="empty">Seleccione un rack para ver sus equipos.</td></tr>';
  if(window.enhanceRacks) window.enhanceRacks();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadRackConfig();
  const racksBtn=document.getElementById('racksBtn');
  if(racksBtn) racksBtn.onclick=openRacks;
  const back=document.getElementById('racksBackBtn');
  if(back) back.onclick=()=>{ document.getElementById('racksView').classList.remove('active'); document.getElementById('home').classList.add('active'); };
  const add=document.getElementById('addRackRowBtn');
  if(add) add.onclick=()=>{
    const rack=selectedRack || RACKS[0][0];
    const sector=RACKS.find(([r])=>r===rack)?.[1] || '';
    if(!Array.isArray(rackData[rack])) rackData[rack]=[];
    rackData[rack].push({rack,sector,patch:'',sw:'',boca:'',marca:'',descripcion:'',hostname:'',ip:''});
    if(window.enhanceRacks) window.enhanceRacks();
  };
  const save=document.getElementById('saveRackBtn');
  if(save) save.onclick=async()=>{ const ok=await saveRackConfig(); save.textContent=ok?'✓ GUARDADO':'⚠ ERROR'; setTimeout(()=>save.textContent='💾 GUARDAR',1200); };
});
