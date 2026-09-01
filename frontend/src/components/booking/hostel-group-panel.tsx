'use client';
// frontend/src/components/booking/hostel-group-panel.tsx
// Panel mostrado tras generar un link de pago grupal: muestra el link, botón de
// copiar y de compartir por WhatsApp.

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Translations } from './hostel-engine.types';
import { fmtMoney } from './hostel-engine.utils';

interface HostelGroupPanelProps {
  t: Translations;
  totalBeds: number;
  groupResNum: string;
  groupLink: string;
  groupWaUrl: string;
  groupLinkCopied: boolean;
  onCopyLink: () => void;
  groupAmountPerBed: number;
  onNewBooking: () => void;
  onBookOwnBed: () => void;
}

export function HostelGroupPanel({
  t, totalBeds, groupResNum, groupLink, groupWaUrl, groupLinkCopied, onCopyLink,
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
        <div className="he-glink-url">{groupLink}</div>
        <div className="he-glink-btns">
          <button
            type="button"
            className="he-glink-copy"
            onClick={onCopyLink}
          >
            {groupLinkCopied ? t.gpCopied : t.gpCopy}
          </button>
          <a href={groupWaUrl} target="_blank" rel="noopener noreferrer" className="he-glink-wa">
            {t.gpShareWa}
          </a>
        </div>
        <div className="he-glink-meta">
          {groupAmountPerBed > 0 && (
            <>{totalBeds} {totalBeds === 1 ? t.tBed : t.tBeds} · {fmtMoney(groupAmountPerBed)} {t.tBed.toLowerCase()}<br /></>
          )}
          {t.gpExpire}
        </div>
        <button
          className="he-btn-confirm"
          style={{ marginTop: '1.25rem' }}
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
