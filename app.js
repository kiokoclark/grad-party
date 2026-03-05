/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let guestList  = JSON.parse(localStorage.getItem('rsvp_guests')  || '[]');
let responses  = JSON.parse(localStorage.getItem('rsvp_responses') || '[]');
let settings   = JSON.parse(localStorage.getItem('rsvp_settings') || '{}');
let editingIdx = null;
let adminUnlocked = false;
let currentGuest  = null;

/* ── Defaults ── */
settings = Object.assign({
  title: 'Kioko',
  subtitle: 'Juris Doctor · Class of 2026',
  adminPwHash: 'fc716a3da18391a29a8586e9f3064ab83967330186d573ccc710ddb45f617b6c',
  sheetUrl: '',
  localOnly: true
}, settings);

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function save() {
  localStorage.setItem('rsvp_guests',    JSON.stringify(guestList));
  localStorage.setItem('rsvp_responses', JSON.stringify(responses));
  localStorage.setItem('rsvp_settings',  JSON.stringify(settings));
}


/* ══════════════════════════════════════════
   VIEWS
══════════════════════════════════════════ */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ══════════════════════════════════════════
   FUZZY NAME MATCH
══════════════════════════════════════════ */
function normalizeName(s) { return s.toLowerCase().replace(/[^a-z]/g, ''); }
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length:m+1}, (_,i)=>Array.from({length:n+1},(_,j)=>i?j?0:i:j));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    d[i][j]=a[i-1]===b[j-1]?d[i-1][j-1]:1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);
  return d[m][n];
}
function findGuest(first, last) {
  const nf = normalizeName(first), nl = normalizeName(last);
  let best = null, bestScore = Infinity;
  for (const g of guestList) {
    const gf = normalizeName(g.firstName), gl = normalizeName(g.lastName);
    const score = levenshtein(nf, gf) + levenshtein(nl, gl);
    if (score < bestScore) { bestScore = score; best = g; }
  }
  // Accept if combined edit distance ≤ 3
  if (best && bestScore <= 3) return best;
  return null;
}

/* ══════════════════════════════════════════
   STEP 1
══════════════════════════════════════════ */
function handleStep1() {
  const first = document.getElementById('guestFirstName').value.trim();
  const last  = document.getElementById('guestLastName').value.trim();
  let valid = true;

  document.getElementById('firstNameError').textContent = '';
  document.getElementById('lastNameError').textContent  = '';
  document.getElementById('notFoundError').textContent  = '';

  if (!first) { document.getElementById('firstNameError').textContent = 'Please enter your first name.'; valid = false; }
  if (!last)  { document.getElementById('lastNameError').textContent  = 'Please enter your last name.';  valid = false; }
  if (!valid) return;

  if (guestList.length === 0) {
    // No list yet — still allow submission with basic permissions
    currentGuest = { firstName: first, lastName: last, plusOne: false, children: false };
  } else {
    const match = findGuest(first, last);
    if (!match) {
      document.getElementById('notFoundError').textContent =
        "We couldn't find your name on the guest list. Please double-check your spelling or contact us.";
      return;
    }
    currentGuest = match;
  }

  goToStep2();
}

function goToStep2() {
  // Update step indicator
  document.getElementById('dot1').classList.remove('active');
  document.getElementById('dot1').classList.add('done');
  document.getElementById('dot1').textContent = '✓';
  document.getElementById('line1').classList.add('done');
  document.getElementById('dot2').classList.add('active');

  document.getElementById('matchedName').textContent =
    currentGuest.firstName + ' ' + currentGuest.lastName;

  // Show conditional sections
  revealSection('plusOneSection',  currentGuest.plusOne);
  revealSection('childrenSection', currentGuest.children);

  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
}

function goBack() {
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';

  document.getElementById('dot1').classList.add('active');
  document.getElementById('dot1').classList.remove('done');
  document.getElementById('dot1').textContent = '1';
  document.getElementById('line1').classList.remove('done');
  document.getElementById('dot2').classList.remove('active');
}

/* ══════════════════════════════════════════
   STEP 2 INTERACTIONS
══════════════════════════════════════════ */
function handleAttendingChange() {
  const val = document.querySelector('input[name="attending"]:checked')?.value;
  revealSection('attendingFields', val === 'yes');
}

function handleChildrenChange() {
  const val = document.querySelector('input[name="children"]:checked')?.value;
  revealSection('childNamesGroup', val === 'yes');
}

// Plus one name toggle
document.querySelectorAll('input[name="plusOne"]').forEach(r => {
  r.addEventListener('change', () => {
    const v = document.querySelector('input[name="plusOne"]:checked')?.value;
    document.getElementById('plusOneNameGroup').style.display = v === 'yes' ? 'block' : 'none';
  });
});

function revealSection(id, show) {
  const el = document.getElementById(id);
  if (show) el.classList.add('visible');
  else el.classList.remove('visible');
}

/* ══════════════════════════════════════════
   SUBMIT
══════════════════════════════════════════ */
async function handleSubmit() {
  const attending = document.querySelector('input[name="attending"]:checked')?.value;
  document.getElementById('attendingError').textContent = '';
  document.getElementById('submitError').textContent   = '';

  if (!attending) { document.getElementById('attendingError').textContent = 'Please select an option.'; return; }

  const plusOneVal    = document.querySelector('input[name="plusOne"]:checked')?.value || '';
  const childrenVal   = document.querySelector('input[name="children"]:checked')?.value || '';
  const plusOneName   = document.getElementById('plusOneName').value.trim();
  const childNames    = document.getElementById('childNames').value.trim();
  const dietary       = document.getElementById('dietary').value.trim();

  const payload = {
    name:        currentGuest.firstName + ' ' + currentGuest.lastName,
    attending,
    dietary,
    plusOne:     plusOneVal,
    plusOneName: plusOneVal === 'yes' ? plusOneName : '',
    children:    childrenVal,
    childNames:  childrenVal === 'yes' ? childNames : ''
  };

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  let submitted = false;

  if (settings.sheetUrl) {
    try {
      await fetch(settings.sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      submitted = true;
    } catch(e) {
      console.warn('Sheet submit failed', e);
    }
  } else {
    submitted = true; // No sheet configured, treat as success
  }

  // Save locally if enabled
  if (settings.localOnly) {
    responses.push({ ...payload, timestamp: new Date().toISOString() });
    save();
  }

  if (submitted) {
    showView('successView');
    if (attending === 'no') {
      document.getElementById('successTitle').textContent = "We'll miss you!";
      document.getElementById('successMsg').textContent   = 'Thank you for letting us know. We hope to see you another time.';
    }
  } else {
    btn.textContent = 'Send RSVP';
    btn.disabled = false;
    document.getElementById('submitError').textContent = 'Something went wrong. Please try again.';
  }
}

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function download(filename, text) {
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
  a.download = filename;
  a.click();
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function applySettings() {
  document.title = 'RSVP — Celebrating ' + settings.title;
  const h1 = document.querySelector('.site-header h1');
  if (h1) h1.innerHTML = 'Celebrating<br/><em>' + settings.title + '</em>';
  const sub = document.querySelector('.site-header .subtitle');
  if (sub) sub.textContent = settings.subtitle;
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
applySettings();
