(() => {
  const rackFields = ['rack','sector','patch','sw','boca','marca','descripcion','hostname','ip'];
  let rackSort = { field: 'rack', dir: 'asc' };
  let rackFilter = '';

  function rackAllRows() {
    const rows = [];
    RACKS.forEach(([rack, sector]) => {
      if (!Array.isArray(rackData[rack])) rackData[rack] = [];
      rackData[rack].forEach(row => rows.push({ ...row, rack: row.rack || rack, sector: row.sector || sector }));
    });
    return rows;
  }

  function sortRackRows(rows) {
    const { field, dir } = rackSort;
    return rows.sort((a,b) => {
      const av = String(a[field] ?? '').toLocaleLowerCase('es');
      const bv = String(b[field] ?? '').toLocaleLowerCase('es');
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * dir;
    });
  }

  function matches(row) {
    if (!rackFilter) return true;
    const q = rackFilter.toLocaleLowerCase('es');
    return rackFields.some(f => String(row[f] ?? '').toLocaleLowerCase('es').includes(q));
  }

  function renderAllRackRows() {
    const body = document.getElementById('rackTableBody');
    if (!body) return;
    body.innerHTML = '';
    let rows = rackAllRows().filter(matches);
    sortRackRows(rows);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="9" class="empty">No hay registros que coincidan con el filtro.</td></tr>';
    } else {
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.dataset.rack = row.rack;
        tr.dataset.rowId = row.__id || '';
        rackFields.forEach(field => {
          const td = document.createElement('td');
          const input = document.createElement('input');
          input.className = 'rackCellInput';
          input.value = row[field] || '';
          input.dataset.field = field;
          input.oninput = () => {
            const original = (rackData[row.rack] || []).find(x => x.__id === row.__id) || row;
            original[field] = input.value;
            if (!original.__id) original.__id = `${Date.now()}-${Math.random()}`;
            if (!rackData[row.rack]) rackData[row.rack] = [];
            if (!rackData[row.rack].includes(original)) rackData[row.rack].push(original);
          };
          td.appendChild(input);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }
    const count = rackAllRows().length;
    const sub = document.getElementById('rackTableSubtitle');
    if (sub) sub.textContent = `${count} equipos registrados${rackFilter ? ` · ${rows.length} visibles` : ''}`;
  }

  function renderCompactRackButtons() {
    const wrap = document.getElementById('rackButtons');
    if (!wrap) return;
    wrap.innerHTML = '';
    RACKS.forEach(([rack, location]) => {
      const b = document.createElement('button');
      b.className = 'rackCard';
      b.dataset.rack = rack;
      b.title = `Abrir foto de ${rack} - ${location}`;
      b.innerHTML = `<strong>${rack}</strong><span>${location}</span>`;
      b.onclick = async () => {
        const img = await window.monitorAPI.loadRackImage(rack);
        if (img) {
          await window.monitorAPI.openRackImage(rack);
        } else {
          selectedRackHeader.textContent = `RACK ${rack} - ${location}`;
          rackHeaderImage.removeAttribute('src');
          rackHeaderImage.classList.remove('visible');
        }
      };
      wrap.appendChild(b);
    });
  }

  function addFilterAndSortUI() {
    const toolbar = document.querySelector('.rackTableToolbar');
    if (!toolbar || toolbar.dataset.enhanced) return;
    toolbar.dataset.enhanced = '1';
    const filter = document.createElement('input');
    filter.className = 'rackGlobalFilter';
    filter.placeholder = '🔎 Filtrar como Excel...';
    filter.oninput = () => { rackFilter = filter.value.trim(); renderAllRackRows(); };
    toolbar.insertBefore(filter, toolbar.firstChild);

    document.querySelectorAll('.rackTable th').forEach((th, i) => {
      th.style.cursor = 'pointer';
      th.title = 'Ordenar';
      th.onclick = () => {
        const field = rackFields[i];
        if (rackSort.field === field) rackSort.dir *= -1;
        else { rackSort.field = field; rackSort.dir = 1; }
        renderAllRackRows();
      };
    });
  }

  function enhanceRacks() {
    renderCompactRackButtons();
    addFilterAndSortUI();
    renderAllRackRows();
  }

  const oldOpenRacks = window.openRacks;
  window.openRacks = function() {
    if (oldOpenRacks) oldOpenRacks();
    requestAnimationFrame(enhanceRacks);
  };

  const oldAdd = window.addRackRowBtn?.onclick;
  if (window.addRackRowBtn) {
    window.addRackRowBtn.onclick = () => {
      const rack = RACKS[0][0];
      if (!Array.isArray(rackData[rack])) rackData[rack] = [];
      rackData[rack].push({ __id: `${Date.now()}-${Math.random()}`, rack, sector: RACKS[0][1], patch:'', sw:'', boca:'', marca:'', descripcion:'', hostname:'', ip:'' });
      renderAllRackRows();
    };
  }

  if (window.saveRackBtn) {
    window.saveRackBtn.onclick = async () => {
      const ok = await saveRackConfig();
      saveRackBtn.textContent = ok ? '✓ GUARDADO' : '⚠ ERROR';
      setTimeout(() => saveRackBtn.textContent = '💾 GUARDAR', 1200);
      renderAllRackRows();
    };
  }

  const observer = new MutationObserver(() => {
    if (racksView.classList.contains('active')) enhanceRacks();
  });
  observer.observe(document.getElementById('rackButtons'), { childList: true });
})();
