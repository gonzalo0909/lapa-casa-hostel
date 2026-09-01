// group-payment.js — vista de solo lectura del progreso grupal para el titular
// (el pago lo hace cada invitado desde su propio link, ver group-payment-member.js)

const API_BASE = '/api/v1';
const token = location.pathname.split('/').filter(Boolean).pop();
let sessionData = null;
let countdownInterval = null;
let pollInterval = null;

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function init() {
  await loadSession();
  pollInterval = setInterval(loadSession, 10000);
}

async function loadSession() {
  try {
    const r = await fetch(`${API_BASE}/payments/group/${token}`);
    const data = await r.json();
    if (!data.success || !data.data.found) {
      showState('not-found');
      return;
    }
    sessionData = data.data;
    render();
  } catch {
    document.getElementById('loading').textContent = 'Error al cargar. Intentá de nuevo.';
  }
}

function render() {
  document.getElementById('loading').style.display = 'none';

  if (sessionData.expired)   { showState('expired');    return; }
  if (sessionData.completed) { showState('confirmed');  return; }

  document.getElementById('banner').style.display = 'block';
  document.getElementById('status-card').style.display = 'block';
  document.getElementById('paid-beds').textContent  = sessionData.paidBeds;
  document.getElementById('total-beds').textContent = sessionData.totalBeds;
  const pct = sessionData.totalBeds > 0
    ? Math.round((sessionData.paidBeds / sessionData.totalBeds) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';

  startCountdown(sessionData.expiresAt);

  if (sessionData.members && sessionData.members.length > 0) {
    document.getElementById('members-section').style.display = 'block';
    document.getElementById('members-list').innerHTML = sessionData.members.map(m =>
      '<div class="member-item">' +
        '<div>' +
          '<div class="member-name">' + esc(m.guestName) + '</div>' +
          '<div class="member-method">' + (m.paymentMethod === 'card' ? 'Tarjeta' : 'PIX') + '</div>' +
        '</div>' +
        '<div class="member-paid">Pagado</div>' +
      '</div>'
    ).join('');
  }
}

function startCountdown(expiresAt) {
  if (countdownInterval) clearInterval(countdownInterval);
  const update = () => {
    const ms = new Date(expiresAt) - new Date();
    if (ms <= 0) { clearInterval(countdownInterval); loadSession(); return; }
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    document.getElementById('countdown-box').classList.toggle('urgent', ms < 5 * 60 * 1000);
    document.getElementById('countdown-text').textContent =
      String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  };
  update();
  countdownInterval = setInterval(update, 1000);
}

function showState(state) {
  document.getElementById('loading').style.display      = 'none';
  document.getElementById('status-card').style.display  = 'none';
  document.getElementById('banner').style.display       = 'none';
  if (state === 'expired')   {
    document.getElementById('expired-state').style.display = 'block';
    clearInterval(pollInterval);
    clearInterval(countdownInterval);
  }
  if (state === 'confirmed') {
    document.getElementById('confirmed-state').style.display = 'block';
    clearInterval(pollInterval);
    clearInterval(countdownInterval);
  }
  if (state === 'not-found') {
    const el = document.getElementById('loading');
    el.style.display = 'block';
    el.textContent = 'Sesión no encontrada.';
  }
}

document.addEventListener('DOMContentLoaded', init);
