(() => {
  const rackFields = ['rack','sector','patch','sw','boca','marca','descripcion','hostname','ip'];
  let rackSort = { field: 'rack', dir: 1 };
  let rackFilters = Object.fromEntries(rackFields.map(f => [f, '']));

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
    return rows.sort((a,b) => {
      const av = String(a[field] ?? '').toLocaleLowerCase('es');
      const bv = String(b[field] ?? '').toLocaleLowerCase('es');
      return av === bv ? 0 : (av < bv ? -1 : 1) * dir;
    });
  }

  function matches(row) {
    return rackFields.every(field => {
      const q = String(rackFilters[field] || '').trim().toLocaleLowerCase('es');
      return !q || String(row[field] ?? '').toLocaleLowerCase('es').includes(q);
    });
  }

  function renderAllRackRows() {
    const body = document.getElementById('rackTableBody');
    if (!body) return;
    body.innerHTML = '';
    const all = rackAllRows();
    const rows = sortRackRows(all.filter(matches));

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="9" class="empty">No hay registros que coincidan con los filtros.</td></tr>';
    } else {
      rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.rack = row.__rack;
        tr.dataset.index = row.__index;
        rackFields.forEach(field => {
          const td = document.createElement('td');
          const input = document.createElement('input');
          input.className = 'rackCellInput';
          input.value = row[field] || '';
          input.dataset.field = field;
          input.oninput = () => {
            const original = rackData[row.__rack]?.[row.__index];
            if (original) original[field] = input.value;
          };
          td.appendChild(input);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }

    const sub = document.getElementById('rackTableSubtitle');
    if (sub) sub.textContent = `${all.length} equipos registrados${rows.length !== all.length ? ` · ${rows.length} visibles` : ''}`;
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
        if (img) await window.monitorAPI.openRackImage(rack);
      };
      wrap.appendChild(b);
    });
  }

  function addColumnFilters() {
    const thead = document.querySelector('.rackTable thead');
    if (!thead || thead.dataset.filtersReady) return;
    thead.dataset.filtersReady = '1';

    const headerRow = thead.querySelector('tr');
    if (!headerRow) return;

    headerRow.querySelectorAll('th').forEach((th, i) => {
      const field = rackFields[i];
      th.style.cursor = 'pointer';
      th.title = 'Ordenar';
      th.onclick = () => {
        if (rackSort.field === field) rackSort.dir *= -1;
        else { rackSort.field = field; rackSort.dir = 1; }
        renderAllRackRows();
      };
    });

    const filterRow = document.createElement('tr');
    filterRow.className = 'rackFilterRow';
    rackFields.forEach(field => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.className = 'rackColumnFilter';
      input.placeholder = 'Filtrar';
      input.value = rackFilters[field] || '';
      input.title = `Filtrar ${field.toUpperCase()}`;
      input.onclick = e => e.stopPropagation();
      input.oninput = () => {
        rackFilters[field] = input.value;
        renderAllRackRows();
      };
      th.appendChild(input);
      filterRow.appendChild(th);
    });
    thead.appendChild(filterRow);
  }

  function addFilterAndSortUI() {
    const toolbar = document.querySelector('.rackTableToolbar');
    if (!toolbar || toolbar.dataset.enhanced) return;
    toolbar.dataset.enhanced = '1';
    const filter = document.createElement('input');
    filter.className = 'rackGlobalFilter';
    filter.placeholder = '🔎 Filtrar toda la tabla...';
    filter.oninput = () => {
      const value = filter.value.trim();
      rackFields.forEach(field => rackFilters[field] = value);
      document.querySelectorAll('.rackColumnFilter').forEach((input, i) => input.value = value);
      renderAllRackRows();
    };
    toolbar.insertBefore(filter, toolbar.firstChild);
  }

  function enhanceRacks() {
    renderCompactRackButtons();
    addColumnFilters();
    addFilterAndSortUI();
    renderAllRackRows();
  }

  const oldOpenRacks = window.openRacks;
  window.openRacks = function() {
    if (oldOpenRacks) oldOpenRacks();
    requestAnimationFrame(enhanceRacks);
  };

  if (window.addRackRowBtn) window.addRackRowBtn.onclick = () => {
    const rack = selectedRack || RACKS[0][0];
    const sector = RACKS.find(([r]) => r === rack)?.[1] || '';
    if (!Array.isArray(rackData[rack])) rackData[rack] = [];
    rackData[rack].push({ rack, sector, patch:'', sw:'', boca:'', marca:'', descripcion:'', hostname:'', ip:'' });
    renderAllRackRows();
  };

  if (window.saveRackBtn) window.saveRackBtn.onclick = async () => {
    const ok = await saveRackConfig();
    saveRackBtn.textContent = ok ? '✓ GUARDADO' : '⚠ ERROR';
    setTimeout(() => saveRackBtn.textContent = '💾 GUARDAR', 1200);
    renderAllRackRows();
  };
})();
