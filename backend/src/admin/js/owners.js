// lapa-casa-hostel/backend/src/admin/js/owners.js
//
// CRUD de administradores de apartamento (owner-auth.routes.ts /
// apartment-owners.routes.ts). El "delete" real es un soft-deactivate
// (isActive=false) -- no borra la fila, así que el botón dice
// "Desactivar"/"Activar" según corresponda.

requireAuth();
renderNav('owners');

const OW = '/admin/apartment-owners';
const RT = '/admin/room-types';

let allApartments = []; // {id, code, name} -- todos los apartamentos, para el selector de asignar

function showMsg(elId, text, type) {
  document.getElementById(elId).innerHTML = text ? `<div class="msg ${type}">${text}</div>` : '';
}

async function loadApartments() {
  const data = await apiFetch(RT);
  allApartments = data.apartments;
}

async function loadOwners() {
  try {
    const owners = await apiFetch(OW);
    renderTable(owners);
  } catch (err) {
    showMsg('page-msg', err.message, 'error');
  }
}

function unassignedOptionsFor(owner) {
  const assignedIds = new Set(owner.apartments.map((a) => a.id));
  return allApartments
    .filter((a) => !assignedIds.has(a.id))
    .map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`)
    .join('');
}

function renderTable(owners) {
  const tbody = document.getElementById('owners-body');

  if (owners.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin administradores creados todavía</td></tr>';
    return;
  }

  tbody.innerHTML = owners.map((o) => `
    <tr data-owner-id="${o.id}">
      <td>${escapeHtml(o.fullName)}</td>
      <td>${escapeHtml(o.email)}${o.phone ? `<br><small style="color:#888;">${escapeHtml(o.phone)}</small>` : ''}</td>
      <td><span class="${o.isActive ? 'badge-active' : 'badge-inactive'}">${o.isActive ? 'Activo' : 'Desactivado'}</span></td>
      <td>
        <div class="apt-list">
          ${o.apartments.map((a) => `
            <span class="apt-chip">${escapeHtml(a.name)}
              <button data-action="unassign" data-apt-id="${a.id}" title="Quitar">&times;</button>
            </span>
          `).join('') || '<span style="color:#888;font-size:12px;">Ninguno</span>'}
        </div>
        <div class="assign-row">
          <select data-action="apt-select">
            <option value="">Asignar apartamento...</option>
            ${unassignedOptionsFor(o)}
          </select>
          <button data-action="assign">Asignar</button>
        </div>
      </td>
      <td>
        <div class="actions-cell">
          <button data-action="reset-password">Resetear contraseña</button>
          <button data-action="toggle-active">${o.isActive ? 'Desactivar' : 'Activar'}</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-action="unassign"]').forEach((btn) =>
    btn.addEventListener('click', () => unassignApartment(btn.closest('tr').dataset.ownerId, btn.dataset.aptId))
  );
  tbody.querySelectorAll('button[data-action="assign"]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const select = row.querySelector('select[data-action="apt-select"]');
      if (select.value) assignApartment(row.dataset.ownerId, select.value);
    })
  );
  tbody.querySelectorAll('button[data-action="reset-password"]').forEach((btn) =>
    btn.addEventListener('click', () => resetPassword(btn.closest('tr').dataset.ownerId))
  );
  tbody.querySelectorAll('button[data-action="toggle-active"]').forEach((btn) =>
    btn.addEventListener('click', () => toggleActive(btn.closest('tr').dataset.ownerId, btn.textContent.trim() === 'Activar'))
  );
}

async function refresh() {
  await Promise.all([loadApartments(), loadOwners()]);
}

async function assignApartment(ownerId, roomId) {
  try {
    await apiFetch(`${OW}/${ownerId}/assign-room/${roomId}`, { method: 'PUT' });
    await refresh();
  } catch (err) {
    showMsg('page-msg', err.message, 'error');
  }
}

async function unassignApartment(ownerId, roomId) {
  try {
    await apiFetch(`${OW}/${ownerId}/assign-room/${roomId}`, { method: 'DELETE' });
    await refresh();
  } catch (err) {
    showMsg('page-msg', err.message, 'error');
  }
}

async function resetPassword(ownerId) {
  try {
    const data = await apiFetch(`${OW}/${ownerId}/reset-password`, { method: 'POST' });
    showMsg(
      'temp-pass-msg',
      `Contraseña temporal para <strong>${escapeHtml(data.email)}</strong>: <strong>${escapeHtml(data.tempPassword)}</strong> — compartila por WhatsApp/email, no se vuelve a mostrar.`,
      'success'
    );
  } catch (err) {
    showMsg('page-msg', err.message, 'error');
  }
}

async function toggleActive(ownerId, activate) {
  try {
    if (activate) {
      await apiFetch(`${OW}/${ownerId}`, { method: 'PUT', body: JSON.stringify({ isActive: true }) });
    } else {
      await apiFetch(`${OW}/${ownerId}`, { method: 'DELETE' });
    }
    await loadOwners();
  } catch (err) {
    showMsg('page-msg', err.message, 'error');
  }
}

// ─── Modal: nuevo administrador ────────────────────────────────────────────

const modal = document.getElementById('new-owner-modal');

document.getElementById('new-owner-btn').addEventListener('click', () => {
  document.getElementById('new-owner-name').value = '';
  document.getElementById('new-owner-email').value = '';
  document.getElementById('new-owner-phone').value = '';
  showMsg('modal-msg', '', '');
  modal.style.display = 'flex';
});

document.getElementById('new-owner-cancel').addEventListener('click', () => {
  modal.style.display = 'none';
});

document.getElementById('new-owner-confirm').addEventListener('click', async () => {
  const fullName = document.getElementById('new-owner-name').value.trim();
  const email = document.getElementById('new-owner-email').value.trim();
  const phone = document.getElementById('new-owner-phone').value.trim();

  if (!fullName || !email) {
    showMsg('modal-msg', 'Nombre y email son obligatorios', 'error');
    return;
  }

  try {
    const data = await apiFetch(OW, {
      method: 'POST',
      body: JSON.stringify({ fullName, email, phone: phone || undefined }),
    });
    modal.style.display = 'none';
    showMsg(
      'temp-pass-msg',
      `Administrador creado. Contraseña temporal para <strong>${escapeHtml(data.email)}</strong>: <strong>${escapeHtml(data.tempPassword)}</strong> — compartila por WhatsApp/email junto con <strong>/owner/login</strong> en el sitio, no se vuelve a mostrar.`,
      'success'
    );
    await loadOwners();
  } catch (err) {
    showMsg('modal-msg', err.message, 'error');
  }
});

refresh();
