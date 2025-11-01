(function () {
  const cfg = window.diginuLeaderboardConfig || {};
  const table = document.getElementById('diginu-lb-table');
  const tbody = table ? table.querySelector('tbody') : null;
  const updatedEl = document.getElementById('diginu-lb-updated');
  const searchEl = document.getElementById('diginu-lb-search');
  if (!tbody) return;

  // Add a cache-buster so updates show when you edit the sheet
  const csvUrl = cfg.src + (cfg.src.includes('?') ? '&' : '?') + 'v=' + (cfg.cacheBust || Date.now());

  // Simple CSV parser with quoted-field support
  function parseCSV(text) {
    const rows = [];
    let i = 0, field = '', row = [], inQuotes = false;
    while (i < text.length) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        row.push(field); field = '';
      } else if ((c === '\n' || c === '\r') && !inQuotes) {
        if (field.length || row.length) { row.push(field); rows.push(row); }
        field = ''; row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else {
        field += c;
      }
      i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Escape HTML
  function sanitize(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[s]));
  }

  // Normalize a header cell (remove BOM, trim, unify spaces, lowercase)
  function normHeader(s) {
    return String(s || '')
      .replace(/^\uFEFF/, '')     // strip UTF-8 BOM if present
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  // Render table body
  function render(data) {
    tbody.innerHTML = '';
    const limit = Number(cfg.limit) || 0;
    const list = limit > 0 ? data.slice(0, limit) : data;

    list.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rank"><span class="badge">${idx + 1}</span></td>
        <td>${sanitize(r.name)}</td>
        <td>${sanitize(r.surname)}</td>
        <td>${sanitize(r.members)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Client-side search by name/surname
  function applyFilter(data, q) {
    if (!q) return data;
    const s = q.toLowerCase().trim();
    return data.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.surname || '').toLowerCase().includes(s)
    );
  }

  fetch(csvUrl, { cache: 'no-store' })
    .then(r => {
      // Show Last-Modified if present
      const lm = r.headers.get('Last-Modified');
      if (lm && updatedEl) {
        try {
          const dt = new Date(lm);
          updatedEl.textContent = `Last updated: ${dt.toLocaleString()}`;
        } catch (_) {}
      }
      return r.text();
    })
    .then(txt => {
      const rows = parseCSV(txt);
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="4">No data found in CSV.</td></tr>`;
        return;
      }

      // Split header/body and normalize header cells
      let [hdr, ...body] = rows;
      const hdrNorm = hdr.map(normHeader);

      // Find indices (accept "members" or "paid members")
      const idxName = hdrNorm.indexOf('name');
