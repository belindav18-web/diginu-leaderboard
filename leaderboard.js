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
    const lm = r.headers.get('Last-Modified');
    if (lm && updatedEl) {
      try { updatedEl.textContent = `Last updated: ${new Date(lm).toLocaleString()}`; } catch(_) {}
    }
    return r.text();
  })
  .then(txt => {
    const rows = parseCSV(txt);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4">No data found in CSV.</td></tr>`;
      return;
    }

    // Split header/body and normalize/trim header cells
    let [hdr, ...body] = rows;
    // Normalize header cells: strip BOM, trim, collapse spaces, lowercase
const H = hdr.map(function (h) {
  return String(h || '').replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' ').toLowerCase();
});

// Find columns (accept common aliases)
const idxName    = H.indexOf('name');
const idxSurname = H.indexOf('surname');
const idxMembers = (function () {
  var aliases = ['members', 'member', 'paid members', 'paid member', 'signups', 'signup'];
  for (var i = 0; i < H.length; i++) {
    if (aliases.indexOf(H[i]) !== -1) return i;
  }
  return -1;
})();

// Fail early with a clear message if not found
if (idxName === -1 || idxSurname === -1 || idxMembers === -1) {
  tbody.innerHTML = '<tr><td colspan="4">Missing header in row 1. Make sure it has Name, Surname and Members (or Paid Members / Signups).</td></tr>';
  if (updatedEl) updatedEl.textContent = 'Header not found';
  return;
}
    // Find indices (accepts "members" or "paid members")
    const idxName = hdrNorm.indexOf('name');
    const idxSurname = hdrNorm.indexOf('surname');
    const idxMembers = hdrNorm.indexOf('members') !== -1
      ? hdrNorm.indexOf('members')
      : hdrNorm.indexOf('paid members');

    // (Optional) debug – helps confirm what the sheet sends
    try {
      console.log('[diginu-leaderboard] header raw:', hdr);
      console.log('[diginu-leaderboard] header norm:', hdrNorm);
      console.log('[diginu-leaderboard] idxName=%s idxSurname=%s idxMembers=%s', idxName, idxSurname, idxMembers);
    } catch(_) {}

    if (idxName === -1 || idxSurname === -1 || idxMembers === -1) {
      const missing = [];
      if (idxName === -1) missing.push('Name');
      if (idxSurname === -1) missing.push('Surname');
      if (idxMembers === -1) missing.push('Members (or Paid Members)');
      tbody.innerHTML = `<tr><td colspan="4">Missing header(s): ${missing.join(', ')}. Make sure row 1 is exactly "Name, Surname, Members".</td></tr>`;
      if (updatedEl) updatedEl.textContent = 'Header not found';
      return;
    }

  const records = body.map(function (r) {
  var raw = (r[idxMembers] || '0').toString().trim();
  var members = Number(
    raw.replace(/\u00A0/g, ' ') // NBSP → space
       .replace(/[ ,]/g, '')    // remove spaces/commas
       .replace(/[^0-9.-]/g, '')
  ) || 0;
  return {
    name: r[idxName] || '',
    surname: r[idxSurname] || '',
    members: members
  };
}).filter(function (r) { return r.name || r.surname; })
  .sort(function (a, b) { return b.members - a.members; });


    render(records);

    if (searchEl) {
      searchEl.addEventListener('input', e => {
        render(applyFilter(records, e.target.value));
      });
    }
  })
  .catch(err => {
    tbody.innerHTML = `<tr><td colspan="4">Could not load leaderboard. (${sanitize(err.message)})</td></tr>`;
  });
