// group-payment-member.js — página individual del invitado (CSP-safe)

const API_BASE = '/api/v1';
const memberToken = location.pathname.split('/').filter(Boolean).pop();
let memberData = null;
let selectedMethod = 'pix';
let countdownInterval = null;
let pollInterval = null;
let docPhotoBase64 = null; // foto del documento (base64 JPEG)

// Redimensiona la imagen a max maxW px de ancho, calidad JPEG 0..1
function resizeImage(file, maxW, quality) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var scale  = Math.min(1, maxW / img.width);
        var canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function init() {
  await loadStatus();
  pollInterval = setInterval(loadStatus, 10000);
}

async function loadStatus() {
  try {
    const r = await fetch(`${API_BASE}/payments/group-member/${memberToken}`);
    const data = await r.json();
    if (!data.success || !data.data.found) {
      showNotFound();
      return;
    }
    memberData = data.data;
    render();
  } catch {
    document.getElementById('loading').textContent = 'Error al cargar. Intenta de nuevo.';
  }
}

function render() {
  document.getElementById('loading').style.display = 'none';

  if (memberData.alreadyPaid || memberData.completed) { showState('paid'); return; }

  // Mostrar progreso del grupo siempre (también en expirado)
  document.getElementById('group-progress').style.display = 'block';
  document.getElementById('paid-beds').textContent  = memberData.paidBeds;
  document.getElementById('total-beds').textContent = memberData.totalBeds;
  const pct = memberData.totalBeds > 0
    ? Math.round((memberData.paidBeds / memberData.totalBeds) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';

  if (memberData.expired) { showExpiredInline(); return; }

  startCountdown(memberData.expiresAt);

  if (memberData.members && memberData.members.length > 0) {
    document.getElementById('members-section').style.display = 'block';
    document.getElementById('members-list').innerHTML = memberData.members.map(m =>
      '<div class="member-item">' +
        '<div>' +
          '<div class="member-name">' + esc(m.guestName) + '</div>' +
          '<div class="member-method">' + (m.paymentMethod === 'card' ? 'Tarjeta' : 'PIX') + '</div>' +
        '</div>' +
        '<div class="member-paid">Pagado</div>' +
      '</div>'
    ).join('');
  }

  // Formulario de pago (solo si este slot no está pagado)
  document.getElementById('pay-card').style.display = 'block';
  updatePriceDisplay();
}

function startCountdown(expiresAt) {
  if (countdownInterval) clearInterval(countdownInterval);
  const box = document.getElementById('countdown-box');
  const txt = document.getElementById('countdown-text');
  const update = () => {
    const ms = new Date(expiresAt) - new Date();
    if (ms <= 0) {
      clearInterval(countdownInterval);
      txt.textContent = '00:00';
      box.classList.remove('urgent');
      box.classList.add('expired-time');
      loadStatus();
      return;
    }
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    box.classList.toggle('urgent', ms < 5 * 60 * 1000);
    txt.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  };
  update();
  countdownInterval = setInterval(update, 1000);
}

function selectMethod(m) {
  selectedMethod = m;
  document.getElementById('btn-pix').classList.toggle('selected', m === 'pix');
  document.getElementById('btn-card').classList.toggle('selected', m === 'card');
  updatePriceDisplay();
}

function updatePriceDisplay() {
  if (!memberData) return;
  const base      = memberData.amountPerBed || 0;
  const surcharge = selectedMethod === 'card' ? Math.round(base * 0.10 * 100) / 100 : 0;
  const total     = base + surcharge;
  document.getElementById('price-base').textContent      = 'R$ ' + base.toFixed(2);
  document.getElementById('price-surcharge').textContent = 'R$ ' + surcharge.toFixed(2);
  document.getElementById('price-total').textContent     = 'R$ ' + total.toFixed(2);
  document.getElementById('surcharge-row').style.display = selectedMethod === 'card' ? 'flex' : 'none';
}

function showPixBlock(pixData) {
  document.getElementById('pix-block').style.display = 'block';
  document.getElementById('pix-qr').src = 'data:image/png;base64,' + pixData.qrCodeBase64;
  document.getElementById('pix-code').textContent = pixData.qrCode;
  document.getElementById('pay-form').querySelector('button[type=submit]').style.display = 'none';
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadStatus, 5000);
}

function copyPix() {
  navigator.clipboard.writeText(document.getElementById('pix-code').textContent);
  const btn = document.getElementById('btn-copy-pix');
  btn.textContent = 'Copiado';
  setTimeout(() => { btn.textContent = 'Copiar codigo PIX'; }, 2000);
}

// Expirado: el card de progreso queda visible; solo se oculta el formulario
// y aparece el bloque inline con el link dentro del mismo card.
function showExpiredInline() {
  clearInterval(pollInterval);
  clearInterval(countdownInterval);
  document.getElementById('loading').style.display  = 'none';
  document.getElementById('pay-card').style.display = 'none';
  // Fijar el countdown en 00:00 con estilo rojo
  const box = document.getElementById('countdown-box');
  box.classList.remove('urgent');
  box.classList.add('expired-time');
  document.getElementById('countdown-text').textContent = '00:00';
  // Mostrar bloque inline con link al hostel
  document.getElementById('expired-inline').style.display = 'block';
}

function showState(state) {
  document.getElementById('loading').style.display       = 'none';
  document.getElementById('group-progress').style.display = 'none';
  document.getElementById('pay-card').style.display      = 'none';
  clearInterval(pollInterval);
  clearInterval(countdownInterval);

  if (state === 'paid') {
    document.getElementById('paid-state').style.display = 'block';
  }
}

function showNotFound() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('loading').textContent = 'Link de pago no encontrado.';
}

// ── Event listeners ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-pix').addEventListener('click', () => selectMethod('pix'));
  document.getElementById('btn-card').addEventListener('click', () => selectMethod('card'));
  document.getElementById('btn-copy-pix').addEventListener('click', copyPix);

  // ── Foto del documento ──────────────────────────────────────
  const docInput  = document.getElementById('f-doc-photo');
  const docBtn    = document.getElementById('doc-upload-btn');
  const docPrev   = document.getElementById('doc-preview');
  const docImg    = document.getElementById('doc-img');
  const changeBtn = document.getElementById('btn-change-doc');

  docInput.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    try {
      docPhotoBase64 = await resizeImage(file, 900, 0.82);
      docImg.src = docPhotoBase64;
      docBtn.textContent = '✓ Foto cargada — ' + file.name;
      docBtn.classList.add('has-file');
      docPrev.style.display = 'block';
    } catch {
      docBtn.textContent = '⚠ Error al cargar la foto, intentá de nuevo';
    }
  });

  changeBtn.addEventListener('click', function() {
    docInput.click();
  });

  // ── Formulario de pago ──────────────────────────────────────
  document.getElementById('pay-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar foto del documento (required a nivel HTML, pero doble-check)
    if (!docPhotoBase64) {
      const errEl = document.getElementById('pay-error');
      errEl.textContent = 'La foto del documento es obligatoria.';
      errEl.style.display = 'block';
      return;
    }

    const btn   = document.getElementById('btn-pay');
    const errEl = document.getElementById('pay-error');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    try {
      const r = await fetch(`${API_BASE}/payments/group-member/${memberToken}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: {
            full_name:           document.getElementById('f-name').value.trim(),
            email:               document.getElementById('f-email').value.trim(),
            phone:               document.getElementById('f-phone').value.trim()   || undefined,
            country:             document.getElementById('f-country').value.trim() || undefined,
            documentPhotoBase64: docPhotoBase64,
          },
          paymentMethod: selectedMethod,
        }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error || 'Error al procesar el pago');

      const result = data.data;
      if (selectedMethod === 'card' && result.checkoutUrl) {
        location.href = result.checkoutUrl;
      } else if (selectedMethod === 'pix' && result.pixData) {
        showPixBlock(result.pixData);
        btn.disabled = false;
        btn.textContent = 'Continuar con el pago';
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Continuar con el pago';
    }
  });

  init();
});
