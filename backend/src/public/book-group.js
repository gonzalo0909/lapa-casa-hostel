// ─── Estado ─────────────────────────────────────────────────
var beds = 2;
var PRICE_PER_BED_NIGHT = 85; // BRL base — igual que el backend
var DEPOSIT_RATE = 0.30;

// Temporadas (misma lógica que el backend)
function getSeason(checkIn) {
  var m = checkIn.getMonth() + 1; // 1-12
  var d = checkIn.getDate();
  if ((m === 12 && d >= 20) || m === 1 || m === 2 || (m === 3 && d <= 10)) return 1.5;
  if (m === 6 || m === 9) return 0.8;
  return 1.0;
}

// ─── Beds picker ────────────────────────────────────────────
function changeBeds(delta) {
  beds = Math.min(20, Math.max(2, beds + delta));
  document.getElementById('bedsVal').textContent = beds;
  document.getElementById('bedsDown').disabled = beds <= 2;
  document.getElementById('bedsUp').disabled   = beds >= 20;
  updatePrice();
}

function updatePrice() {
  var ci = document.getElementById('checkIn').value;
  var co = document.getElementById('checkOut').value;
  if (!ci || !co) { document.getElementById('priceBox').style.display = 'none'; return; }
  var d1 = new Date(ci + 'T12:00:00');
  var d2 = new Date(co + 'T12:00:00');
  if (d2 <= d1) { document.getElementById('priceBox').style.display = 'none'; return; }
  var nights = Math.round((d2 - d1) / 86400000);
  var mult = getSeason(d1);
  // Descuento de grupo
  // El descuento se basa en el grupo completo (N), pero el total cubre N-1 invitados
  // (el titular reserva su propia cama por separado)
  var disc = 0;
  if (beds >= 10) disc = 0.15;
  else if (beds >= 6)  disc = 0.10;
  else if (beds >= 4)  disc = 0.05;
  var pbn = Math.round(PRICE_PER_BED_NIGHT * mult);
  var total = Math.round(pbn * (beds - 1) * nights * (1 - disc));
  var depPerPerson = Math.round(pbn * nights * DEPOSIT_RATE * (1 - disc));
  document.getElementById('priceBox').style.display = 'flex';
  document.getElementById('depPerPerson').textContent = 'R$ ' + depPerPerson.toFixed(0);
  document.getElementById('totalPrice').textContent   = 'R$ ' + total.toFixed(0);
  document.getElementById('pricePerInfo').innerHTML   =
    'R$ ' + pbn + '/cama/noche<br>' + nights + ' noche' + (nights > 1 ? 's' : '') +
    '<br>' + (beds - 1) + ' invitado' + ((beds - 1) > 1 ? 's' : '') +
    (disc ? '<br><span style="color:#7BC47F">−' + (disc*100) + '% grupo</span>' : '');
}

document.getElementById('checkIn').addEventListener('change', updatePrice);
document.getElementById('checkOut').addEventListener('change', updatePrice);

// Fecha mínima = hoy
(function() {
  var today = new Date().toISOString().slice(0,10);
  document.getElementById('checkIn').min  = today;
  document.getElementById('checkOut').min = today;
  document.getElementById('bedsDown').disabled = true; // empieza en 2
})();

// ─── Error ──────────────────────────────────────────────────
function showErr(id, msg) {
  var el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 7000);
}

// ─── Navegación: mostrar links (paso 2) ─────────────────────
function showLinks() {
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  document.getElementById('dot1').className  = 'step-dot done';
  document.getElementById('line1').className = 'step-line done';
  document.getElementById('dot2').className  = 'step-dot active';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Crear sesión ────────────────────────────────────────────
async function crearSesion() {
  // Validar fechas
  var ci = document.getElementById('checkIn').value;
  var co = document.getElementById('checkOut').value;
  if (!ci) { showErr('err-form', 'Seleccioná la fecha de check-in.'); return; }
  if (!co) { showErr('err-form', 'Seleccioná la fecha de check-out.'); return; }
  var d1 = new Date(ci + 'T12:00:00');
  var d2 = new Date(co + 'T12:00:00');
  var today = new Date(); today.setHours(0,0,0,0);
  if (d1 < today) { showErr('err-form', 'El check-in no puede ser en el pasado.'); return; }
  if (d2 <= d1)   { showErr('err-form', 'El check-out debe ser posterior al check-in.'); return; }
  var nights = Math.round((d2 - d1) / 86400000);
  if (nights < 1) { showErr('err-form', 'La estadía mínima es 1 noche.'); return; }

  // Validar datos del titular
  var name    = document.getElementById('titularName').value.trim();
  var email   = document.getElementById('titularEmail').value.trim();
  if (!name)  { showErr('err-form', 'El nombre es obligatorio.'); return; }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    showErr('err-form', 'Ingresá un email válido.'); return;
  }

  // Validar restricción de edad — bloqueo total
  if (!document.getElementById('age-check').checked) {
    showErr('err-form', 'Debés confirmar que ningún integrante del grupo supera los 50 años para poder continuar.');
    return;
  }

  var phone    = document.getElementById('titularPhone').value.trim();
  var country  = document.getElementById('titularCountry').value;
  var requests = document.getElementById('titularRequests').value.trim();

  var btn = document.getElementById('btnConfirm');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Generando links…';

  try {
    var res = await fetch('/api/v1/payments/group-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkIn: ci,
        checkOut: co,
        totalBeds: beds,
        nights: nights,
        guestGender: 'mixed',
        titular: {
          full_name: name,
          email: email,
          phone: phone || undefined,
          country: country || undefined,
          language: 'es',
        },
        specialRequests: requests || undefined,
      })
    });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || JSON.stringify(data));

    renderLinks(data.data, ci, co, nights);
    showLinks();
  } catch (err) {
    showErr('err-form', err.message || 'Error al crear la sesión. Intentá de nuevo.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Generar links de pago';
  }
}

// ─── Render links ────────────────────────────────────────────
function fmtDate(str) {
  var parts = str.split('-');
  var y = parts[0], m = parts[1], d = parts[2];
  var months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return parseInt(d) + ' ' + months[parseInt(m)-1] + ' ' + y;
}

var WA_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
  '</svg>';

function buildLinkCard(l, idx) {
  var waHref = l.waUrl || ('https://wa.me/?text=' + encodeURIComponent(l.url));
  return '<div class="link-card">' +
    '<div class="link-url">' + l.url + '</div>' +
    '<div class="link-actions">' +
      '<a class="btn-wa" href="' + waHref + '" target="_blank" rel="noopener">' +
        WA_SVG + ' Compartir' +
      '</a>' +
      '<button class="btn-copy" id="copy' + idx + '" onclick="copyLink(' + idx + ', \'' + l.url + '\')">Copiar</button>' +
    '</div>' +
  '</div>';
}

function renderLinks(data, ci, co, nights) {
  // Resumen de la sesión
  var infoEl = document.getElementById('sessionInfo');
  infoEl.innerHTML =
    '<div class="si-row"><span>Check-in</span><span class="si-val">'  + fmtDate(ci) + '</span></div>' +
    '<div class="si-row"><span>Check-out</span><span class="si-val">' + fmtDate(co) + '</span></div>' +
    '<div class="si-row"><span>Noches</span><span class="si-val">'    + nights + '</span></div>' +
    '<div class="si-row"><span>Camas</span><span class="si-val">'     + beds + '</span></div>';

  // Todos los links — el titular reserva su cama por separado, estos son todos para los invitados
  var links = data.memberLinks || [];
  var container = document.getElementById('linksPanel');
  container.innerHTML = links.map(function(l, idx) {
    return buildLinkCard(l, idx + 1);
  }).join('');
}

function copyLink(idx, url) {
  navigator.clipboard.writeText(url).catch(function() {
    // fallback para navegadores sin clipboard API
    var ta = document.createElement('textarea');
    ta.value = url; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
  var btn = document.getElementById('copy' + idx);
  btn.textContent = '✓ Copiado';
  btn.classList.add('copied');
  setTimeout(function() { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2500);
}
