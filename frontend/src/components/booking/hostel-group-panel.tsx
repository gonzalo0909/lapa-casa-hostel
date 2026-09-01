'use client';
// frontend/src/components/booking/hostel-group-panel.tsx
// Panel mostrado tras generar la sesión de pago grupal: una lista con un
// link individual y de un solo uso por invitado. El titular es el único
// que los reparte -- cada uno se lo manda a un contacto distinto por
// WhatsApp. Ningún invitado debería reenviar el suyo a otra persona: una
// vez pagado, el link muere.

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Translations } from './hostel-engine.types';
import { fmtMoney } from './hostel-engine.utils';

interface GroupLink {
  slotIndex: number;
  url: string;
  waUrl: string;
}

interface HostelGroupPanelProps {
  t: Translations;
  totalBeds: number;
  groupResNum: string;
  groupLinks: GroupLink[];
  copiedLinkIndex: number | null;
  onCopyLink: (slotIndex: number, url: string) => void;
  groupAmountPerBed: number;
  onNewBooking: () => void;
  onBookOwnBed: () => void;
}

export function HostelGroupPanel({
  t, totalBeds, groupResNum, groupLinks, copiedLinkIndex, onCopyLink,
  groupAmountPerBed, onNewBooking, onBookOwnBed,
}: HostelGroupPanelProps) {
  return (
    <div className="he-card">
      <div className="he-glink-panel">
        <div className="he-success-check">
          <CheckCircle2 size={28} color="#1E5E40" aria-hidden />
        </div>
        {groupResNum && <div className="he-glink-code">{groupResNum}</div>}
        <div className="he-glink-title">{t.gpTitle}</div>
        <div className="he-glink-desc">{t.gpDesc}</div>
        <div className="he-glink-meta">
          {groupAmountPerBed > 0 && (
            <>{totalBeds} {totalBeds === 1 ? t.tBed : t.tBeds} · {fmtMoney(groupAmountPerBed)} {t.tBed.toLowerCase()}<br /></>
          )}
          {t.gpExpire}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', margin: '1rem 0' }}>
          {groupLinks.map((l) => (
            <div
              key={l.slotIndex}
              style={{ border: '1.5px solid rgba(255,255,255,.16)', borderRadius: 11, padding: '.85rem .95rem' }}
            >
              <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.55)', wordBreak: 'break-all', marginBottom: '.55rem', fontFamily: 'monospace', lineHeight: 1.4 }}>
                {l.url}
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <a
                  href={l.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="he-glink-wa"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  {t.gpShareWa}
                </a>
                <button
                  type="button"
                  className="he-glink-copy"
                  onClick={() => onCopyLink(l.slotIndex, l.url)}
                >
                  {copiedLinkIndex === l.slotIndex ? t.gpCopied : t.gpCopy}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="he-btn-confirm"
          style={{ marginTop: '.25rem' }}
          onClick={onBookOwnBed}
        >
          {t.btnBookOwnBed}
        </button>
        <button
          className="he-btn-wa"
          style={{ marginTop: '.6rem' }}
          onClick={onNewBooking}
        >
          {t.btnNewBooking}
        </button>
      </div>
    </div>
  );
}
