'use client';
// frontend/src/components/payment/auto-card-payment.tsx
//
// Detecta automáticamente si la tarjeta es 🇧🇷 brasileña (MP) o 🌍 internacional (Stripe)
// leyendo el BIN (primeros 6 dígitos). El usuario solo ingresa el número y el formulario
// correcto aparece solo — sin que tenga que elegir un tab de "nacional" o "internacional".

import React, { useState, useEffect, useRef } from 'react';
import { paymentAPI } from '@/lib/api';
import { LoadingSpinner } from '../ui/loading-spinner';
import { type PaymentLocale, createPaymentT } from './payment-i18n';
import { MpCardPayment } from './mp-card-payment';
import { StripeElementsWrapper } from './stripe-elements';
import { CardPayment } from './card-payment';

// ── Tipos ────────────────────────────────────────────────────────────────────

type CardOrigin = 'none' | 'detecting' | 'br' | 'intl';

interface StripePaymentData {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  cardSurchargePercent: number;
}

export interface AutoCardPaymentProps {
  reservationId: string;
  depositAmount: number;
  locale: PaymentLocale;
  onSuccess: (data: { paymentId: string; amount: number; currency: string }) => void;
  onError: (err: Error) => void;
}

// ── i18n ─────────────────────────────────────────────────────────────────────

const T = createPaymentT({
  pt: {
    cardNumber:   'Número do Cartão',
    cardPh:       '0000 0000 0000 0000',
    detecting:    'Identificando cartão…',
    brDetected:   '🇧🇷 Cartão brasileiro detectado',
    intlDetected: '🌍 Cartão internacional detectado',
    intlLoading:  'Preparando pagamento internacional…',
    intlError:    'Erro ao preparar pagamento. Tente novamente.',
    hint:         'Digite o número do cartão para continuar',
  },
  es: {
    cardNumber:   'Número de Tarjeta',
    cardPh:       '0000 0000 0000 0000',
    detecting:    'Identificando tarjeta…',
    brDetected:   '🇧🇷 Tarjeta brasileña detectada',
    intlDetected: '🌍 Tarjeta internacional detectada',
    intlLoading:  'Preparando pago internacional…',
    intlError:    'Error al preparar el pago. Intentá de nuevo.',
    hint:         'Ingresá el número de tarjeta para continuar',
  },
  en: {
    cardNumber:   'Card Number',
    cardPh:       '0000 0000 0000 0000',
    detecting:    'Identifying card…',
    brDetected:   '🇧🇷 Brazilian card detected',
    intlDetected: '🌍 International card detected',
    intlLoading:  'Preparing international payment…',
    intlError:    'Error preparing payment. Please try again.',
    hint:         'Enter card number to continue',
  },
  fr: {
    cardNumber:   'Numéro de Carte',
    cardPh:       '0000 0000 0000 0000',
    detecting:    'Identification de la carte…',
    brDetected:   '🇧🇷 Carte brésilienne détectée',
    intlDetected: '🌍 Carte internationale détectée',
    intlLoading:  'Préparation du paiement international…',
    intlError:    'Erreur de préparation. Réessayez.',
    hint:         'Entrez le numéro de carte pour continuer',
  },
  de: {
    cardNumber:   'Kartennummer',
    cardPh:       '0000 0000 0000 0000',
    detecting:    'Karte wird erkannt…',
    brDetected:   '🇧🇷 Brasilianische Karte erkannt',
    intlDetected: '🌍 Internationale Karte erkannt',
    intlLoading:  'Internationales Zahlungsmittel wird vorbereitet…',
    intlError:    'Fehler bei der Vorbereitung. Bitte erneut versuchen.',
    hint:         'Kartennummer eingeben um fortzufahren',
  },
  it: {
    cardNumber:   'Numero di Carta',
    cardPh:       '0000 0000 0000 0000',
    detecting:    'Identificazione carta in corso…',
    brDetected:   '🇧🇷 Carta brasiliana rilevata',
    intlDetected: '🌍 Carta internazionale rilevata',
    intlLoading:  'Preparazione del pagamento internazionale…',
    intlError:    'Errore nella preparazione. Riprova.',
    hint:         'Inserisci il numero di carta per continuare',
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

// ── Componente ───────────────────────────────────────────────────────────────

export const AutoCardPayment: React.FC<AutoCardPaymentProps> = ({
  reservationId,
  depositAmount,
  locale,
  onSuccess,
  onError,
}) => {
  const [cardNumber,    setCardNumber]   = useState('');
  const [origin,        setOrigin]       = useState<CardOrigin>('none');
  const [stripeData,    setStripeData]   = useState<StripePaymentData | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError,   setStripeError]  = useState<string | null>(null);

  const mpRef       = useRef<any>(null);
  const detectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar SDK de MP para detección por BIN ──────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (!key) return;

    const initMp = () => {
      const MP = (window as any).MercadoPago;
      if (!MP || mpRef.current) return;
      try { mpRef.current = new MP(key, { locale: 'pt-BR' }); } catch { /* silent */ }
    };

    if ((window as any).MercadoPago) { initMp(); return; }
    const script = document.createElement('script');
    script.src   = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = initMp;
    document.head.appendChild(script);
  }, []);

  // ── Detección por BIN ────────────────────────────────────────────────────

  const detectOrigin = async (bin: string) => {
    const mp = mpRef.current;
    // Si MP no cargó todavía, asumimos internacional
    if (!mp) { setOrigin('intl'); loadStripe(); return; }

    setOrigin('detecting');
    try {
      const methods = await mp.getPaymentMethods({ bin });
      if (!methods.results?.length) { setOrigin('intl'); loadStripe(); return; }

      // Parcelamento (cuotas ≥ 2) existe solo para tarjetas emitidas en Brasil
      const instData = await mp.getInstallments({
        amount:        String(Math.max(depositAmount, 1)),
        locale:        'pt-BR',
        paymentTypeId: 'credit_card',
        bin,
      });
      const hasBrInstallments = instData[0]?.payer_costs?.some(
        (c: { installments: number }) => c.installments >= 2
      ) ?? false;

      if (hasBrInstallments) {
        setOrigin('br');
      } else {
        setOrigin('intl');
        loadStripe();
      }
    } catch {
      // En caso de error, default a internacional
      setOrigin('intl');
      loadStripe();
    }
  };

  const loadStripe = async () => {
    if (stripeData) return; // ya cargado, idempotente
    setStripeLoading(true);
    setStripeError(null);
    try {
      const res = await paymentAPI.processDeposit(reservationId, 'stripe');
      const raw = (res as any).data;
      const p   = raw?.data?.payment ?? raw?.payment ?? raw?.data ?? raw;
      setStripeData({
        paymentId:            p.paymentId,
        clientSecret:         p.clientSecret         ?? '',
        amount:               p.amount,
        currency:             p.currency             ?? 'BRL',
        cardSurchargePercent: p.cardSurchargePercent ?? 0,
      });
    } catch {
      setStripeError(T('intlError', locale));
    } finally {
      setStripeLoading(false);
    }
  };

  // ── Cambio de número de tarjeta ──────────────────────────────────────────

  const handleNumberChange = (v: string) => {
    const fmt = formatCardNumber(v);
    setCardNumber(fmt);
    const raw = fmt.replace(/\s/g, '');

    if (detectTimer.current) clearTimeout(detectTimer.current);

    if (raw.length >= 6) {
      // Pequeño debounce para no lanzar la request en cada tecla
      detectTimer.current = setTimeout(() => detectOrigin(raw.slice(0, 6)), 350);
    } else {
      setOrigin('none');
      setStripeData(null);
      setStripeError(null);
    }
  };

  // ── Estilos ───────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width:         '100%',
    padding:       '.7rem .9rem',
    border:        '1.5px solid var(--border, #ddd)',
    borderRadius:  8,
    fontSize:      '1rem',
    fontFamily:    'monospace',
    background:    'var(--bg-input, #fff)',
    color:         'var(--fg, #111)',
    letterSpacing: '.05em',
    boxSizing:     'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display:      'block',
    fontSize:     '.88rem',
    fontWeight:   600,
    marginBottom: '.4rem',
    color:        'var(--fg, #111)',
  };

  const badgeStyle = (fg: string, bg: string): React.CSSProperties => ({
    display:      'flex',
    alignItems:   'center',
    gap:          '.5rem',
    padding:      '.55rem .9rem',
    borderRadius: 8,
    background:   bg,
    color:        fg,
    fontSize:     '.9rem',
    fontWeight:   600,
    marginTop:    '.75rem',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Número de tarjeta — campo principal de detección.
          Se oculta una vez que detectamos BR (MpCardPayment tiene su propio campo). */}
      {origin !== 'br' && (
        <div style={{ marginBottom: '.75rem' }}>
          <label style={labelStyle}>{T('cardNumber', locale)}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder={T('cardPh', locale)}
            value={cardNumber}
            onChange={e => handleNumberChange(e.target.value)}
            style={inputStyle}
            maxLength={19}
          />
        </div>
      )}

      {/* Estado: detectando */}
      {origin === 'detecting' && (
        <div style={badgeStyle('var(--fg-muted, #666)', 'var(--bg-card, #f7f7f5)')}>
          <LoadingSpinner size="sm" />
          {T('detecting', locale)}
        </div>
      )}

      {/* Estado: tarjeta brasileña detectada → formulario MP */}
      {origin === 'br' && (
        <>
          <div style={badgeStyle('#1E5E40', '#D1FAE5')}>
            {T('brDetected', locale)}
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <MpCardPayment
              reservationId={reservationId}
              depositAmount={depositAmount}
              surchargePercent={0}
              locale={locale}
              initialCardNumber={cardNumber.replace(/\s/g, '')}
              onSuccess={d => onSuccess({ ...d, currency: 'BRL' })}
              onError={onError}
            />
          </div>
        </>
      )}

      {/* Estado: tarjeta internacional detectada → Stripe Elements */}
      {origin === 'intl' && (
        <>
          <div style={badgeStyle('#1E3A5F', '#DBEAFE')}>
            {T('intlDetected', locale)}
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            {stripeLoading && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--fg-muted, #666)', fontSize: '.93rem' }}>
                {T('intlLoading', locale)}
              </div>
            )}
            {stripeError && (
              <div style={{
                padding: '.9rem 1.15rem', borderRadius: 10,
                background: '#FEE2E2', border: '1.5px solid #FCA5A5',
                color: '#991B1B', fontSize: '.93rem',
              }}>
                {stripeError}
              </div>
            )}
            {stripeData && (
              <StripeElementsWrapper
                clientSecret={stripeData.clientSecret}
                amount={stripeData.amount}
                currency={stripeData.currency}
              >
                <CardPayment
                  paymentId={stripeData.paymentId}
                  clientSecret={stripeData.clientSecret}
                  amount={stripeData.amount}
                  currency={stripeData.currency}
                  locale={locale}
                  onSuccess={onSuccess}
                  onError={onError}
                />
              </StripeElementsWrapper>
            )}
          </div>
        </>
      )}

      {/* Estado inicial: hint */}
      {origin === 'none' && (
        <p style={{ color: 'var(--fg-muted, #888)', fontSize: '.9rem', marginTop: '.4rem', marginBottom: 0 }}>
          {T('hint', locale)}
        </p>
      )}
    </div>
  );
};
