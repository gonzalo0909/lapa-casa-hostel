// group-payment-member.js — página individual del invitado (CSP-safe, multiidioma)

const API_BASE = '/api/v1';
const memberToken = location.pathname.split('/').filter(Boolean).pop();
let memberData = null;
let selectedMethod = 'pix';
let countdownInterval = null;
let pollInterval = null;
let docPhotoBase64 = null; // foto del documento (base64 JPEG)

// ── Internacionalización ──────────────────────────────────────────────────────

var STRINGS = {
  pt: {
    bannerTitle: 'Sua cama no grupo',
    bannerSub: 'Preencha seus dados e pague sua vaga.',
    progressLabel: 'Progresso do grupo',
    bedLabel: 'camas pagas',
    timeLeft: 'Tempo restante:',
    expiredMsg: 'O tempo para este pagamento em grupo terminou.\nSe ainda quiser reservar uma cama, você pode fazer diretamente:',
    btnBook: 'Reservar minha cama →',
    waBtnText: 'Fale pelo WhatsApp',
    membersLabel: 'Já pagaram',
    formTitle: 'Seus dados',
    lblName: 'Nome completo *',
    lblEmail: 'Email *',
    lblPhone: 'Telefone',
    lblCountry: 'País',
    phName: 'Seu nome completo',
    phPhone: '+55 11 99999-9999',
    phCountry: 'Brasil',
    lblDoc: 'Foto do documento (RG / Passaporte) *',
    docUploadBtn: '📷 Toque para tirar foto ou enviar imagem',
    changeDoc: 'Trocar foto',
    lblPayMethod: 'Forma de pagamento *',
    pixNoteText: 'Sem taxa',
    cardNoteText: '+10% taxa',
    priceBedLabel: 'Preço por cama',
    surchargeLabelText: 'Taxa cartão',
    totalLabelText: 'Total a pagar',
    btnPay: 'Continuar com o pagamento',
    copyPix: 'Copiar código PIX',
    pixInstr: 'Abra seu app bancário e escaneie o QR ou cole o código',
    paidTitle: '✓ Pagamento confirmado',
    paidMsg: 'Sua cama no Lapa Casa Hostel está reservada.\nVocê receberá um e-mail de confirmação em breve.',
    restrictionLabelText: 'Confirmo que tenho menos de 50 anos e li e aceito as restrições da hospedagem: as camas são beliches de três andares, não adequadas para pessoas com mobilidade reduzida.',
    errDocRequired: 'A foto do documento é obrigatória.',
    errRestriction: 'Você deve confirmar que leu e aceita as restrições antes de pagar.',
    errorLoading: 'Erro ao carregar. Tente novamente.',
    notFound: 'Link de pagamento não encontrado.',
    loading: 'Carregando...',
  },
  es: {
    bannerTitle: 'Tu cama en el grupo',
    bannerSub: 'Completá tus datos y pagá tu lugar.',
    progressLabel: 'Progreso del grupo',
    bedLabel: 'camas pagadas',
    timeLeft: 'Tiempo restante:',
    expiredMsg: 'El tiempo para este pago grupal terminó.\nSi todavía querés reservar una cama, podés hacerlo directamente:',
    btnBook: 'Reservar mi cama →',
    waBtnText: 'Escribinos por WhatsApp',
    membersLabel: 'Ya pagaron',
    formTitle: 'Tus datos',
    lblName: 'Nombre completo *',
    lblEmail: 'Email *',
    lblPhone: 'Teléfono',
    lblCountry: 'País',
    phName: 'Tu nombre completo',
    phPhone: '+54 9 11 ...',
    phCountry: 'Argentina',
    lblDoc: 'Foto del documento (DNI / Pasaporte) *',
    docUploadBtn: '📷 Tocá para sacar foto o subir imagen',
    changeDoc: 'Cambiar foto',
    lblPayMethod: 'Forma de pago *',
    pixNoteText: 'Sin recargo',
    cardNoteText: '+10% recargo',
    priceBedLabel: 'Precio por cama',
    surchargeLabelText: 'Recargo tarjeta',
    totalLabelText: 'Total a pagar',
    btnPay: 'Continuar con el pago',
    copyPix: 'Copiar código PIX',
    pixInstr: 'Abrí tu app bancaria y escaneá el QR o pegá el código',
    paidTitle: '✓ Pago confirmado',
    paidMsg: 'Tu cama en Lapa Casa Hostel está reservada.\nVas a recibir un email de confirmación a la brevedad.',
    restrictionLabelText: 'Confirmo que tengo menos de 50 años y he leído y acepto las restricciones: las camas son literas de tres pisos, no aptas para personas con movilidad reducida.',
    errDocRequired: 'La foto del documento es obligatoria.',
    errRestriction: 'Debés confirmar que leíste y aceptás las restricciones antes de pagar.',
    errorLoading: 'Error al cargar. Intentá de nuevo.',
    notFound: 'Link de pago no encontrado.',
    loading: 'Cargando...',
  },
  en: {
    bannerTitle: 'Your group bed',
    bannerSub: 'Fill in your details and pay for your spot.',
    progressLabel: 'Group progress',
    bedLabel: 'beds paid',
    timeLeft: 'Time remaining:',
    expiredMsg: 'The time for this group payment has expired.\nIf you still want to book a bed, you can do so directly:',
    btnBook: 'Book my bed →',
    waBtnText: 'Message us on WhatsApp',
    membersLabel: 'Already paid',
    formTitle: 'Your details',
    lblName: 'Full name *',
    lblEmail: 'Email *',
    lblPhone: 'Phone',
    lblCountry: 'Country',
    phName: 'Your full name',
    phPhone: '+1 ...',
    phCountry: 'United States',
    lblDoc: 'Document photo (Passport / ID) *',
    docUploadBtn: '📷 Tap to take a photo or upload image',
    changeDoc: 'Change photo',
    lblPayMethod: 'Payment method *',
    pixNoteText: 'No surcharge',
    cardNoteText: '+10% surcharge',
    priceBedLabel: 'Price per bed',
    surchargeLabelText: 'Card surcharge',
    totalLabelText: 'Total to pay',
    btnPay: 'Continue to payment',
    copyPix: 'Copy PIX code',
    pixInstr: 'Open your banking app and scan the QR or paste the code',
    paidTitle: '✓ Payment confirmed',
    paidMsg: 'Your bed at Lapa Casa Hostel is reserved.\nYou will receive a confirmation email shortly.',
    restrictionLabelText: 'I confirm that I am under 50 years old and have read and accept the accommodation restrictions: beds are triple-decker bunk beds, not suitable for people with reduced mobility.',
    errDocRequired: 'Document photo is required.',
    errRestriction: 'You must confirm that you have read and accept the restrictions before paying.',
    errorLoading: 'Error loading. Please try again.',
    notFound: 'Payment link not found.',
    loading: 'Loading...',
  },
  de: {
    bannerTitle: 'Dein Gruppenplatz',
    bannerSub: 'Fülle deine Daten aus und bezahle deinen Platz.',
    progressLabel: 'Gruppenfortschritt',
    bedLabel: 'Betten bezahlt',
    timeLeft: 'Verbleibende Zeit:',
    expiredMsg: 'Die Zeit für diese Gruppenzahlung ist abgelaufen.\nWenn du noch ein Bett buchen möchtest, kannst du es direkt tun:',
    btnBook: 'Mein Bett buchen →',
    waBtnText: 'WhatsApp schreiben',
    membersLabel: 'Bereits bezahlt',
    formTitle: 'Deine Daten',
    lblName: 'Vollständiger Name *',
    lblEmail: 'E-Mail *',
    lblPhone: 'Telefon',
    lblCountry: 'Land',
    phName: 'Dein vollständiger Name',
    phPhone: '+49 ...',
    phCountry: 'Deutschland',
    lblDoc: 'Ausweis-Foto (Reisepass / Personalausweis) *',
    docUploadBtn: '📷 Tippen um Foto aufzunehmen oder hochzuladen',
    changeDoc: 'Foto ändern',
    lblPayMethod: 'Zahlungsmethode *',
    pixNoteText: 'Kein Aufschlag',
    cardNoteText: '+10% Aufschlag',
    priceBedLabel: 'Preis pro Bett',
    surchargeLabelText: 'Kartenaufschlag',
    totalLabelText: 'Gesamtbetrag',
    btnPay: 'Zur Zahlung fortfahren',
    copyPix: 'PIX-Code kopieren',
    pixInstr: 'Öffne deine Banking-App und scanne den QR-Code oder füge den Code ein',
    paidTitle: '✓ Zahlung bestätigt',
    paidMsg: 'Dein Bett im Lapa Casa Hostel ist reserviert.\nDu erhältst in Kürze eine Bestätigungs-E-Mail.',
    restrictionLabelText: 'Ich bestätige, unter 50 Jahre alt zu sein und die Unterkunftseinschränkungen gelesen und akzeptiert zu haben: Die Betten sind dreistöckige Etagenbetten, nicht geeignet für Personen mit eingeschränkter Mobilität.',
    errDocRequired: 'Ausweis-Foto ist erforderlich.',
    errRestriction: 'Du musst bestätigen, dass du die Einschränkungen gelesen und akzeptiert hast.',
    errorLoading: 'Ladefehler. Bitte erneut versuchen.',
    notFound: 'Zahlungslink nicht gefunden.',
    loading: 'Laden...',
  },
  fr: {
    bannerTitle: 'Votre lit dans le groupe',
    bannerSub: 'Remplissez vos informations et payez votre place.',
    progressLabel: 'Progression du groupe',
    bedLabel: 'lits payés',
    timeLeft: 'Temps restant :',
    expiredMsg: 'Le délai pour ce paiement de groupe est expiré.\nSi vous souhaitez encore réserver un lit, vous pouvez le faire directement :',
    btnBook: 'Réserver mon lit →',
    waBtnText: 'Nous contacter sur WhatsApp',
    membersLabel: 'Déjà payé',
    formTitle: 'Vos informations',
    lblName: 'Nom complet *',
    lblEmail: 'E-mail *',
    lblPhone: 'Téléphone',
    lblCountry: 'Pays',
    phName: 'Votre nom complet',
    phPhone: '+33 ...',
    phCountry: 'France',
    lblDoc: "Photo du document (Passeport / Carte d'identité) *",
    docUploadBtn: '📷 Appuyez pour prendre une photo ou envoyer une image',
    changeDoc: 'Changer la photo',
    lblPayMethod: 'Mode de paiement *',
    pixNoteText: 'Sans frais',
    cardNoteText: '+10% frais',
    priceBedLabel: 'Prix par lit',
    surchargeLabelText: 'Frais carte',
    totalLabelText: 'Total à payer',
    btnPay: 'Continuer le paiement',
    copyPix: 'Copier le code PIX',
    pixInstr: 'Ouvrez votre application bancaire et scannez le QR ou collez le code',
    paidTitle: '✓ Paiement confirmé',
    paidMsg: 'Votre lit au Lapa Casa Hostel est réservé.\nVous recevrez un e-mail de confirmation sous peu.',
    restrictionLabelText: "Je confirme avoir moins de 50 ans et avoir lu et accepté les restrictions de l'hébergement : les lits sont des lits superposés à trois niveaux, non adaptés aux personnes à mobilité réduite.",
    errDocRequired: 'La photo du document est obligatoire.',
    errRestriction: 'Vous devez confirmer avoir lu et accepté les restrictions avant de payer.',
    errorLoading: 'Erreur de chargement. Veuillez réessayer.',
    notFound: 'Lien de paiement introuvable.',
    loading: 'Chargement...',
  },
  it: {
    bannerTitle: 'Il tuo posto nel gruppo',
    bannerSub: 'Inserisci i tuoi dati e paga il tuo posto.',
    progressLabel: 'Progresso del gruppo',
    bedLabel: 'letti pagati',
    timeLeft: 'Tempo rimasto:',
    expiredMsg: 'Il tempo per questo pagamento di gruppo è scaduto.\nSe vuoi ancora prenotare un letto, puoi farlo direttamente:',
    btnBook: 'Prenota il mio letto →',
    waBtnText: 'Scrivici su WhatsApp',
    membersLabel: 'Già pagato',
    formTitle: 'I tuoi dati',
    lblName: 'Nome completo *',
    lblEmail: 'Email *',
    lblPhone: 'Telefono',
    lblCountry: 'Paese',
    phName: 'Il tuo nome completo',
    phPhone: '+39 ...',
    phCountry: 'Italia',
    lblDoc: "Foto del documento (Passaporto / CI) *",
    docUploadBtn: "📷 Tocca per scattare una foto o caricare un'immagine",
    changeDoc: 'Cambia foto',
    lblPayMethod: 'Metodo di pagamento *',
    pixNoteText: 'Senza sovrapprezzo',
    cardNoteText: '+10% sovrapprezzo',
    priceBedLabel: 'Prezzo per letto',
    surchargeLabelText: 'Sovrapprezzo carta',
    totalLabelText: 'Totale da pagare',
    btnPay: 'Continua con il pagamento',
    copyPix: 'Copia codice PIX',
    pixInstr: "Apri la tua app bancaria e scansiona il QR o incolla il codice",
    paidTitle: '✓ Pagamento confermato',
    paidMsg: "Il tuo letto al Lapa Casa Hostel è prenotato.\nRiceverai un'email di conferma a breve.",
    restrictionLabelText: "Confermo di avere meno di 50 anni e di aver letto e accettato le restrizioni dell'alloggio: i letti sono a castello a tre livelli, non adatti a persone con mobilità ridotta.",
    errDocRequired: 'La foto del documento è obbligatoria.',
    errRestriction: 'Devi confermare di aver letto e accettato le restrizioni prima di pagare.',
    errorLoading: 'Errore di caricamento. Riprova.',
    notFound: 'Link di pagamento non trovato.',
    loading: 'Caricamento...',
  },
};

// Detecta el idioma del navegador/dispositivo → PT, ES, EN, DE, FR, IT (fallback: ES)
function detectLang() {
  var nav = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('it')) return 'it';
  if (nav.startsWith('en')) return 'en';
  return 'es'; // Español como fallback — audiencia principal del hostel
}

var currentLang = detectLang();
var S = STRINGS[currentLang] || STRINGS.es;

// Aplica todas las cadenas de texto al DOM
function applyLang() {
  document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : currentLang;

  // Banner
  setText('banner-title',   S.bannerTitle);
  setText('banner-sub',     S.bannerSub);

  // Progreso
  setText('progress-label', S.progressLabel);
  setText('bed-label',      S.bedLabel);
  setText('countdown-prefix', S.timeLeft);

  // Expirado
  setText('expired-msg',   S.expiredMsg);
  setText('book-link',     S.btnBook);
  // El link de "reservar directamente" respeta el idioma detectado del
  // invitado -- lapacasario.com/hostel (sin idioma) también funciona, el
  // middleware de next-intl redirige, pero así evitamos ese salto extra
  // y el invitado cae directo en su propio idioma.
  var bookLinkEl = document.getElementById('book-link');
  if (bookLinkEl) bookLinkEl.href = 'https://lapacasario.com/' + currentLang + '/hostel';
  setText('wa-btn-text',   S.waBtnText);
  setText('members-label', S.membersLabel);

  // Formulario
  setText('pay-form-title',    S.formTitle);
  setText('lbl-name',          S.lblName);
  setText('lbl-email',         S.lblEmail);
  setText('lbl-phone',         S.lblPhone);
  setText('lbl-country',       S.lblCountry);
  setText('lbl-doc',           S.lblDoc);
  setText('doc-upload-btn',    S.docUploadBtn);
  setText('btn-change-doc',    S.changeDoc);
  setText('lbl-pay-method',    S.lblPayMethod);
  setText('pix-note-text',     S.pixNoteText);
  setText('card-note-text',    null); // contiene el span del porcentaje — reconstruir
  setText('price-bed-label',   S.priceBedLabel);
  setText('surcharge-label-text', S.surchargeLabelText);
  setText('total-label-text',  S.totalLabelText);
  setText('btn-pay',           S.btnPay);
  setText('btn-copy-pix',      S.copyPix);
  setText('pix-instr',         S.pixInstr);
  setText('restriction-label-text', S.restrictionLabelText);

  // card-note-text contiene un span con el número — reconstruir innerHTML
  var cardNoteEl = document.getElementById('card-note-text');
  if (cardNoteEl) {
    // Preserva el span del porcentaje y antepone/pospone el texto traducido
    // Formato esperado: "+10% recargo" → "+<span id=surcharge-label>10</span>% recargo"
    // El surcharge-label tiene solo el número; la nota traduce el texto alrededor
    var pct = document.getElementById('surcharge-label');
    var pctNum = pct ? pct.textContent : '10';
    // Detectar si el texto empieza o termina con el porcentaje (varía por idioma)
    // Usamos un marcador simple: insertar el número dentro del texto
    var noteText = S.cardNoteText; // ej. "+10% recargo" o "+10% surcharge"
    cardNoteEl.innerHTML = noteText.replace('10', '<span id="surcharge-label">' + pctNum + '</span>');
  }

  // Placeholders
  setPlaceholder('f-name',    S.phName);
  setPlaceholder('f-phone',   S.phPhone);
  setPlaceholder('f-country', S.phCountry);

  // Estado pagado
  setText('paid-title', S.paidTitle);
  setText('paid-msg',   S.paidMsg);

  // Loading inicial
  var loadEl = document.getElementById('loading');
  if (loadEl && loadEl.textContent === '...') loadEl.textContent = S.loading;
}

function setText(id, val) {
  if (val === null) return;
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setPlaceholder(id, val) {
  var el = document.getElementById(id);
  if (el) el.placeholder = val;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

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

// ── Lógica principal ──────────────────────────────────────────────────────────

async function init() {
  applyLang();
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
    document.getElementById('loading').textContent = S.errorLoading;
  }
}

function render() {
  document.getElementById('loading').style.display = 'none';

  if (memberData.alreadyPaid || memberData.completed) { showState('paid'); return; }

  // Mostrar progreso del grupo (también en expirado)
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
          '<div class="member-method">' + (m.paymentMethod === 'card' ? 'Card' : 'PIX') + '</div>' +
        '</div>' +
        '<div class="member-paid">✓</div>' +
      '</div>'
    ).join('');
  }

  // Formulario de pago
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
  btn.textContent = '✓';
  setTimeout(() => { btn.textContent = S.copyPix; }, 2000);
}

function showExpiredInline() {
  clearInterval(pollInterval);
  clearInterval(countdownInterval);
  document.getElementById('loading').style.display  = 'none';
  document.getElementById('pay-card').style.display = 'none';
  const box = document.getElementById('countdown-box');
  box.classList.remove('urgent');
  box.classList.add('expired-time');
  document.getElementById('countdown-text').textContent = '00:00';
  document.getElementById('expired-inline').style.display = 'block';
}

function showState(state) {
  document.getElementById('loading').style.display        = 'none';
  document.getElementById('group-progress').style.display = 'none';
  document.getElementById('pay-card').style.display       = 'none';
  clearInterval(pollInterval);
  clearInterval(countdownInterval);

  if (state === 'paid') {
    document.getElementById('paid-state').style.display = 'block';
  }
}

function showNotFound() {
  const el = document.getElementById('loading');
  el.style.display = 'block';
  el.textContent = S.notFound;
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
      docBtn.textContent = '✓ ' + file.name;
      docBtn.classList.add('has-file');
      docPrev.style.display = 'block';
    } catch {
      docBtn.textContent = '⚠ ' + S.errDocRequired;
    }
  });

  changeBtn.addEventListener('click', function() {
    docInput.click();
  });

  // ── Formulario de pago ──────────────────────────────────────
  document.getElementById('pay-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errEl = document.getElementById('pay-error');
    errEl.style.display = 'none';

    // Validar foto del documento
    if (!docPhotoBase64) {
      errEl.textContent = S.errDocRequired;
      errEl.style.display = 'block';
      return;
    }

    // Validar restricción de edad — bloqueo total
    const restrictionCheck = document.getElementById('restriction-check');
    if (!restrictionCheck.checked) {
      errEl.textContent = S.errRestriction;
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('btn-pay');
    btn.disabled = true;
    btn.textContent = '...';

    try {
      const r = await fetch(`${API_BASE}/payments/group-member/${memberToken}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: {
            full_name: document.getElementById('f-name').value.trim(),
            email:     document.getElementById('f-email').value.trim(),
            phone:     document.getElementById('f-phone').value.trim()   || undefined,
            country:   document.getElementById('f-country').value.trim() || undefined,
          },
          paymentMethod: selectedMethod,
          documentPhotoBase64: docPhotoBase64,
        }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error || 'Error');

      const result = data.data;
      if (selectedMethod === 'card' && result.checkoutUrl) {
        location.href = result.checkoutUrl;
      } else if (selectedMethod === 'pix' && result.pixData) {
        showPixBlock(result.pixData);
        btn.disabled = false;
        btn.textContent = S.btnPay;
      }
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = S.btnPay;
    }
  });

  init();
});
