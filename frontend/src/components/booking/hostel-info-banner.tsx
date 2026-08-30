'use client';
// frontend/src/components/booking/hostel-info-banner.tsx
// Banner fijo de "información importante" (check-in/check-out, documento, edad mínima).
// Independiente del wizard: se muestra siempre, en cualquier phase/step.

import React from 'react';
import { AlertTriangle, KeyRound, DoorOpen, FileText, Ban, CigaretteOff } from 'lucide-react';
import { Lang } from './hostel-engine.types';

const INFO_RULES: Record<string, Array<{ Icon: React.ElementType; text: React.ReactNode }>> = {
  pt: [
    { Icon: KeyRound,     text: <>Check-in (entrada): <strong>14h às 22h</strong> — para chegar antes, reserve também o dia anterior</> },
    { Icon: DoorOpen,     text: <>Check-out (saída): até as <strong>12h</strong> — para sair mais tarde, reserve um dia a mais</> },
    { Icon: FileText,     text: <>O envio da foto do documento é <strong>obrigatório</strong>, sem exceção</> },
    { Icon: CigaretteOff, text: <>Proibido fumar no hostel e nas áreas comuns</> },
    { Icon: Ban,          text: <>Somente para <strong>maiores de 18 anos</strong></> },
  ],
  es: [
    { Icon: KeyRound,     text: <>Check-in (entrada): <strong>14h a 22h</strong> — para llegar antes, reservá también el día anterior</> },
    { Icon: DoorOpen,     text: <>Check-out (salida): hasta las <strong>12h</strong> — para salir más tarde, mejor reservá un día más</> },
    { Icon: FileText,     text: <>El envío de la foto del documento es <strong>obligatorio</strong>, sin excepción</> },
    { Icon: CigaretteOff, text: <>Prohibido fumar en el hostel y en las áreas comunes</> },
    { Icon: Ban,          text: <>Solo para <strong>mayores de 18 años</strong></> },
  ],
  en: [
    { Icon: KeyRound,     text: <>Check-in: <strong>2 pm to 10 pm</strong> — arriving earlier? Book the previous night</> },
    { Icon: DoorOpen,     text: <>Check-out: by <strong>12 pm</strong> — need more time? Book one extra night</> },
    { Icon: FileText,     text: <>Sending a photo of your ID is <strong>mandatory</strong>, no exceptions</> },
    { Icon: CigaretteOff, text: <>Smoking in the hostel and common areas is prohibited</> },
    { Icon: Ban,          text: <>Guests must be <strong>18 or older</strong></> },
  ],
};
const INFO_TITLE: Record<string, string> = {
  pt: 'INFORMAÇÃO IMPORTANTE',
  es: 'INFORMACIÓN IMPORTANTE',
  en: 'IMPORTANT INFORMATION',
};

interface HostelInfoBannerProps { lang: Lang; }

export function HostelInfoBanner({ lang }: HostelInfoBannerProps) {
  return (
    <div className="he-info-box">
      <div className="he-info-title">
        <AlertTriangle size={13} aria-hidden />
        {INFO_TITLE[lang]}
      </div>
      <div className="he-info-grid">
        {(INFO_RULES[lang] ?? []).map(({ Icon, text }, i) => (
          <div key={i} className="he-info-item">
            <Icon size={14} aria-hidden />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
