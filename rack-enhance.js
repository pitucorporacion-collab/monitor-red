(() => {
  const rackFields = ['rack','sector','patch','sw','boca','marca','descripcion','hostname','ip'];
  let rackSort = { field: 'rack', dir: 1 };
  let rackFilter = '';

  function rackAllRows() {
    const rows = [];
    RACKS.forEach(([rack, sector]) => {
      if (!Array.isArray(rackData[rack])) rackData[rack] = [];
      rackData[rack].forEach((row, index) => rows.push({ ...row, rack: row.rack || rack, sector: row.sector || sector, __rack: rack, __index: index }));
    });
    return rows;
  }
  function sortRackRows(rows) {
    const { field, dir } = rackSort;
    return rows.sort((a,b) => { const av=String(a[field]??'').toLocaleLowerCase('es'); const bv=String(b[field]??'').toLocaleLowerCase('es'); return av===bv?0:(av<bv?-1:1)*dir; });
  }
  function matches(row) { if(!rackFilter)return true; const q=rackFilter.toLocaleLowerCase('es'); return rackFields.some(f=>String(row[f]??'').toLocaleLowerCase('es').includes(q)); }
  function renderAllRackRows() {
    const body=document.getElementById('rackTableBody'); if(!body)return; body.innerHTML=''; let rows=sortRackRows(rackAllRows().filter(matches));
    if(!rows.length){body.innerHTML='<tr><td colspan="9" class="empty">No hay registros que coincidan con el filtro.</td></tr>';}
    else rows.forEach(row=>{const tr=document.createElement('tr');tr.dataset.rack=row.__rack;tr.dataset.index=row.__index;rackFields.forEach(field=>{const td=document.createElement('td'),input=document.createElement('input');input.className='rackCellInput';input.value=row[field]||'';input.dataset.field=field;input.oninput=()=>{const original=rackData[row.__rack]?.[row.__index];if(original)original[field]=input.value;};td.appendChild(input);tr.appendChild(td);});body.appendChild(tr);});
    const sub=document.getElementById('rackTableSubtitle'); if(sub){const count=rackAllRows().length;sub.textContent=`${count} equipos registrados${rackFilter?` · ${rows.length} visibles`:''}`;}
  }
  function renderCompactRackButtons(){
    const wrap=document.getElementById('rackButtons');if(!wrap)return;wrap.innerHTML='';
    RACKS.forEach(([rack,location])=>{const b=document.createElement('button');b.className='rackCard';b.dataset.rack=rack;b.title=`Abrir foto de ${rack} - ${location}`;b.innerHTML=`<strong>${rack}</strong><span>${location}</span>`;b.onclick=async()=>{const img=await window.monitorAPI.loadRackImage(rack);if(img)await window.monitorAPI.openRackImage(rack);};wrap.appendChild(b);});
  }
  function addFilterAndSortUI(){
    const toolbar=document.querySelector('.rackTableToolbar');if(!toolbar||toolbar.dataset.enhanced)return;toolbar.dataset.enhanced='1';
    const filter=document.createElement('input');filter.className='rackGlobalFilter';filter.placeholder='🔎 Filtrar...';filter.oninput=()=>{rackFilter=filter.value.trim();renderAllRackRows();};toolbar.insertBefore(filter,toolbar.firstChild);
    document.querySelectorAll('.rackTable th').forEach((th,i)=>{th.style.cursor='pointer';th.title='Ordenar';th.onclick=()=>{const field=rackFields[i];if(rackSort.field===field)rackSort.dir*=-1;else{rackSort.field=field;rackSort.dir=1;}renderAllRackRows();};});
  }
  function enhanceRacks(){renderCompactRackButtons();addFilterAndSortUI();renderAllRackRows();}
  const oldOpenRacks=window.openRacks;window.openRacks=function(){if(oldOpenRacks)oldOpenRacks();requestAnimationFrame(enhanceRacks);};
  if(window.addRackRowBtn)window.addRackRowBtn.onclick=()=>{const [rack,sector]=RACKS[0];if(!Array.isArray(rackData[rack]))rackData[rack]=[];rackData[rack].push({rack,sector,patch:'',sw:'',boca:'',marca:'',descripcion:'',hostname:'',ip:''});renderAllRackRows();};
  if(window.saveRackBtn)window.saveRackBtn.onclick=async()=>{const ok=await saveRackConfig();saveRackBtn.textContent=ok?'✓ GUARDADO':'⚠ ERROR';setTimeout(()=>saveRackBtn.textContent='💾 GUARDAR',1200);renderAllRackRows();};
})();
