(function () {
  const cfg = window.diginuLeaderboardConfig || {};
  const table = document.getElementById('diginu-lb-table');
  const tbody = table ? table.querySelector('tbody') : null;
  const updatedEl = document.getElementById('diginu-lb-updated');
  const searchEl = document.getElementById('diginu-lb-search');
  if (!tbody) return;

  console.log('[diginu-leaderboard] script loaded');

  // Cache-buster so updates reflect quickly
  const csvUrl = cfg.src + (cfg.src.includes('?') ? '&' : '?') + 'v=' + (cfg.cacheBust || Date.now());

  // CSV parser (handles quotes)
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
    return String(str || '').replace(/[&<>"']/g, function(s) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s];
    });
  }

  // Normalize a header cell (strip BOM, trim, collapse spaces, lowercase)
  function normHeader(s) {
    return String(s || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  // Render table rows
  function render(data) {
    tbody.innerHTML = '';
    const limit = Number(cfg.limit) || 0;
    const list = limit > 0 ? data.slice(0, limit) : data;

    list.forEach(function(r, idx) {
      const tr = document.createElement('tr');
      tr.innerHTML = ''
        + '<td class="rank"><span class="badge">' + (idx + 1) + '</span></td>'
        + '<td>' + sanitize(r.name) + '</td>'
        + '<td>' + sanitize(r.surname) + '</td>'
        + '<td>' + sanitize(r.members) + '</td>';
      tbody.appendChild(tr);
    });
  }

  // Client-side search
  function applyFilter(data, q) {
    if (!q) return data;
    const s = q.toLowerCase().trim();
    return data.filter(function(r){
      return (r.name || '').toLowerCase().indexOf(s) !== -1
          || (r.surname || '').toLowerCase().indexOf(s) !== -1;
    });
  }

  fetch(csvUrl, { cache: 'no-store' })
    .then(function(r) {
      const lm = r.headers.get('Last-Modified');
      if (lm && updatedEl) {
        try {
          updatedEl.textContent = 'Last updated: ' + new Date(lm).toLocaleString();
        } catch (e) {}
      }
      return r.text();
    })
    .then(function(txt) {
      const rows = parseCSV(txt);
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="4">No data found in CSV.</td></tr>';
        return;
      }

      // Split header/body and normalize headers
      var hdr = rows[0] || [];
      var body = rows.slice(1);
      var H = hdr.map(normHeader);

      // Find columns: accept Members, Paid Members, Signups as fallback
      var idxName    = H.indexOf('name');
      var idxSurname = H.indexOf('surname');

      var idxMembers = (function () {
        var aliases = ['members', 'paid members', 'member', 'paid member', 'signups', 'signup'];
        for (var i = 0; i < H.length; i++) {
          if (aliases.indexOf(H[i]) !== -1) return i;
        }
        return -1;
      })();

      // Debug — helps verify what the sheet sends
      try {
        console.log('[diginu-leaderboard] header raw:', hdr);
        console.log('[diginu-leaderboard] header norm:', H);
        console.log('[diginu-leaderboard] idxName=%s idxSurname=%s idxMembers=%s', idxName, idxSurname, idxMembers);
      } catch (e) {}

      if (idxName === -1 || idxSurname === -1 || idxMembers === -1) {
        var missing = [];
        if (idxName === -1) missing.push('Name');
        if (idxSurname === -1) missing.push('Surname');
        if (idxMembers === -1) missing.push('Members (or Paid Members / Signups)');
        tbody.innerHTML = '<tr><td colspan="4">Missing header(s): ' + sanitize(missing.join(', ')) + '. Ensure row 1 is exactly "Name, Surname, Members".</td></tr>';
        if (updatedEl) updatedEl.textContent = 'Header not found';
        return;
      }

      // Map rows → objects, robust numeric parse
      var records = body.map(function(r) {
        var name = r[idxName] || '';
        var surname = r[idxSurname] || '';
        var raw = (r[idxMembers] || '0').toString().trim();
        var members = Number(
          raw.replace(/\u00A0/g, ' ') // NBSP → space
             .replace(/[ ,]/g, '')    // remove spaces/commas
             .replace(/[^0-9.-]/g, '') // safety
        ) || 0;

        return { name: name, surname: surname, members: members };
      }).filter(function (r) {
        return r.name || r.surname;
      }).sort(function (a, b) {
        return b.members - a.members;
      });

      render(records);

      if (searchEl) {
        searchEl.addEventListener('input', function(e) {
          render(applyFilter(records, e.target.value));
        });
      }
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="4">Could not load leaderboard. (' + sanitize(err.message) + ')</td></tr>';
    });
})();
