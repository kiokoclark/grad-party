/* ══════════════════════════════════════════
   ADMIN — depends on globals from app.js
   (guestList, responses, settings, editingIdx,
    adminUnlocked, save, showView, toast, download,
    applySettings)
══════════════════════════════════════════ */

function enterAdmin() {
  showView('adminView');
  if (adminUnlocked) { showAdminPanel(); }
}

async function checkAdminPw() {
  const pw = document.getElementById('adminPw').value;
  if (!pw) { document.getElementById('adminPwError').textContent = 'Please enter a password.'; return; }

  // First-time setup: no password has been set yet
  if (!settings.adminPwHash) {
    const hash = await hashPassword(pw);
    settings.adminPwHash = hash;
    save();
    adminUnlocked = true;
    document.getElementById('adminPwError').textContent = '';
    showAdminPanel();
    toast('Admin password set!');
    return;
  }

  const hash = await hashPassword(pw);
  if (hash === settings.adminPwHash) {
    adminUnlocked = true;
    document.getElementById('adminPwError').textContent = '';
    showAdminPanel();
  } else {
    document.getElementById('adminPwError').textContent = 'Incorrect password.';
  }
}

function adminLogout() {
  adminUnlocked = false;
  document.getElementById('adminLogin').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminPw').value = '';
  showView('rsvpView');
}

function showAdminPanel() {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  renderGuestTable();
  renderResponseTable();
  loadSettings();
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

/* ── Guest Table ── */
function renderGuestTable() {
  const tbody = document.getElementById('guestTbody');
  tbody.innerHTML = '';
  document.getElementById('guestEmpty').style.display = guestList.length ? 'none' : 'block';

  guestList.forEach((g, i) => {
    const tr = document.createElement('tr');
    let badges = '';
    if (g.plusOne)   badges += '<span class="badge badge-plus">+ Plus One</span>';
    if (g.children)  badges += '<span class="badge badge-child">Children</span>';
    if (!g.plusOne && !g.children) badges = '<span class="badge badge-none">No extras</span>';
    tr.innerHTML = `
      <td><strong>${g.firstName}</strong> ${g.lastName}</td>
      <td>${badges}</td>
      <td>
        <button class="icon-btn" onclick="editGuest(${i})" title="Edit">✏️</button>
        <button class="icon-btn del" onclick="deleteGuest(${i})" title="Delete">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function saveGuest() {
  const first = document.getElementById('agFirst').value.trim();
  const last  = document.getElementById('agLast').value.trim();
  document.getElementById('agError').textContent = '';
  if (!first || !last) { document.getElementById('agError').textContent = 'First and last name are required.'; return; }

  const guest = {
    firstName: first,
    lastName:  last,
    plusOne:   document.getElementById('agPlusOne').checked,
    children:  document.getElementById('agChildren').checked
  };

  if (editingIdx !== null) {
    guestList[editingIdx] = guest;
    editingIdx = null;
  } else {
    guestList.push(guest);
  }
  save();
  renderGuestTable();
  clearAddForm();
  toast('Guest saved!');
}

function editGuest(i) {
  const g = guestList[i];
  document.getElementById('agFirst').value   = g.firstName;
  document.getElementById('agLast').value    = g.lastName;
  document.getElementById('agPlusOne').checked = g.plusOne;
  document.getElementById('agChildren').checked = g.children;
  document.getElementById('guestFormTitle').textContent = 'Edit Guest';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  editingIdx = i;
  document.getElementById('addGuestForm').scrollIntoView({behavior:'smooth'});
}

function cancelEdit() {
  editingIdx = null;
  clearAddForm();
}

function clearAddForm() {
  document.getElementById('agFirst').value = '';
  document.getElementById('agLast').value  = '';
  document.getElementById('agPlusOne').checked   = false;
  document.getElementById('agChildren').checked  = false;
  document.getElementById('guestFormTitle').textContent = 'Add a Guest';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('agError').textContent = '';
}

function deleteGuest(i) {
  if (!confirm('Remove ' + guestList[i].firstName + ' ' + guestList[i].lastName + ' from the list?')) return;
  guestList.splice(i, 1);
  save();
  renderGuestTable();
  toast('Guest removed.');
}

function exportGuestList() {
  download('guest-list.json', JSON.stringify(guestList, null, 2));
}
function importGuestList() { document.getElementById('importFile').click(); }
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        guestList = data;
        save();
        renderGuestTable();
        toast('Imported ' + data.length + ' guests.');
      }
    } catch { alert('Invalid JSON file.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ── Response Table ── */
function renderResponseTable() {
  const tbody = document.getElementById('respTbody');
  tbody.innerHTML = '';
  document.getElementById('respEmpty').style.display = responses.length ? 'none' : 'block';
  responses.slice().reverse().forEach(r => {
    const tr = document.createElement('tr');
    const t = r.timestamp ? new Date(r.timestamp).toLocaleString() : '—';
    tr.innerHTML = `
      <td>${r.name}</td>
      <td class="${r.attending==='yes'?'going':'not-going'}">${r.attending==='yes'?'Yes':'No'}</td>
      <td>${r.dietary||'—'}</td>
      <td>${r.plusOne==='yes'?r.plusOneName||'Yes':'No'}</td>
      <td>${r.children==='yes'?r.childNames||'Yes':'No'}</td>
      <td style="color:var(--muted);white-space:nowrap;">${t}</td>`;
    tbody.appendChild(tr);
  });
}

function exportResponses() {
  const header = 'Name,Attending,Dietary,PlusOne,PlusOneName,Children,ChildNames,Timestamp';
  const rows = responses.map(r =>
    [r.name,r.attending,r.dietary||'',r.plusOne||'',r.plusOneName||'',r.children||'',r.childNames||'',r.timestamp||'']
    .map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')
  );
  download('rsvp-responses.csv', [header,...rows].join('\n'));
}

function clearResponses() {
  if (!confirm('Clear all locally saved responses? This cannot be undone.')) return;
  responses = [];
  save();
  renderResponseTable();
  toast('Local responses cleared.');
}

/* ── Settings ── */
function loadSettings() {
  document.getElementById('settingTitle').value    = settings.title;
  document.getElementById('settingSubtitle').value = settings.subtitle;
  document.getElementById('settingAdminPw').value  = '';
  document.getElementById('settingSheetUrl').value = settings.sheetUrl;
  document.getElementById('settingLocalOnly').checked = settings.localOnly;
}

async function saveSettings() {
  settings.title    = document.getElementById('settingTitle').value.trim() || settings.title;
  settings.subtitle = document.getElementById('settingSubtitle').value.trim() || settings.subtitle;
  const newPw = document.getElementById('settingAdminPw').value.trim();
  if (newPw) settings.adminPwHash = await hashPassword(newPw);
  settings.sheetUrl  = document.getElementById('settingSheetUrl').value.trim();
  settings.localOnly = document.getElementById('settingLocalOnly').checked;
  save();
  applySettings();
  toast('Settings saved!');
}

if (location.hash === '#admin-for-sam') enterAdmin();
