(function(){
  const table = document.getElementById('deviceTable');
  if(!table) return;

  function isProblems(){
    return typeof currentGroup !== 'undefined' && currentGroup === null;
  }

  function findDeviceByIp(ip){
    for(const devices of Object.values(editableDevices || {})){
      const device = devices.find(d => d.ip === ip);
      if(device) return device;
    }
    return null;
  }

  function deviceFromRow(row){
    if(isProblems()){
      return findDeviceByIp(row.querySelector('.ip')?.textContent?.trim() || '');
    }
    const index = Number(row.dataset.deviceIndex);
    return editableDevices[currentGroup]?.[index] || null;
  }

  function ensureHeaders(){
    const headRow = table.closest('table')?.querySelector('thead tr');
    if(!headRow) return;

    let mac = headRow.querySelector('.macHeader');
    if(!mac){
      mac = document.createElement('th');
      mac.className = 'macHeader';
      mac.textContent = 'MAC';
      headRow.appendChild(mac);
    }

    let del = headRow.querySelector('.deleteHeader');
    if(isProblems()){
      if(del) del.remove();
    }else{
      if(!del){
        del = document.createElement('th');
        del.className = 'deleteHeader';
        del.textContent = 'ELIMINAR';
        headRow.appendChild(del);
      }
    }
  }

  function addCells(){
    ensureHeaders();
    table.querySelectorAll('tr').forEach(row => {
      const device = deviceFromRow(row);
      if(!device) return;

      if(!row.querySelector('.macCell')){
        const cell = document.createElement('td');
        cell.className = 'macCell';
        if(isProblems()){
          cell.textContent = device.mac || '';
        }else{
          const input = document.createElement('input');
          input.className = 'cellInput';
          input.placeholder = 'MAC';
          input.maxLength = 12;
          input.autocomplete = 'off';
          input.value = device.mac || '';
          input.oninput = () => {
            input.value = input.value.replace(/[^0-9a-f]/gi,'').slice(0,12).toUpperCase();
            device.mac = input.value;
          };
          cell.appendChild(input);
        }
        row.appendChild(cell);
      }

      if(!isProblems() && !row.querySelector('.deleteRowBtn')){
        const cell = document.createElement('td');
        const button = document.createElement('button');
        button.className = 'deleteRowBtn';
        button.type = 'button';
        button.textContent = '🗑';
        button.title = 'Eliminar fila';
        button.onclick = () => {
          if(!confirm('¿Está seguro de eliminar la fila?')) return;
          const index = Number(row.dataset.deviceIndex);
          if(Number.isInteger(index)){
            editableDevices[currentGroup].splice(index, 1);
            renderTable(currentGroup, statusCache[currentGroup] || null);
            subtitle.textContent = `${editableDevices[currentGroup].length} IPs registradas`;
            renderHome();
          }
        };
        cell.appendChild(button);
        row.appendChild(cell);
      }
    });
  }

  const observer = new MutationObserver(addCells);
  observer.observe(table, {childList:true, subtree:true});
  addCells();
})();
