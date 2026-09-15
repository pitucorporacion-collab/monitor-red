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

  function renderAllRackRows() {
    const body = document.getElementById('rackTableBody');
    if (!body) return;
    body.innerHTML = '';
    let rows = rackAllRows().filter(row => rackFields.every(field => {
      const q = String(rackFilters[field] || '').trim().toLocaleLowerCase('es');
      return !q || String(row[field] ?? '').toLocaleLowerCase('es').includes(q);
    }));
    const { field, dir } = rackSort;
    rows.sort((a,b) => {
      const av = String(a[field] ?? '').toLocaleLowerCase('es');
      const bv = String(b[field] ?? '').toLocaleLowerCase('es');
      return av === bv ? 0 : (av < bv ? -1 : 1) * dir;
    });
    if (!rows.length) body.innerHTML = '<tr><td colspan="9" class="empty">No hay registros que coincidan con los filtros.</td></tr>';
    else rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.dataset.rack = row.__rack; tr.dataset.index = row.__index;
      rackFields.forEach(field => {
        const td = document.createElement('td'); const input = document.createElement('input');
        input.className = 'rackCellInput'; input.value = row[field] || '';
        input.oninput = () => { const original = rackData[row.__rack]?.[row.__index]; if (original) original[field] = input.value; };
        td.appendChild(input); tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    const sub = document.getElementById('rackTableSubtitle');
    if (sub) sub.textContent = `${rackAllRows().length} equipos registrados${rows.length !== rackAllRows().length ? ` · ${rows.length} visibles` : ''}`;
  }

  async function selectRack(rack, location, button) {
    selectedRack = rack;
    document.querySelectorAll('.rackCard').forEach(el => el.classList.remove('selected'));
    if (button) button.classList.add('selected');
    const header = document.getElementById('selectedRackHeader');
    if (header) header.textContent = `RACK ${rack} - ${location}`;
    const image = document.getElementById('rackHeaderImage');
    if (image) {
      image.removeAttribute('src'); image.classList.remove('visible');
      const src = await window.monitorAPI.loadRackImage(rack);
      if (src) { image.src = src; image.classList.add('visible'); image.onclick = () => window.monitorAPI.openRackImage(rack); }
    }
    renderAllRackRows();
  }

  function renderCompactRackButtons() {
    const wrap = document.getElementById('rackButtons');
    if (!wrap) return;
    wrap.innerHTML = '';
    RACKS.forEach(([rack, location]) => {
      const b = document.createElement('button');
      b.className = 'rackCard'; b.dataset.rack = rack;
      b.innerHTML = `<strong>${rack}</strong><span>${location}</span>`;
      b.onclick = () => selectRack(rack, location, b);
      wrap.appendChild(b);
    });
  }

  function addFilterAndSortUI() {
    const thead = document.querySelector('.rackTable thead');
    if (!thead || thead.dataset.filtersReady) return;
    thead.dataset.filtersReady = '1';
    const headerRow = thead.querySelector('tr');
    headerRow.querySelectorAll('th').forEach((th, i) => {
      const field = rackFields[i]; th.style.cursor = 'pointer'; th.title = 'Ordenar';
      th.onclick = () => { if (rackSort.field === field) rackSort.dir *= -1; else { rackSort.field = field; rackSort.dir = 1; } renderAllRackRows(); };
    });
    const filterRow = document.createElement('tr'); filterRow.className = 'rackFilterRow';
    rackFields.forEach(field => {
      const th = document.createElement('th'); const input = document.createElement('input');
      input.className = 'rackColumnFilter'; input.placeholder = 'Filtrar'; input.onclick = e => e.stopPropagation();
      input.oninput = () => { rackFilters[field] = input.value; renderAllRackRows(); };
      th.appendChild(input); filterRow.appendChild(th);
    });
    thead.appendChild(filterRow);
    const toolbar = document.querySelector('.rackTableToolbar');
    if (toolbar && !toolbar.dataset.enhanced) {
      toolbar.dataset.enhanced = '1';
      const filter = document.createElement('input'); filter.className = 'rackGlobalFilter'; filter.placeholder = '🔎 Filtrar toda la tabla...';
      filter.oninput = () => { rackFields.forEach(field => rackFilters[field] = filter.value); document.querySelectorAll('.rackColumnFilter').forEach(input => input.value = filter.value); renderAllRackRows(); };
      toolbar.insertBefore(filter, toolbar.firstChild);
    }
  }

  function enhanceRacks() { renderCompactRackButtons(); addFilterAndSortUI(); renderAllRackRows(); }
  window.enhanceRacks = enhanceRacks;
  window.addEventListener('load', () => setTimeout(enhanceRacks, 0));
})();
