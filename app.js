/* ─── Color Palette ─────────────────────────────────── */
const COLORS = [
  '#6366f1', '#8b5cf6', '#f43f5e', '#f59e0b',
  '#06b6d4', '#10b981', '#ec4899', '#38bdf8', '#f97316'
];
let selColor = 0;

/* ─── LocalStorage Helpers ──────────────────────────── */
function load(k) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function save(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.warn('Storage error', e);
  }
}

/* ─── App State ─────────────────────────────────────── */
let subjects   = load('at_subjects')   || [];
let attendance = load('at_attendance') || {};

let curYear  = new Date().getFullYear();
let curMonth = new Date().getMonth();
let selDate  = null;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ─── Boot ──────────────────────────────────────────── */
renderColorPicker();
renderSubjects();
renderCalendar();
renderOverview();

/* ─── Color Picker ──────────────────────────────────── */
function renderColorPicker() {
  const cp = document.getElementById('color-picker');
  cp.innerHTML = '';
  COLORS.forEach((c, i) => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (selColor === i ? ' selected' : '');
    sw.style.background = c;
    sw.title = c;
    sw.onclick = () => { selColor = i; renderColorPicker(); };
    cp.appendChild(sw);
  });
}

/* ─── Stats Helper ──────────────────────────────────── */
function getStats(sid) {
  let p = 0, a = 0;
  Object.values(attendance).forEach(day => {
    if (day[sid] === 'P') p++;
    else if (day[sid] === 'A') a++;
  });
  const total = p + a;
  const pct   = total === 0 ? null : Math.round((p / total) * 100);
  return { p, a, total, pct };
}

function barColor(pct) {
  if (pct === null) return 'var(--dim)';
  if (pct >= 75)   return 'var(--present)';
  if (pct >= 60)   return '#eab308';
  return 'var(--absent)';
}

/* ─── Subjects ──────────────────────────────────────── */
function renderSubjects() {
  const g = document.getElementById('subjects-grid');
  if (!subjects.length) {
    g.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📚</div>
        <p>No subjects yet. Add one below!</p>
      </div>`;
    return;
  }
  g.innerHTML = '';
  subjects.forEach(s => {
    const st  = getStats(s.id);
    const pct = st.pct === null ? '—' : st.pct + '%';
    const bw  = st.pct === null ? 0 : st.pct;
    const bc  = barColor(st.pct);

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.background  = `linear-gradient(145deg, var(--surface), ${s.color}11)`;
    card.style.borderColor = s.color + '33';
    card.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:3px;
                  background:${s.color};border-radius:12px 12px 0 0"></div>
      <div class="del-btn" onclick="delSubject('${s.id}', event)">✕</div>
      <div class="sname" style="color:${s.color}">${s.name}</div>
      <div class="scode">${s.code}</div>
      <div class="pct-bar-bg">
        <div class="pct-bar" style="width:${bw}%;background:${bc}"></div>
      </div>
      <div class="stats">
        <div class="pct" style="color:${bc}">${pct}</div>
        <div class="counts">
          <span style="color:var(--present)">P: ${st.p}</span>
          <span style="color:var(--absent)">A: ${st.a}</span>
          <span style="color:var(--muted)">${st.total} classes</span>
        </div>
      </div>
    `;
    g.appendChild(card);
  });
}

function addSubject() {
  const nameEl = document.getElementById('inp-name');
  const codeEl = document.getElementById('inp-code');
  const n = nameEl.value.trim();
  const c = codeEl.value.trim();
  if (!n) { nameEl.focus(); return; }

  subjects.push({
    id:    's' + Date.now(),
    name:  n,
    code:  c || n.substring(0, 3).toUpperCase(),
    color: COLORS[selColor]
  });
  save('at_subjects', subjects);
  nameEl.value = '';
  codeEl.value = '';
  renderSubjects();
  renderOverview();
}

function delSubject(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this subject? All its attendance data will be removed.')) return;
  subjects = subjects.filter(s => s.id !== id);
  Object.keys(attendance).forEach(d => { delete attendance[d][id]; });
  save('at_subjects', subjects);
  save('at_attendance', attendance);
  renderSubjects();
  renderCalendar();
  renderOverview();
}

/* ─── Tab Navigation ────────────────────────────────── */
function showSection(name, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'overview') renderOverview();
  if (name === 'calendar') renderCalendar();
  if (name === 'subjects') renderSubjects();
}

/* ─── Calendar ──────────────────────────────────────── */
function changeMonth(d) {
  curMonth += d;
  if (curMonth > 11) { curMonth = 0; curYear++; }
  if (curMonth < 0)  { curMonth = 11; curYear--; }
  renderCalendar();
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function renderCalendar() {
  document.getElementById('cal-month-label').textContent =
    MONTHS[curMonth] + ' ' + curYear;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // Day labels row
  DAYS.forEach(d => {
    const lbl = document.createElement('div');
    lbl.className   = 'day-label';
    lbl.textContent = d;
    grid.appendChild(lbl);
  });

  const firstDay    = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const today       = new Date();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'day-cell empty';
    grid.appendChild(e);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const key      = dateKey(curYear, curMonth, d);
    const isToday  = today.getDate() === d &&
                     today.getMonth() === curMonth &&
                     today.getFullYear() === curYear;
    const isFuture = new Date(curYear, curMonth, d) > today;
    const isSel    = selDate === key;

    const cell = document.createElement('div');
    cell.className =
      'day-cell' +
      (isToday  ? ' today'        : '') +
      (isFuture ? ' future'       : '') +
      (isSel    ? ' selected-day' : '');

    // Day number
    const numEl = document.createElement('span');
    numEl.style.fontSize = '13px';
    numEl.textContent = d;
    cell.appendChild(numEl);

    // Attendance dots
    const dots = document.createElement('div');
    dots.className = 'dots';
    if (attendance[key]) {
      subjects.forEach(s => {
        const v = attendance[key][s.id];
        if (v) {
          const dot = document.createElement('div');
          dot.className    = 'dot';
          dot.style.background = v === 'P' ? 'var(--present)' : 'var(--absent)';
          dots.appendChild(dot);
        }
      });
    }
    cell.appendChild(dots);

    if (!isFuture) {
      cell.onclick = () => selectDate(key);
    }
    grid.appendChild(cell);
  }

  renderMarkPanel();
}

function selectDate(key) {
  selDate = key;
  renderCalendar();
}

function renderMarkPanel() {
  const lbl  = document.getElementById('selected-date-label');
  const list = document.getElementById('mark-list');

  if (!selDate) {
    lbl.textContent = 'Select a date';
    list.innerHTML  = '<div class="no-subjects">Click a date on the calendar</div>';
    return;
  }

  const [y, m, d] = selDate.split('-');
  lbl.textContent = `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;

  if (!subjects.length) {
    list.innerHTML = '<div class="no-subjects">Add subjects first</div>';
    return;
  }

  list.innerHTML = '';
  const day = attendance[selDate] || {};

  subjects.forEach(s => {
    const cur = day[s.id] || null;
    const row = document.createElement('div');
    row.className = 'mark-subject-row';
    row.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;
                  background:${s.color};flex-shrink:0"></div>
      <div class="sn">${s.name}</div>
      <button class="att-btn ${cur === 'P' ? 'p' : 'inactive'}"
              onclick="markAtt('${s.id}','P')" title="Present">P</button>
      <button class="att-btn ${cur === 'A' ? 'a' : 'inactive'}"
              onclick="markAtt('${s.id}','A')" title="Absent">A</button>
    `;
    list.appendChild(row);
  });
}

function markAtt(sid, val) {
  if (!selDate) return;
  if (!attendance[selDate]) attendance[selDate] = {};

  // Toggle off if clicking the same button again
  if (attendance[selDate][sid] === val) {
    delete attendance[selDate][sid];
  } else {
    attendance[selDate][sid] = val;
  }

  save('at_attendance', attendance);
  renderMarkPanel();
  renderCalendar();
  renderSubjects();
}

/* ─── Overview ──────────────────────────────────────── */
function renderOverview() {
  const list = document.getElementById('overview-list');
  if (!subjects.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📊</div>
        <p>Add subjects to see overview</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  subjects.forEach(s => {
    const st  = getStats(s.id);
    const pct = st.pct === null ? '—' : st.pct + '%';
    const bw  = st.pct === null ? 0 : st.pct;
    const bc  = barColor(st.pct);

    let badgeClass = 'warn', badgeLabel = 'No data';
    if (st.pct !== null) {
      if (st.pct >= 75)      { badgeClass = 'safe';   badgeLabel = 'On track'; }
      else if (st.pct >= 60) { badgeClass = 'warn';   badgeLabel = 'At risk';  }
      else                   { badgeClass = 'danger'; badgeLabel = 'Low';      }
    }

    const row = document.createElement('div');
    row.className      = 'overview-row';
    row.style.borderLeft = `3px solid ${s.color}`;
    row.innerHTML = `
      <div>
        <div class="sname2" style="color:${s.color}">${s.name}</div>
        <div style="font-size:11px;color:var(--muted)">${s.code}</div>
      </div>
      <div class="ov-stats">
        <div class="ov-stat">
          <span>Present</span>
          <span style="color:var(--present)">${st.p}</span>
        </div>
        <div class="ov-stat">
          <span>Absent</span>
          <span style="color:var(--absent)">${st.a}</span>
        </div>
        <div class="ov-stat">
          <span>Total</span>
          <span>${st.total}</span>
        </div>
      </div>
      <div class="ov-pct-bar">
        <div class="ov-pct-track">
          <div class="ov-pct-fill" style="width:${bw}%;background:${bc}"></div>
        </div>
        <div class="ov-pct-label">
          <span>${pct} attendance</span>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </div>
      </div>
    `;
    list.appendChild(row);
  });
}
