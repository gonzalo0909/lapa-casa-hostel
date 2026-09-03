'use client';
// frontend/src/components/booking/hostel-success-panel.tsx
// Panel de éxito tras confirmar la reserva: QR PIX o link de Stripe + timer de expiración.

import React from 'react';
import { CheckCircle2, CreditCard, Check, AlertTriangle } from 'lucide-react';
import { PayMethod, Translations } from './hostel-engine.types';
import { calcPrice, fmtMoney } from './hostel-engine.utils';

type Price = ReturnType<typeof calcPrice>;

interface HostelSuccessPanelProps {
  t: Translations;
  payMethod: PayMethod;
  bookingCode: string;
  price: Price;
  pixData: { qrCode: string; qrCodeBase64: string } | null;
  pixCopied: boolean;
  onPixCopy: () => void;
  stripeUrl: string | null;
  timerStr: string;
  onNewBooking: () => void;
  /** true si processDeposit (PIX) / stripeCheckout (tarjeta) falló -- la reserva
   *  ya está creada, pero el QR real / link de pago todavía no existe. */
  paymentLinkError: boolean;
  isRetryingPayment: boolean;
  onRetryPaymentLink: () => void;
}

export function HostelSuccessPanel({
  t, payMethod, bookingCode, price, pixData, pixCopied, onPixCopy, stripeUrl, timerStr, onNewBooking,
  paymentLinkError, isRetryingPayment, onRetryPaymentLink,
}: HostelSuccessPanelProps) {
  return (
    <div className="he-card">
      <div className="he-success-panel">
        <div className="he-success-check">
          <CheckCircle2 size={28} color="#1E5E40" aria-hidden />
        </div>
        <div className="he-success-title">{t.successTitle}</div>
        <div className="he-success-sub">{t.successSub}</div>
        <div className="he-booking-code">{bookingCode}</div>
        <div className="he-pay-box">
          {payMethod === 'pix' ? (
            <>
              <div className="he-pix-lbl">{t.pixDepLabel}</div>
              {pixData?.qrCodeBase64 ? (
                /* QR real de Mercado Pago */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR PIX"
                  className="he-pix-qr-img"
                />
              ) : (
                /* El QR real todavía no llegó (processDeposit falló o sigue en
                   curso) -- antes acá se mostraba un patrón decorativo fijo que
                   parecía un QR pero no servía para pagar nada. Mejor mostrar
                   el error real y dejar reintentar sin perder la reserva ya creada. */
                <div className="he-pix-qr-error">
                  <AlertTriangle size={22} aria-hidden />
                  <p>{t.paymentLinkErrorMsg}</p>
                  <button
                    type="button"
                    className="he-pix-copy-btn"
                    onClick={onRetryPaymentLink}
                    disabled={isRetryingPayment}
                  >
                    {isRetryingPayment ? '…' : t.btnTryAgain}
                  </button>
                </div>
              )}
              <div className="he-pix-amt">{price ? fmtMoney(price.deposit) : ''}</div>
              {pixData?.qrCode && (
                <button
                  type="button"
                  className="he-pix-copy-btn"
                  onClick={onPixCopy}
                >
                  {pixCopied ? <><Check size={13} aria-hidden style={{ display: 'inline', verticalAlign: '-2px', marginRight: '.3em' }} />Código copiado</> : 'Copiar código PIX'}
                </button>
              )}
              <div className="he-pix-key">{t.pixKey}</div>
              <div className="he-timer">{t.timerLabel}: <strong>{timerStr}</strong></div>
            </>
          ) : (
            <>
              <div className="he-pix-lbl">{t.cardDepLabel}</div>
              <div style={{ margin:'.4rem 0', display:'flex', justifyContent:'center' }}>
                <CreditCard size={40} color="#7BC47F" aria-hidden />
              </div>
              <div className="he-pix-amt">{price ? fmtMoney(price.deposit) : ''}</div>
              {stripeUrl ? (
                <a
                  href={stripeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="he-stripe-link"
                >
                  {t.cardGoToPayment ?? 'Ir al pago con tarjeta →'}
                </a>
              ) : paymentLinkError ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.5rem' }}>
                  <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.85)', textAlign:'center' }}>
                    <AlertTriangle size={16} aria-hidden style={{ verticalAlign:'-3px', marginRight:'.3em' }} />
                    {t.paymentLinkErrorMsg}
                  </div>
                  <button
                    type="button"
                    className="he-pix-copy-btn"
                    onClick={onRetryPaymentLink}
                    disabled={isRetryingPayment}
                  >
                    {isRetryingPayment ? '…' : t.btnTryAgain}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.7)', marginTop:'.2rem', textAlign:'center' }}>{t.cardInstruction}</div>
              )}
              <div className="he-timer">{t.timerLabel}: <strong>{timerStr}</strong></div>
            </>
          )}
        </div>
        <div className="he-success-note">
          {payMethod === 'pix' && <>{t.pixKey}<br /></>}{t.restNote}
        </div>
        <button className="he-btn-confirm" style={{ marginTop:'1.25rem' }} onClick={onNewBooking}>
          {t.btnNewBooking}
        </button>
      </div>
    </div>
  );
}
