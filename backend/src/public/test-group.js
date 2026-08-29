async function crear() {
  var btn = document.getElementById('btn');
  var errEl = document.getElementById('error');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Creando...';

  try {
    var r = await fetch('/api/v1/payments/group-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkIn:    document.getElementById('checkIn').value,
        checkOut:   document.getElementById('checkOut').value,
        totalBeds:  parseInt(document.getElementById('totalBeds').value),
        nights:     parseInt(document.getElementById('nights').value),
        titular: {
          full_name: document.getElementById('titularName').value,
          email:     document.getElementById('titularEmail').value,
        }
      })
    });
    var data = await r.json();
    if (!data.success) {
      var msg = data.error || data.message || JSON.stringify(data);
      throw new Error(msg);
    }

    var links = data.data.memberLinks || [];
    var container = document.getElementById('links');
    container.innerHTML = links.map(function(l) {
      return '<div class="link-row">' +
        '<span class="slot-num">Cama ' + l.slotIndex + '</span>' +
        '<a class="link-url" href="' + l.url + '" target="_blank">' + l.url + '</a>' +
        '<a class="open-btn" href="' + l.url + '" target="_blank">Abrir →</a>' +
      '</div>';
    }).join('');

    document.getElementById('result').style.display = 'block';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear sesión y ver links';
  }
}
