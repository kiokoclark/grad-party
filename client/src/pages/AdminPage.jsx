import { useState, useEffect } from 'react';
import {
  adminLogin, changePassword,
  getGuests, addGuest, updateGuest, deleteGuest, importGuests,
  getResponses, clearResponses,
} from '../api';

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem('adminToken'));

  function handleLogin(token) {
    sessionStorage.setItem('adminToken', token);
    setLoggedIn(true);
  }
  function handleLogout() {
    sessionStorage.removeItem('adminToken');
    setLoggedIn(false);
  }

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;
  return <AdminPanel onLogout={handleLogout} />;
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  async function handleSubmit() {
    setErr('');
    const res = await adminLogin(pw);
    if (res.token) {
      onLogin(res.token);
    } else {
      setErr(res.error || 'Incorrect password.');
    }
  }

  return (
    <div className="page">
      <header className="site-header">
        <span className="eyebrow">For Sam</span>
        <h1>Guest Manager</h1>
        <div className="divider">
          <svg className="illustrated-marg" viewBox="0 0 44 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="currentColor" d="M 4,8 C 4,18 12,26 14,26 L 26,26 C 28,26 36,18 36,8 Z"/>
            <rect fill="currentColor" x="18" y="26" width="4" height="10" rx="1"/>
            <rect fill="currentColor" x="9" y="39" width="22" height="3" rx="1.5"/>
            <path fill="#4caf50" d="M 28,8 A 6,6 0 0,1 40,8 Z"/>
          </svg>
        </div>
      </header>
      <div className="view active">
        <div className="card" style={{padding: '32px 28px'}}>
          <div className="admin-login">
            <h2>Admin Access</h2>
            <p>Enter your admin password to manage the guest list.</p>
            <div className="form-group">
              <label htmlFor="adminPw">Password</label>
              <input type="password" id="adminPw" placeholder="Enter admin password"
                value={pw} onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit}>Unlock</button>
            {err && <div className="field-error" style={{marginTop:10,textAlign:'center'}}>{err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('guests');
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  return (
    <div className="page admin-page">
      <div className="view active">
        <div className="card admin-card" style={{padding: '32px 28px'}}>
          <div className="admin-bar">
            <h2>Guest Manager</h2>
            <button className="btn btn-secondary" onClick={onLogout}>Sign out</button>
          </div>
          <div className="admin-tabs">
            {['guests','responses','settings'].map(t => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {tab === 'guests'    && <GuestsTab    toast={showToast} />}
          {tab === 'responses' && <ResponsesTab toast={showToast} />}
          {tab === 'settings'  && <SettingsTab  toast={showToast} />}
        </div>
      </div>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

function GuestsTab({ toast }) {
  const [guests, setGuests] = useState([]);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [plusOne, setPlusOne] = useState(false);
  const [children, setChildren] = useState(false);
  const [partyTag, setPartyTag] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);
  async function load() { setGuests(await getGuests()); }

  function startEdit(g) {
    setFirst(g.firstName); setLast(g.lastName);
    setPlusOne(g.plusOne); setChildren(g.children);
    setPartyTag(g.partyTag || '');
    setEditingId(g.id); setErr('');
  }
  function cancelEdit() {
    setFirst(''); setLast(''); setPlusOne(false); setChildren(false);
    setPartyTag(''); setEditingId(null); setErr('');
  }

  async function save() {
    if (!first.trim() || !last.trim()) { setErr('First and last name are required.'); return; }
    if (editingId) {
      await updateGuest(editingId, { firstName: first, lastName: last, plusOne, children, partyTag: partyTag.trim() || null });
    } else {
      await addGuest({ firstName: first, lastName: last, plusOne, children, partyTag: partyTag.trim() || null });
    }
    cancelEdit(); load(); toast('Guest saved!');
  }

  async function remove(g) {
    if (!confirm(`Remove ${g.firstName} ${g.lastName}?`)) return;
    await deleteGuest(g.id); load(); toast('Guest removed.');
  }

  function exportJSON() {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(guests, null, 2));
    a.download = 'guest-list.json'; a.click();
  }

  function doImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          await importGuests(data); load(); toast(`Imported ${data.length} guests.`);
        }
      } catch { alert('Invalid JSON file.'); }
    };
    reader.readAsText(file); e.target.value = '';
  }

  return (
    <div className="tab-content active">
      <div className="add-guest-form">
        <h3 id="guestFormTitle">{editingId ? 'Edit Guest' : 'Add a Guest'}</h3>
        <div className="form-row">
          <div className="form-group"><label>First Name</label>
            <input type="text" placeholder="First" value={first} onChange={e => setFirst(e.target.value)} /></div>
          <div className="form-group"><label>Last Name</label>
            <input type="text" placeholder="Last" value={last} onChange={e => setLast(e.target.value)} /></div>
        </div>
        <div className="checkbox-row">
          <input type="checkbox" id="agPlusOne" checked={plusOne} onChange={e => setPlusOne(e.target.checked)} />
          <label htmlFor="agPlusOne">Allowed to bring a Plus One</label>
        </div>
        <div className="checkbox-row">
          <input type="checkbox" id="agChildren" checked={children} onChange={e => setChildren(e.target.checked)} />
          <label htmlFor="agChildren">Allowed to bring Children</label>
        </div>
        <div className="form-group" style={{marginTop: 10}}>
          <label>Party Tag <span style={{fontWeight:300,textTransform:'none',letterSpacing:0}}>(optional — guests with same tag can RSVP together)</span></label>
          <input type="text" list="partyTagList" placeholder="e.g. smith-family"
            value={partyTag} onChange={e => setPartyTag(e.target.value)} />
          <datalist id="partyTagList">
            {[...new Set(guests.filter(g => g.partyTag).map(g => g.partyTag))].map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        {err && <div className="field-error" style={{margin:'6px 0'}}>{err}</div>}
        <div style={{display:'flex',gap:8,marginTop:6}}>
          <button className="btn btn-primary" style={{width:'auto',padding:'11px 24px'}} onClick={save}>Save Guest</button>
          {editingId && <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>}
        </div>
      </div>

      <table className="guest-table">
        <thead><tr><th>Name</th><th>Permissions</th><th style={{width:80}}></th></tr></thead>
        <tbody>
          {guests.map(g => (
            <tr key={g.id}>
              <td><strong>{g.firstName}</strong> {g.lastName}</td>
              <td>
                {g.plusOne && <span className="badge badge-plus">+ Plus One</span>}
                {g.children && <span className="badge badge-child">Children</span>}
                {g.partyTag && <span className="badge badge-party">Party: {g.partyTag}</span>}
                {!g.plusOne && !g.children && !g.partyTag && <span className="badge badge-none">No extras</span>}
              </td>
              <td>
                <button className="icon-btn" onClick={() => startEdit(g)} title="Edit">✏️</button>
                <button className="icon-btn del" onClick={() => remove(g)} title="Delete">🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {guests.length === 0 && <div className="empty-state">No guests added yet.</div>}

      <div style={{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-secondary" onClick={exportJSON} style={{fontSize:10}}>↓ Export JSON</button>
        <label className="btn btn-secondary" style={{fontSize:10,cursor:'pointer'}}>
          ↑ Import JSON <input type="file" accept=".json" style={{display:'none'}} onChange={doImport} />
        </label>
      </div>
    </div>
  );
}

function ResponsesTab({ toast }) {
  const [responses, setResponses] = useState([]);
  useEffect(() => { getResponses().then(setResponses); }, []);

  async function doClear() {
    if (!confirm('Clear all responses? This cannot be undone.')) return;
    await clearResponses(); setResponses([]); toast('Responses cleared.');
  }

  function exportCSV() {
    const header = 'Name,Attending,Dietary,PlusOne,PlusOneName,Children,ChildNames,Timestamp';
    const rows = responses.map(r =>
      [r.name,r.attending,r.dietary,r.plusOne,r.plusOneName,r.children,r.childNames,r.timestamp]
      .map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')
    );
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent([header,...rows].join('\n'));
    a.download = 'rsvp-responses.csv'; a.click();
  }

  return (
    <div className="tab-content active">
      <div className="info-box">
        <strong>Responses</strong>
        All RSVPs are saved to the server database and appear here in real time from any device.
      </div>
      <table className="resp-table">
        <thead><tr><th>Name</th><th>Attending</th><th>Dietary</th><th>+1</th><th>Kids</th><th>Time</th></tr></thead>
        <tbody>
          {responses.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td className={r.attending === 'yes' ? 'going' : 'not-going'}>{r.attending === 'yes' ? 'Yes' : 'No'}</td>
              <td>{r.dietary || '—'}</td>
              <td>{r.plusOne === 'yes' ? r.plusOneName || 'Yes' : 'No'}</td>
              <td>{r.children === 'yes' ? r.childNames || 'Yes' : 'No'}</td>
              <td style={{color:'var(--muted)',whiteSpace:'nowrap'}}>{r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {responses.length === 0 && <div className="empty-state">No responses yet.</div>}
      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button className="btn btn-secondary" onClick={exportCSV} style={{fontSize:10}}>↓ Export CSV</button>
        <button className="btn btn-secondary" onClick={doClear} style={{fontSize:10,color:'var(--error)'}}>Clear All</button>
      </div>
    </div>
  );
}

function SettingsTab({ toast }) {
  const [newPw, setNewPw] = useState('');

  async function save() {
    if (!newPw) return;
    await changePassword(newPw);
    setNewPw('');
    toast('Password updated!');
  }

  return (
    <div className="tab-content active">
      <div className="form-group">
        <label>Change Admin Password</label>
        <input type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)} />
      </div>
      <button className="btn btn-primary" style={{width:'auto',padding:'11px 24px'}} onClick={save}>Update Password</button>
    </div>
  );
}
