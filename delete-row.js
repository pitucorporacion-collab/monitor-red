(function(){
  const table = document.getElementById('deviceTable');
  if(!table) return;

  function createConfirmModal(onYes){
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box=document.createElement('div');
    box.style.cssText='background:#202733;border:1px solid #3b4658;border-radius:10px;padding:20px;min-width:300px;max-width:90%;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,.45);';
    const text=document.createElement('div');
    text.textContent='¿Está seguro de eliminar la fila?';
    text.style.cssText='font-size:14px;color:#fff;margin-bottom:18px;';
    const actions=document.createElement('div');
    actions.style.cssText='display:flex;gap:10px;justify-content:center;';
    const no=document.createElement('button');
    no.textContent='NO';
    no.className='smallAction';
    const yes=document.createElement('button');
    yes.textContent='SÍ';
    yes.className='smallAction';
    actions.append(no,yes);
    box.append(text,actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    no.onclick=()=>overlay.remove();
    yes.onclick=()=>{overlay.remove();onYes();};
  }

  function addDeleteButtons(){
    if(typeof currentGroup==='undefined' || !currentGroup) return;
    table.querySelectorAll('tr').forEach(row=>{
      if(row.querySelector('.deleteRowBtn')) return;
      if(row.dataset.deviceIndex===undefined) return;
      const cell=document.createElement('td');
      const btn=document.createElement('button');
      btn.className='smallAction deleteRowBtn';
      btn.textContent='🗑';
      btn.title='Eliminar fila';
      btn.setAttribute('aria-label','Eliminar fila');
      btn.style.cssText='padding:4px 8px;min-width:32px;';
      btn.onclick=()=>createConfirmModal(()=>{
        const index=Number(row.dataset.deviceIndex);
        if(!Number.isInteger(index) || !editableDevices[currentGroup]?.[index]) return;
        editableDevices[currentGroup].splice(index,1);
        renderTable(currentGroup,statusCache[currentGroup]||null);
        subtitle.textContent=`${editableDevices[currentGroup].length} IPs registradas`;
        if(typeof renderHome==='function') renderHome();
      });
      cell.appendChild(btn);
      row.appendChild(cell);
    });
  }

  const observer=new MutationObserver(addDeleteButtons);
  observer.observe(table,{childList:true,subtree:true});
  addDeleteButtons();
})();
