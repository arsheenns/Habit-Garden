const state = { habits: [], username: '' };
let authMode = 'login';

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Something went wrong' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const AVATAR_COLORS = ['#E2618F', '#63A65A', '#A9835A', '#6FA8DC', '#D9993A'];

function avatarColor(id) {
  const n = typeof id === 'number' ? id : String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

/* ---------- Auth ---------- */

const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const authSubmit = document.getElementById('auth-submit');
const authTagline = document.getElementById('auth-tagline');
const switchLink = document.getElementById('auth-switch-link');

switchLink.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  if (authMode === 'login') {
    authSubmit.innerHTML = 'LOGIN TO GARDEN <span aria-hidden="true">&#8594;</span>';
    authTagline.textContent = 'Welcome back! Ready to tend to your digital garden today?';
    switchLink.textContent = 'PLANT A NEW ACCOUNT';
  } else {
    authSubmit.innerHTML = 'CREATE MY GARDEN <span aria-hidden="true">&#8594;</span>';
    authTagline.textContent = "Let's plant your first seed. Choose a gardener name to begin.";
    switchLink.textContent = 'I ALREADY HAVE AN ACCOUNT';
  }
  authError.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    const user = await api(authMode === 'login' ? '/auth/login' : '/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    state.username = user.username;
    await enterApp();
  } catch (err) {
    authError.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  location.reload();
});

/* ---------- Nav ---------- */

function activateTab(target) {
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.toggle('active', t.dataset.target === target));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === target));
}

document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.target));
});
document.getElementById('profile-btn').addEventListener('click', (e) => activateTab(e.currentTarget.dataset.target));

/* ---------- Add habit (Today card) ---------- */

document.getElementById('add-habit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('add-habit-input');
  const name = input.value.trim();
  if (!name) return;
  try{
  const habit = await api('/habits', {
    method: 'POST',
    body: JSON.stringify({ name, frequency: 'daily' }),
  });
  state.habits.push(habit);
  input.value = '';
  render();
} catch(err) {
  alert(`⚠️ Can't add duplicate habit\n\n${err.message}`);
}
});

/* ---------- App flow ---------- */

async function enterApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('today-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  document.getElementById('settings-username').textContent = state.username
    ? `Logged in as ${state.username}`
    : '';
  await loadHabits();
}

async function loadHabits() {
  state.habits = await api('/habits');
  render();
}

function render() {
  renderToday();
  renderGarden();
}

function renderToday() {
  const list = document.getElementById('habit-list');
  list.innerHTML = '';
  state.habits.forEach((h) => {
    const row = document.createElement('div');
    row.className = 'habit-row';
    row.innerHTML = `
      <button class="checkbox ${h.checkedToday ? 'checked' : ''}" data-id="${h.id}">${CHECK_SVG}</button>
      <div class="habit-info">
        <div class="habit-name ${h.checkedToday ? 'done' : ''}">${escapeHtml(h.name)}</div>
        <div class="habit-sub">${h.frequency === 'weekly' ? 'Weekly habit' : 'Daily habit'}</div>
      </div>
      <div class="habit-right">
        <span class="streak-pill">&#128293; ${h.streak}</span>
        <span class="hab-avatar" style="background:${avatarColor(h.id)}">
          <img src="assets/leaf.svg" alt="" style="width:14px;height:14px;filter:brightness(0) invert(1);" />
        </span>
      </div>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.checkbox').forEach((cb) => {
    cb.addEventListener('click', () => toggleCheckin(cb.dataset.id));
  });

  const total = state.habits.length;
  const done = state.habits.filter((h) => h.checkedToday).length;
  document.getElementById('goal-count').textContent = `${done} / ${total || 0} DONE`;
  document.getElementById('progress-fill').style.width = total ? `${(done / total) * 100}%` : '0%';

  const caption = document.getElementById('goal-caption');
  if (!total) caption.textContent = 'Plant a seed below to start your garden.';
  else if (done === total) caption.textContent = 'All done! Your garden thanks you.';
  else if (done / total >= 0.5) caption.textContent = 'Almost there! Keep nurturing your garden.';
  else caption.textContent = 'Keep going — every check-in helps something grow.';
}

function stageIcon(h) {
  if (h.stage === 'seed') return 'assets/seed.svg';
  if (h.stage === 'sprout') return 'assets/sprout.svg';
  return h.milestone ? 'assets/bloom-gold.svg' : 'assets/bloom.svg';
}

function stageLabel(h) {
  if (h.stage === 'seed') return 'PLANTED';
  if (h.stage === 'sprout') return 'SPROUTING';
  return h.milestone ? 'BLOOMING!' : 'BLOOMING';
}

function renderGarden() {
  const wrap = document.getElementById('plant-slots');
  const emptyHint = document.getElementById('garden-empty-hint');
  wrap.innerHTML = '';
  emptyHint.style.display = state.habits.length ? 'none' : 'block';

  state.habits.forEach((h) => {
    const slot = document.createElement('div');
    slot.className = 'plant-slot';
    slot.innerHTML = `
      ${h.milestone ? `<span class="badge">&#128293; ${h.streak}+ ${escapeHtml(h.name)}</span>` : ''}
      <div class="plant-icon-wrap ${h.milestone ? 'milestone' : ''}">
        <img src="${stageIcon(h)}" alt="" />
      </div>
      <span class="plant-label">${stageLabel(h)}</span>
      <span class="plant-name-label">${escapeHtml(h.name)}</span>
    `;
    wrap.appendChild(slot);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-plant-slot';
  addBtn.innerHTML = `<span class="add-plant-circle">+</span><span class="plant-label">PLANT HABIT</span>`;
  addBtn.addEventListener('click', () => activateTab('today-view'));
  wrap.appendChild(addBtn);
}

async function toggleCheckin(id) {
  const habit = state.habits.find((h) => h.id == id);
  const wasMilestoneBefore = habit.milestone;
  const method = habit.checkedToday ? 'DELETE' : 'POST';
  const updated = await api(`/habits/${id}/checkin`, { method });
  const idx = state.habits.findIndex((h) => h.id == id);
  state.habits[idx] = updated;
  render();

  if (!wasMilestoneBefore && updated.milestone) {
    celebrate();
  }
}

/* ---------- Celebration burst on milestone unlock ---------- */

function celebrate() {
  const colors = ['#24413C', '#F4C15C', '#E2618F', '#63A65A'];
  const layer = document.getElementById('celebrate-layer');
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 120;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    layer.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

/* ---------- Init: resume session if already logged in ---------- */

(async function init() {
  try {
    const user = await api('/auth/me');
    state.username = user.username;
    await enterApp();
  } catch {
    // not logged in — auth screen stays visible
  }
})();
