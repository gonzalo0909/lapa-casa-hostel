'use client';
// frontend/src/components/payment/auto-card-payment.tsx
//
// Muestra el formulario MP completo desde el inicio (todos los campos visibles).
// Detección de BIN en segundo plano: si el usuario pega/escribe 6+ dígitos y la
// tarjeta es internacional, aparece un banner con opción de cambiar a Stripe.
// Los brasileños nunca tienen que esperar — ven el formulario completo de inmediato.

import React, { useState, useEffect, useRef } from 'react';
import { paymentAPI } from '@/lib/api';
import { LoadingSpinner } from '../ui/loading-spinner';
import { type PaymentLocale, createPaymentT } from './payment-i18n';
import { MpCardPayment } from './mp-card-payment';
import { StripeElementsWrapper } from './stripe-elements';
import { CardPayment } from './card-payment';

// ── Tipos ────────────────────────────────────────────────────────────────────

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
    intlBanner:   '🌍 Parece que seu cartão é internacional.',
    switchStripe: 'Pagar com cartão internacional',
    intlLoading:  'Preparando pagamento internacional…',
    intlError:    'Erro ao preparar pagamento. Tente novamente.',
    orBr:         'Ou use cartão brasileiro',
  },
  es: {
    intlBanner:   '🌍 Parece que tu tarjeta es internacional.',
    switchStripe: 'Pagar con tarjeta internacional',
    intlLoading:  'Preparando pago internacional…',
    intlError:    'Error al preparar el pago. Intentá de nuevo.',
    orBr:         'O usar tarjeta brasileña',
  },
  en: {
    intlBanner:   '🌍 Looks like your card is international.',
    switchStripe: 'Pay with international card',
    intlLoading:  'Preparing international payment…',
    intlError:    'Error preparing payment. Please try again.',
    orBr:         'Or use a Brazilian card',
  },
  fr: {
    intlBanner:   '🌍 Votre carte semble être internationale.',
    switchStripe: 'Payer avec une carte internationale',
    intlLoading:  'Préparation du paiement international…',
    intlError:    'Erreur de préparation. Réessayez.',
    orBr:         'Ou utiliser une carte brésilienne',
  },
  de: {
    intlBanner:   '🌍 Ihre Karte scheint international zu sein.',
    switchStripe: 'Mit internationaler Karte bezahlen',
    intlLoading:  'Internationales Zahlungsmittel wird vorbereitet…',
    intlError:    'Fehler bei der Vorbereitung. Bitte erneut versuchen.',
    orBr:         'Oder brasilianische Karte verwenden',
  },
  it: {
    intlBanner:   '🌍 La tua carta sembra essere internazionale.',
    switchStripe: 'Paga con carta internazionale',
    intlLoading:  'Preparazione del pagamento internazionale…',
    intlError:    'Errore nella preparazione. Riprova.',
    orBr:         'O usa una carta brasiliana',
  },
});

// ── Componente ───────────────────────────────────────────────────────────────

export const AutoCardPayment: React.FC<AutoCardPaymentProps> = ({
  reservationId,
  depositAmount,
  locale,
  onSuccess,
  onError,
}) => {
  // 'mp'    = formulario MP (default, todos los campos visibles)
  // 'intl'  = formulario Stripe
  const [mode, setMode] = useState<'mp' | 'intl'>('mp');

  // Banner de detección internacional (se muestra sobre el form MP cuando detectamos INTL)
  const [intlDetected, setIntlDetected] = useState(false);

  const [stripeData,    setStripeData]    = useState<StripePaymentData | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError,   setStripeError]   = useState<string | null>(null);

  const mpRef = useRef<any>(null);

  // ── Cargar SDK de MP para detección por BIN en segundo plano ─────────────

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

  // ── Detección de BIN en segundo plano ────────────────────────────────────
  // MpCardPayment llama a este callback cuando el usuario escribe 6+ dígitos.
  // Solo mostramos el banner si detectamos tarjeta internacional.

  const handleBinChange = async (bin: string) => {
    const mp = mpRef.current;
    if (!mp || bin.length < 6) { setIntlDetected(false); return; }

    try {
      const methods = await mp.getPaymentMethods({ bin });
      if (!methods.results?.length) { setIntlDetected(true); return; }

      const instData = await mp.getInstallments({
        amount:        String(Math.max(depositAmount, 1)),
        locale:        'pt-BR',
        paymentTypeId: 'credit_card',
        bin,
      });
      const hasBrInstallments = instData[0]?.payer_costs?.some(
        (c: { installments: number }) => c.installments >= 2
      ) ?? false;

      setIntlDetected(!hasBrInstallments);
    } catch {
      // Si falla la detección, no mostramos el banner — dejamos pagar con MP
      setIntlDetected(false);
    }
  };

  // ── Cambio a Stripe ───────────────────────────────────────────────────────

  const switchToStripe = async () => {
    if (stripeData) { setMode('intl'); return; }
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
      setMode('intl');
    } catch {
      setStripeError(T('intlError', locale));
    } finally {
      setStripeLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Modo Stripe
  if (mode === 'intl') {
    return (
      <div>
        {stripeLoading && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--fg-muted, #666)', fontSize: '.93rem' }}>
            <LoadingSpinner size="sm" /> {T('intlLoading', locale)}
          </div>
        )}
        {stripeError && (
          <div style={{
            padding: '.9rem 1.15rem', borderRadius: 10, marginBottom: '.75rem',
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
        {/* Volver a MP */}
        <button
          type="button"
          onClick={() => { setMode('mp'); setIntlDetected(false); }}
          style={{
            marginTop: '1rem', background: 'none', border: 'none',
            color: 'var(--fg-muted, #888)', fontSize: '.85rem',
            cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}
        >
          ← {T('orBr', locale)}
        </button>
      </div>
    );
  }

  // Modo MP (default) — todos los campos visibles desde el inicio
  return (
    <div>
      {/* Banner de tarjeta internacional detectada */}
      {intlDetected && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '.75rem', flexWrap: 'wrap',
          padding: '.65rem 1rem', borderRadius: 8, marginBottom: '.85rem',
          background: '#DBEAFE', border: '1px solid #93C5FD',
          fontSize: '.88rem', color: '#1E3A5F',
        }}>
          <span>{T('intlBanner', locale)}</span>
          <button
            type="button"
            onClick={switchToStripe}
            disabled={stripeLoading}
            style={{
              background: '#1E3A5F', color: '#fff', border: 'none',
              borderRadius: 6, padding: '.4rem .85rem',
              fontSize: '.85rem', fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {stripeLoading ? <LoadingSpinner size="sm" /> : T('switchStripe', locale)}
          </button>
        </div>
      )}

      {/* Formulario MP completo — visible desde el inicio */}
      <MpCardPayment
        reservationId={reservationId}
        depositAmount={depositAmount}
        surchargePercent={0}
        locale={locale}
        onSuccess={d => onSuccess({ ...d, currency: 'BRL' })}
        onError={onError}
        onBinChange={handleBinChange}
      />
    </div>
  );
};
