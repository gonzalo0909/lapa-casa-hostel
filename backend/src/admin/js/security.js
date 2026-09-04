// lapa-casa-hostel/backend/src/admin/js/security.js
// Activar/desactivar 2FA (TOTP) para el login de admin.

(function () {
  if (typeof renderNav === 'function') renderNav('security');

  function showMsg(elId, text, type) {
    var el = document.getElementById(elId);
    el.innerHTML = text ? '<div class="msg ' + type + '">' + text + '</div>' : '';
  }

  var statusText     = document.getElementById('status-text');
  var activateBtn     = document.getElementById('activate-btn');
  var setupSection    = document.getElementById('setup-section');
  var backupSection   = document.getElementById('backup-section');
  var disableSection  = document.getElementById('disable-section');
  var qrImg            = document.getElementById('qr-img');
  var secretManual      = document.getElementById('secret-manual');
  var codeInput          = document.getElementById('code-input');
  var confirmBtn          = document.getElementById('confirm-btn');
  var backupCodeText       = document.getElementById('backup-code-text');
  var disableCodeInput      = document.getElementById('disable-code-input');
  var disableBtn             = document.getElementById('disable-btn');

  async function loadStatus() {
    try {
      var data = await apiFetch('/admin/2fa/status');
      renderStatus(data.enabled);
    } catch (err) {
      showMsg('page-msg', err.message, 'error');
    }
  }

  function renderStatus(enabled) {
    if (enabled) {
      statusText.innerHTML = '<span class="status-on">Activado</span>';
      activateBtn.classList.add('hidden');
      setupSection.classList.add('hidden');
      backupSection.classList.add('hidden');
      disableSection.classList.remove('hidden');
    } else {
      statusText.innerHTML = '<span class="status-off">Desactivado</span>';
      activateBtn.classList.remove('hidden');
      disableSection.classList.add('hidden');
    }
  }

  activateBtn.addEventListener('click', async function () {
    try {
      var data = await apiFetch('/admin/2fa/setup', { method: 'POST' });
      qrImg.src = data.qrCodeDataUrl;
      secretManual.textContent = data.secret;
      setupSection.classList.remove('hidden');
      activateBtn.classList.add('hidden');
      showMsg('page-msg', '', null);
    } catch (err) {
      showMsg('page-msg', err.message, 'error');
    }
  });

  confirmBtn.addEventListener('click', async function () {
    var token = codeInput.value.trim();
    if (!/^\d{6}$/.test(token)) {
      showMsg('page-msg', 'Ingresá los 6 dígitos del código.', 'error');
      return;
    }
    try {
      var data = await apiFetch('/admin/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ token: token }),
      });
      setupSection.classList.add('hidden');
      backupCodeText.textContent = data.backupCode;
      backupSection.classList.remove('hidden');
      showMsg('page-msg', '2FA activado.', 'success');
      renderStatus(true);
    } catch (err) {
      showMsg('page-msg', err.message, 'error');
    }
  });

  disableBtn.addEventListener('click', async function () {
    var token = disableCodeInput.value.trim();
    if (!/^\d{6}$/.test(token)) {
      showMsg('page-msg', 'Ingresá los 6 dígitos del código.', 'error');
      return;
    }
    try {
      await apiFetch('/admin/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: token }),
      });
      showMsg('page-msg', '2FA desactivado.', 'success');
      renderStatus(false);
    } catch (err) {
      showMsg('page-msg', err.message, 'error');
    }
  });

  loadStatus();
})();
