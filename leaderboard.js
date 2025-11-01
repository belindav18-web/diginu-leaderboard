(function () {
  const cfg = window.diginuLeaderboardConfig || {};
  const table = document.getElementById('diginu-lb-table');
  const tbody = table ? table.querySelector('tbody') : null;
  const updatedEl = document.getElementById('diginu-lb-updated');
  const searchEl = document.getElementById('diginu-lb-search');
  if (!tbody) return;

  const csvUrl = cfg.src + (cfg.src.includes('?') ? '&' : '?') + 'v=' + (cfg.cacheBust || Date.now());

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

  function sanitize(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[s]));
  }

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
  if (!rows.length) return;

  let [hdr, ...body] = rows;
  hdr = hdr.map(h => (h || '').toString().trim());

  const idxName = hdr.findIndex(h => /^name$/i.test(h));
  const idxSurname = hdr.findIndex(h => /^surname$/i.test(h));
  const idxMembers = hdr.findIndex(h => /^(paid\s*)?members?$/i.test(h));

  if (idxMembers === -1) {
    tbody.innerHTML = `<tr><td colspan="4">Could not find a “Members” or “Paid Members” column in the header row.</td></tr>`;
    if (updatedEl) updatedEl.textContent = 'Header not found';
    return;
  }

  const records = body
    .map(r => ({
      name: r[idxName] || '',
      surname: r[idxSurname] || '',
      members: Number((r[idxMembers] || '0').toString().replace(/[^0-9.-]/g,'')) || 0
    }))
    .filter(r => r.name || r.surname)
    .sort((a, b) => b.members - a.members);

  render(records);

  if (searchEl) {
    searchEl.addEventListener('input', e => {
      render(applyFilter(records, e.target.value));
    });
  }
})
    .catch(err => {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4">Could not load leaderboard. (${sanitize(err.message)})</td></tr>`;
      }
    });
})();
