const $ = (selector) => document.querySelector(selector);
const authPanel = $('#auth-panel');
const dashboardPanel = $('#dashboard-panel');
const authMessage = $('#auth-message');
const dashboardMessage = $('#dashboard-message');

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.hidden = !message;
  element.dataset.error = error ? 'true' : 'false';
}

async function request(url, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) }
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan belum berhasil. Coba lagi.');
  return data;
}

function safeReturnPath() {
  const value = new URLSearchParams(location.search).get('return') || '/akun';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/akun';
}

function chooseTab(mode) {
  const isLogin = mode === 'login';
  $('#login-form').hidden = !isLogin;
  $('#register-form').hidden = isLogin;
  $('#tab-login').classList.toggle('is-active', isLogin);
  $('#tab-register').classList.toggle('is-active', !isLogin);
  $('#tab-login').setAttribute('aria-pressed', String(isLogin));
  $('#tab-register').setAttribute('aria-pressed', String(!isLogin));
  $('#auth-heading').textContent = isLogin ? 'Masuk ke akunmu.' : 'Buat akun pemilik.';
  setMessage(authMessage, '');
}

function makeMenuCard(menu) {
  const card = document.createElement('article');
  card.className = 'account-menu-card';
  const info = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = menu.cafeName;
  const detail = document.createElement('p');
  detail.textContent = `${menu.pageCount} halaman · ${menu.orientation === 'landscape' ? 'Landscape' : 'Portrait'} · ${menu.binding === 'spiral' ? 'Spiral kawat' : 'Jilid biasa'}`;
  const link = document.createElement('a');
  link.className = 'account-menu-card__url';
  link.href = menu.url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = new URL(menu.url, location.origin).href;
  info.append(title, detail, link);

  const actions = document.createElement('div');
  actions.className = 'account-menu-card__actions';
  const edit = document.createElement('a');
  edit.className = 'btn btn--garis btn--kecil';
  edit.href = `/?edit=${encodeURIComponent(menu.id)}`;
  edit.textContent = 'Ubah';
  const copy = document.createElement('button');
  copy.className = 'btn btn--garis btn--kecil';
  copy.type = 'button';
  copy.textContent = 'Salin link';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link.href);
      setMessage(dashboardMessage, 'Link menu sudah disalin.');
    } catch { setMessage(dashboardMessage, `Salin link ini: ${link.href}`); }
  });
  const remove = document.createElement('button');
  remove.className = 'btn btn--garis btn--kecil';
  remove.type = 'button';
  remove.textContent = 'Hapus';
  remove.addEventListener('click', async () => {
    if (!confirm(`Hapus menu “${menu.cafeName}” dan link publiknya?`)) return;
    remove.disabled = true;
    try {
      await request(`/api/menus/${encodeURIComponent(menu.id)}`, { method: 'DELETE' });
      await loadDashboard();
      setMessage(dashboardMessage, 'Menu sudah dihapus.');
    } catch (error) { setMessage(dashboardMessage, error.message, true); remove.disabled = false; }
  });
  actions.append(edit, copy, remove);
  card.append(info, actions);
  return card;
}

async function loadDashboard(user) {
  authPanel.hidden = true;
  dashboardPanel.hidden = false;
  $('#account-email').textContent = user.email;
  let result;
  try { result = await request('/api/menus'); }
  catch (error) { setMessage(dashboardMessage, error.message, true); return; }
  const list = $('#menu-list');
  list.replaceChildren();
  if (!result.menus.length) {
    const empty = document.createElement('p');
    empty.className = 'account-message';
    empty.textContent = 'Belum ada menu yang diterbitkan. Susun halaman, lalu terbitkan dari penyusun buku menu.';
    list.append(empty);
    return;
  }
  result.menus.forEach((menu) => list.append(makeMenuCard(menu)));
}

async function submitAuth(form, endpoint) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(authMessage, '');
  try {
    const values = Object.fromEntries(new FormData(form));
    const result = await request(endpoint, { method: 'POST', body: JSON.stringify(values) });
    await loadDashboard(result.user);
    const returnPath = safeReturnPath();
    if (returnPath !== '/akun') location.assign(returnPath);
  } catch (error) { setMessage(authMessage, error.message, true); }
  finally { button.disabled = false; }
}

$('#tab-login').addEventListener('click', () => chooseTab('login'));
$('#tab-register').addEventListener('click', () => chooseTab('register'));
$('#register-form').addEventListener('submit', (event) => {
  event.preventDefault();
  submitAuth(event.currentTarget, '/api/auth/register');
});
$('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  submitAuth(event.currentTarget, '/api/auth/login');
});
$('#logout-button').addEventListener('click', async () => {
  try { await request('/api/auth/logout', { method: 'POST', body: '{}' }); } catch { /* kembali ke formulir tetap aman */ }
  dashboardPanel.hidden = true;
  authPanel.hidden = false;
  chooseTab('login');
});

request('/api/auth/me')
  .then(({ user }) => user ? loadDashboard(user) : chooseTab('register'))
  .catch((error) => setMessage(authMessage, error.message, true));
