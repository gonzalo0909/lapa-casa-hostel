// lapa-casa-hostel/backend/src/admin/js/dynamic-pricing.js

requireAuth();
renderNav('dynamic-pricing');

var DP = '/admin/dynamic-pricing';
var cfg = {};
var allUnits = [];

// ── Helpers ───────────────────────────────────────────────────────────────

function showPageError(msg) {
  var el = document.getElementById('page-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? '' : 'none';
}

function showMsg(elId, text, type) {
  var el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = text ? '<div class="msg ' + type + '">' + escapeHtml(text) + '</div>' : '';
}

// ── Tabs ──────────────────────────────────────────────────────────────────

function switchTab(name) {
  var tabs = ['hostel', 'apartments', 'global', 'events', 'calendar'];
  var btns = document.querySelectorAll('.tab-btn');
  var panels = document.querySelectorAll('.tab-panel');
  btns.forEach(function(b, i) { b.classList.toggle('active', tabs[i] === name); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');
}

// ── Unidades ──────────────────────────────────────────────────────────────

function loadUnits() {
  return apiFetch(DP + '/unit-configs').then(function(units) {
    allUnits = units || [];
    renderUnits('hostel', 'hostel-units');
    renderUnits('apartment', 'apt-units');
    populateRoomFilter();
  }).catch(function(e) {
    document.getElementById('hostel-units').innerHTML = '<p class="msg error">Error al cargar unidades: ' + escapeHtml(e.message) + '</p>';
    document.getElementById('apt-units').innerHTML = '<p class="msg error">Error al cargar unidades: ' + escapeHtml(e.message) + '</p>';
    showPageError('No se pudieron cargar las unidades. Revisa la consola para mas detalles.');
  });
}

function renderUnits(type, containerId) {
  var units = allUnits.filter(function(u) { return u.property_type === type; });
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!units.length) { el.innerHTML = '<p style="color:var(--text-muted)">Sin unidades de este tipo.</p>'; return; }
  el.innerHTML = units.map(function(u) {
    var id = u.room_type_id;
    var checked = u.bot_enabled ? 'checked' : '';
    var label = type === 'hostel' ? '/cama' : '/noche';
    var minVal = u.min_price_brl != null ? u.min_price_brl : '';
    var maxVal = u.max_price_brl != null ? u.max_price_brl : '';
    return '<div class="unit-card" id="uc-' + id + '">' +
      '<div class="unit-name">' + escapeHtml(u.room_name) + '</div>' +
      '<div class="unit-base">Base: R$ ' + Number(u.base_price).toFixed(2) + label + '</div>' +
      '<label class="unit-toggle"><input type="checkbox" ' + checked + ' onchange="toggleUnit(\'' + id + '\', this.checked)"> Bot habilitado</label>' +
      '<div class="unit-fields">' +
        '<div><label>Minimo (BRL)</label><input type="number" id="min-' + id + '" value="' + minVal + '" placeholder="Global"></div>' +
        '<div><label>Maximo (BRL)</label><input type="number" id="max-' + id + '" value="' + maxVal + '" placeholder="Global"></div>' +
      '</div>' +
      '<div id="msg-' + id + '" style="font-size:12px;min-height:18px;"></div>' +
      '<button id="save-' + id + '" onclick="saveUnit(\'' + id + '\')">Guardar</button>' +
    '</div>';
  }).join('');
}

function saveUnit(id) {
  var btn = document.getElementById('save-' + id);
  var minEl = document.getElementById('min-' + id);
  var maxEl = document.getElementById('max-' + id);
  var msgEl = document.getElementById('msg-' + id);
  var unit = allUnits.find(function(u) { return u.room_type_id === id; });
  if (!btn || !minEl || !maxEl) return;
  var minVal = minEl.value;
  var maxVal = maxEl.value;
  btn.textContent = 'Guardando...';
  btn.disabled = true;
  apiFetch(DP + '/unit-configs/' + id, {
    method: 'PUT',
    body: JSON.stringify({
      min_price_brl: minVal !== '' ? Number(minVal) : null,
      max_price_brl: maxVal !== '' ? Number(maxVal) : null,
      bot_enabled: unit ? unit.bot_enabled : true,
    }),
  }).then(function() {
    if (msgEl) msgEl.innerHTML = '<span style="color:var(--accent)">Guardado</span>';
    return loadUnits();
  }).catch(function(e) {
    if (msgEl) msgEl.innerHTML = '<span style="color:var(--danger)">Error: ' + escapeHtml(e.message) + '</span>';
  }).finally(function() {
    setTimeout(function() {
      btn.textContent = 'Guardar';
      btn.disabled = false;
      if (msgEl) msgEl.innerHTML = '';
    }, 2500);
  });
}

function toggleUnit(id, enabled) {
  var minEl = document.getElementById('min-' + id);
  var maxEl = document.getElementById('max-' + id);
  var minVal = minEl ? minEl.value : '';
  var maxVal = maxEl ? maxEl.value : '';
  var unit = allUnits.find(function(u) { return u.room_type_id === id; });
  if (unit) unit.bot_enabled = enabled;
  apiFetch(DP + '/unit-configs/' + id, {
    method: 'PUT',
    body: JSON.stringify({
      min_price_brl: minVal !== '' ? Number(minVal) : null,
      max_price_brl: maxVal !== '' ? Number(maxVal) : null,
      bot_enabled: enabled,
    }),
  }).catch(function(e) { console.error('toggleUnit', e); });
}

// ── Config global ─────────────────────────────────────────────────────────

function renderField(key, label, container) {
  var val = cfg && cfg[key] != null ? cfg[key] : '';
  var div = document.createElement('div');
  div.innerHTML = '<label>' + label + '</label><input type="number" step="any" id="cfg-' + key + '" value="' + val + '">';
  container.appendChild(div);
}

function loadConfig() {
  return apiFetch(DP + '/config').then(function(data) {
    cfg = data || {};
    var occ  = document.getElementById('cfg-occ');
    var prox = document.getElementById('cfg-prox');
    var dow  = document.getElementById('cfg-dow');
    var lim  = document.getElementById('cfg-limits');
    var hor  = document.getElementById('cfg-horizon');
    if (!occ) return;
    [occ, prox, dow, lim, hor].forEach(function(el) { el.innerHTML = ''; });

    [['occ_tier_low_pct','Tier bajo (%)'],['occ_tier_mid_pct','Tier medio (%)'],['occ_tier_high_pct','Tier alto (%)'],['occ_tier_vhigh_pct','Tier muy alto (%)'],
     ['occ_adj_low','Ajuste bajo (%)'],['occ_adj_mid','Ajuste medio (%)'],['occ_adj_high','Ajuste alto (%)'],['occ_adj_vhigh','Ajuste muy alto (%)'],['occ_adj_max','Ajuste max (%)']
    ].forEach(function(pair) { renderField(pair[0], pair[1], occ); });

    [['prox_tier_far','Anticipado (dias)'],['prox_tier_mid','Medio (dias)'],['prox_tier_near','Proximo (dias)'],['prox_tier_close','Cercano (dias)'],
     ['prox_adj_far','Ajuste anticipado (%)'],['prox_adj_mid','Ajuste medio (%)'],['prox_adj_near','Ajuste proximo (%)'],['prox_adj_close','Ajuste cercano (%)'],['prox_adj_lastmin','Last minute (%)']
    ].forEach(function(pair) { renderField(pair[0], pair[1], prox); });

    [['dow_adj_weekday','Lun-Jue (%)'],['dow_adj_weekend','Vie-Dom (%)']].forEach(function(pair) { renderField(pair[0], pair[1], dow); });
    [['price_min_brl','Min global (BRL)'],['price_max_brl','Max global (BRL)']].forEach(function(pair) { renderField(pair[0], pair[1], lim); });
    [['horizon_days','Dias de horizonte']].forEach(function(pair) { renderField(pair[0], pair[1], hor); });
  }).catch(function(e) {
    showMsg('global-msg', 'Error al cargar configuracion: ' + e.message, 'error');
  });
}

function saveConfig() {
  var data = {};
  document.querySelectorAll('[id^="cfg-"]').forEach(function(inp) {
    data[inp.id.replace('cfg-', '')] = Number(inp.value);
  });
  apiFetch(DP + '/config', { method: 'PUT', body: JSON.stringify(data) }).then(function(updated) {
    cfg = Object.assign({}, cfg, updated || {});
    showMsg('global-msg', 'Configuracion guardada', 'ok');
    setTimeout(function() { showMsg('global-msg', '', ''); }, 3000);
  }).catch(function(e) {
    showMsg('global-msg', 'Error: ' + e.message, 'error');
  });
}

// ── Bot ───────────────────────────────────────────────────────────────────

function runBot() {
  var resEl   = document.getElementById('run-result');
  var resApt  = document.getElementById('run-result-apt');
  var runBtn  = document.getElementById('run-btn');
  if (resEl)  resEl.textContent  = 'Ejecutando...';
  if (resApt) resApt.textContent = 'Ejecutando...';
  if (runBtn) runBtn.disabled = true;
  apiFetch(DP + '/run', { method: 'POST' }).then(function(r) {
    var msg = (r.processed || 0) + ' precios calculados (' + (r.errors || 0) + ' errores)';
    if (resEl)  resEl.textContent  = msg;
    if (resApt) resApt.textContent = msg;
    loadCalendar();
  }).catch(function(e) {
    var msg = 'Error: ' + e.message;
    if (resEl)  resEl.textContent  = msg;
    if (resApt) resApt.textContent = msg;
  }).finally(function() {
    if (runBtn) runBtn.disabled = false;
  });
}

// ── Eventos ───────────────────────────────────────────────────────────────

function loadEvents() {
  return apiFetch(DP + '/events').then(function(events) {
    var list = document.getElementById('events-list');
    if (!list) return;
    events = events || [];
    if (!events.length) { list.innerHTML = '<p style="color:var(--text-muted)">Sin eventos.</p>'; return; }
    list.innerHTML = events.map(function(e) {
      var sign = e.adjustment_pct > 0 ? '+' : '';
      var inactBadge = !e.is_active ? '<span class="badge" style="background:#f0f0f0;color:#999">inactivo</span>' : '';
      var toggleLabel = e.is_active ? 'Desactivar' : 'Activar';
      return '<div class="event-row">' +
        '<div class="ev-name">' + escapeHtml(e.name) + '</div>' +
        '<div class="ev-dates">' + e.date_from + ' — ' + e.date_to + '</div>' +
        '<div class="ev-adj">' + sign + e.adjustment_pct + '%</div>' +
        '<span class="badge">' + e.applies_to + '</span>' +
        inactBadge +
        '<button onclick="toggleEvent(\'' + e.id + '\', ' + !e.is_active + ', ' + JSON.stringify(e).replace(/</g,'&lt;') + ')">' + toggleLabel + '</button>' +
        '<button onclick="deleteEvent(\'' + e.id + '\')" style="color:var(--danger)">Eliminar</button>' +
      '</div>';
    }).join('');
  }).catch(function(e) {
    showMsg('events-msg', 'Error al cargar eventos: ' + e.message, 'error');
  });
}

function createEvent() {
  var name = document.getElementById('ev-name').value.trim();
  var from = document.getElementById('ev-from').value;
  var to   = document.getElementById('ev-to').value;
  var adj  = document.getElementById('ev-adj').value;
  var apl  = document.getElementById('ev-applies').value;
  if (!name || !from || !to || !adj) { showMsg('events-msg', 'Completa todos los campos.', 'error'); return; }
  apiFetch(DP + '/events', { method: 'POST', body: JSON.stringify({ name: name, date_from: from, date_to: to, adjustment_pct: Number(adj), applies_to: apl }) })
    .then(function() {
      ['ev-name','ev-from','ev-to','ev-adj'].forEach(function(id) { document.getElementById(id).value = ''; });
      showMsg('events-msg', 'Evento creado', 'ok');
      setTimeout(function() { showMsg('events-msg', '', ''); }, 2500);
      return loadEvents();
    }).catch(function(e) { showMsg('events-msg', 'Error: ' + e.message, 'error'); });
}

function toggleEvent(id, active, eventData) {
  // Pasa todos los campos para no pisar datos en el UPDATE
  apiFetch(DP + '/events/' + id, { method: 'PUT', body: JSON.stringify(Object.assign({}, eventData, { is_active: active })) })
    .then(function() { return loadEvents(); })
    .catch(function(e) { alert('Error: ' + e.message); });
}

function deleteEvent(id) {
  if (!confirm('Eliminar evento?')) return;
  apiFetch(DP + '/events/' + id, { method: 'DELETE' })
    .then(function() { return loadEvents(); })
    .catch(function(e) { alert('Error: ' + e.message); });
}

// ── Calendario ────────────────────────────────────────────────────────────

function populateRoomFilter() {
  var sel = document.getElementById('cal-filter-room');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todas las unidades</option>';
  allUnits.forEach(function(u) {
    var opt = document.createElement('option');
    opt.value = u.room_type_id;
    opt.textContent = u.room_name;
    sel.appendChild(opt);
  });
}

function loadCalendar() {
  var daysEl  = document.getElementById('cal-days');
  var typeEl  = document.getElementById('cal-filter-type');
  var roomEl  = document.getElementById('cal-filter-room');
  var tbody   = document.getElementById('cal-body');
  if (!daysEl || !tbody) return Promise.resolve();

  var days   = daysEl.value || 60;
  var type   = typeEl ? typeEl.value : '';
  var roomId = roomEl ? roomEl.value : '';
  var params = 'days=' + days;
  if (roomId) params += '&roomTypeId=' + encodeURIComponent(roomId);

  return apiFetch(DP + '/calendar?' + params).then(function(rows) {
    rows = rows || [];
    if (type) rows = rows.filter(function(r) { return r.property_type === type; });
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text-muted);padding:20px">Sin datos. Ejecuta el bot primero.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function(r) {
      var delta = r.base_price ? ((r.final_price - r.base_price) / r.base_price * 100).toFixed(1) : 0;
      var sign  = delta > 0 ? '+' : '';
      var cls   = delta > 0 ? 'price-up' : (delta < 0 ? 'price-dn' : '');
      var occ   = r.occupancy_pct != null ? r.occupancy_pct : 0;
      return '<tr>' +
        '<td>' + r.target_date + '</td>' +
        '<td>' + escapeHtml(r.room_name) + '</td>' +
        '<td>' + r.property_type + '</td>' +
        '<td>R$ ' + Number(r.base_price).toFixed(2) + '</td>' +
        '<td><strong>R$ ' + Number(r.final_price).toFixed(2) + '</strong></td>' +
        '<td class="' + cls + '">' + sign + delta + '%</td>' +
        '<td><span class="occ-bar"><span class="occ-fill" style="width:' + occ + '%"></span></span> ' + occ + '%</td>' +
        '<td>' + (r.event_name ? escapeHtml(r.event_name) : '&mdash;') + '</td>' +
      '</tr>';
    }).join('');
  }).catch(function(e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="msg error">Error: ' + escapeHtml(e.message) + '</td></tr>';
  });
}

// ── Init ──────────────────────────────────────────────────────────────────

loadConfig();
loadUnits();
loadEvents();
loadCalendar();
