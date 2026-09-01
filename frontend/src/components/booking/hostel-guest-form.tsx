'use client';
// frontend/src/components/booking/hostel-guest-form.tsx
// Step 3 — Formulario completo del huésped.
// Incluye formateo CPF/phone inline, validación por campo y política de cancelación.

import React from 'react';
import { KeyRound, DoorOpen, FileText, Ban, CigaretteOff, AlertTriangle, ChevronDown, Camera } from 'lucide-react';
import { Lang, FormState, FormErrors, T } from './hostel-engine.types';
import { validateCPF, formatCPF, formatPhone } from './hostel-engine.utils';

// Redimensiona la foto del documento a max 900px de ancho antes de mandarla
// -- evita subir la foto de un celular a resolución completa.
function resizeDocPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 900 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Props ────────────────────────────────────────────────
interface HostelGuestFormProps {
  lang: Lang;
  form: FormState;
  formErrors: FormErrors;
  docFeedback: string;
  emailFb: string;
  phoneFb: string;
  cancelOpen: boolean;
  onFormChange: (patch: Partial<FormState>) => void;
  onFormErrors: (patch: Partial<FormErrors>) => void;
  onDocFeedback: (v: string) => void;
  onEmailFb: (v: string) => void;
  onPhoneFb: (v: string) => void;
  onCancelToggle: () => void;
}

// ─── Iconos de reglas de la casa (Lucide) ────────────────
const RULE_ICONS = [KeyRound, DoorOpen, FileText, Ban, CigaretteOff] as const;

// ─── Component ────────────────────────────────────────────
export function HostelGuestForm({
  lang, form, formErrors, docFeedback, emailFb, phoneFb, cancelOpen,
  onFormChange, onFormErrors, onDocFeedback, onEmailFb, onPhoneFb, onCancelToggle,
}: HostelGuestFormProps) {
  const t = T[lang];

  return (
    <div className="he-panel">
      <div className="he-panel-title">{t.p3title}</div>
      <div className="he-panel-sub">{t.p3sub}</div>

      {/* Nombre completo */}
      <div className="he-form-row">
        <label className="he-label" htmlFor="he-f-name">
          <span>{t.lblName}</span> <span className="he-req">*</span>
        </label>
        <input
          id="he-f-name"
          className={`he-inp${formErrors.name ? ' err' : form.name.trim().length > 2 ? ' ok' : ''}`}
          value={form.name}
          placeholder={t.lblName}
          onChange={e => onFormChange({ name: e.target.value })}
          onBlur={() => onFormErrors({ name: form.name.trim().length <= 2 ? t.errName : undefined })}
        />
        {formErrors.name && <div className="he-ferr">{formErrors.name}</div>}
      </div>

      {/* E-mail */}
      <div className="he-form-row">
        <label className="he-label" htmlFor="he-f-email">
          <span>{t.lblEmail}</span> <span className="he-req">*</span>
        </label>
        <input
          id="he-f-email"
          className={`he-inp${formErrors.email ? ' err' : !formErrors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? ' ok' : ''}`}
          type="email"
          value={form.email}
          placeholder="seu@email.com"
          autoComplete="off"
          onPaste={e => e.preventDefault()}
          onChange={e => onFormChange({ email: e.target.value })}
          onBlur={() => {
            const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
            onEmailFb(form.email ? (ok ? '✓ E-mail válido' : '✗ E-mail inválido') : '');
            onFormErrors({ email: !ok ? t.errEmail : undefined });
          }}
        />
        {formErrors.email && <div className="he-ferr">{formErrors.email}</div>}
        {emailFb && <div className={`he-ffb ${emailFb.startsWith('✓') ? 'ok' : 'err'}`}>{emailFb}</div>}
      </div>

      {/* Confirmar e-mail */}
      <div className="he-form-row">
        <label className="he-label" htmlFor="he-f-email2">
          <span>{t.lblEmail2}</span> <span className="he-req">*</span>{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '.65rem' }}>{t.noPaste}</span>
        </label>
        <input
          id="he-f-email2"
          className={`he-inp${formErrors.email2 ? ' err' : form.email2 && form.email2 === form.email ? ' ok' : ''}`}
          type="email"
          value={form.email2}
          placeholder="seu@email.com"
          autoComplete="off"
          onPaste={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
          onChange={e => onFormChange({ email2: e.target.value })}
        />
        {formErrors.email2 && <div className="he-ferr">{formErrors.email2}</div>}
      </div>

      {/* WhatsApp + País */}
      <div className="he-form-row-2">
        <div>
          <label className="he-label" htmlFor="he-f-phone">
            <span>{t.lblPhone}</span> <span className="he-req">*</span>
          </label>
          <input
            id="he-f-phone"
            className={`he-inp${formErrors.phone ? ' err' : !formErrors.phone && form.phone.replace(/\D/g, '').length >= 10 ? ' ok' : ''}`}
            type="tel"
            value={form.phone}
            placeholder="+55 21 9 9999-9999"
            inputMode="numeric"
            maxLength={20}
            onChange={e => onFormChange({ phone: formatPhone(e.target.value) })}
            onBlur={() => {
              const ok = form.phone.replace(/\D/g, '').length >= 10;
              onPhoneFb(form.phone ? (ok ? '✓ Telefone válido' : '✗ Mínimo 10 dígitos') : '');
              onFormErrors({ phone: !ok ? t.errPhone : undefined });
            }}
          />
          {formErrors.phone && <div className="he-ferr">{formErrors.phone}</div>}
          {phoneFb && <div className={`he-ffb ${phoneFb.startsWith('✓') ? 'ok' : 'err'}`}>{phoneFb}</div>}
        </div>
        <div>
          <label className="he-label" htmlFor="he-f-country">
            <span>{t.lblCountry}</span> <span className="he-req">*</span>
          </label>
          <select
            id="he-f-country"
            className={`he-inp he-sel${formErrors.country ? ' err' : form.country ? ' ok' : ''}`}
            value={form.country}
            onChange={e => onFormChange({ country: e.target.value, doc: '' })}
          >
            <option value="">{t.selectPlaceholder}</option>
            <option value="BR">Brasil</option>
            <option value="AR">Argentina</option>
            <option value="CO">Colombia</option>
            <option value="CL">Chile</option>
            <option value="US">Estados Unidos</option>
            <option value="DE">Alemanha / Germany</option>
            <option value="FR">França / France</option>
            <option value="GB">Reino Unido / UK</option>
            <option value="PT">Portugal</option>
            <option value="ES">España / Espanha</option>
            <option value="IT">Italia / Itália</option>
            <option value="OTHER">{t.optOther}</option>
          </select>
          {formErrors.country && <div className="he-ferr">{formErrors.country}</div>}
        </div>
      </div>

      {/* CPF/Pasaporte + Horario de llegada */}
      <div className="he-form-row-2">
        <div>
          <label className="he-label" htmlFor="he-f-doc">
            <span>{form.country === 'BR' ? t.lblCPF : t.lblPassport}</span> <span className="he-req">*</span>
          </label>
          <input
            id="he-f-doc"
            className={`he-inp${formErrors.doc ? ' err' : docFeedback.startsWith('✓') ? ' ok' : ''}`}
            value={form.doc}
            placeholder={form.country === 'BR' ? t.phCPF : t.phPassport}
            maxLength={form.country === 'BR' ? 14 : 30}
            onChange={e => {
              const v = e.target.value;
              if (form.country === 'BR' && !/[a-zA-Z]/.test(v)) onFormChange({ doc: formatCPF(v) });
              else onFormChange({ doc: v });
            }}
            onBlur={() => {
              const isBR   = form.country === 'BR';
              const digits = form.doc.replace(/\D/g, '');
              if (isBR) {
                const ok = digits.length === 11 && validateCPF(digits);
                onDocFeedback(digits.length === 11 ? (ok ? t.fbCPFok : t.fbCPFerr) : '');
                onFormErrors({ doc: !ok ? t.errCPF : undefined });
              } else {
                const ok = form.doc.trim().length > 4;
                onDocFeedback(ok ? t.fbDocOk : '');
                onFormErrors({ doc: !ok ? t.errDocForeign : undefined });
              }
            }}
          />
          {formErrors.doc && <div className="he-ferr">{formErrors.doc}</div>}
          {docFeedback && <div className={`he-ffb ${docFeedback.startsWith('✓') ? 'ok' : 'err'}`}>{docFeedback}</div>}
        </div>
        <div>
          <label className="he-label" htmlFor="he-f-arrival">
            <span>{t.lblArrival}</span> <span className="he-req">*</span>
          </label>
          <select
            id="he-f-arrival"
            className={`he-inp he-sel${formErrors.arrival ? ' err' : form.arrival ? ' ok' : ''}`}
            value={form.arrival}
            onChange={e => onFormChange({ arrival: e.target.value })}
          >
            <option value="">{t.arrivalPlaceholder}</option>
            {['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
              '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'].map(h =>
              <option key={h}>{h}</option>
            )}
          </select>
          {formErrors.arrival && <div className="he-ferr">{formErrors.arrival}</div>}
        </div>
      </div>

      {/* Foto del documento — obligatoria */}
      <div className="he-form-row">
        <label className="he-label" htmlFor="he-f-doc-photo">
          <span>{t.lblDocPhoto}</span> <span className="he-req">*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="he-f-doc-photo"
            type="file"
            accept="image/*"
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const dataUrl = await resizeDocPhoto(file);
                onFormChange({ docPhotoBase64: dataUrl });
                onFormErrors({ docPhoto: undefined });
              } catch {
                onFormErrors({ docPhoto: t.errDocPhoto });
              }
            }}
          />
          <div
            className={`he-inp${formErrors.docPhoto ? ' err' : form.docPhotoBase64 ? ' ok' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', cursor: 'pointer', textAlign: 'center' }}
          >
            <Camera size={15} aria-hidden />
            {form.docPhotoBase64 ? t.changeDocPhoto : t.docPhotoBtn}
          </div>
        </div>
        {form.docPhotoBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.docPhotoBase64}
            alt=""
            style={{ marginTop: '.5rem', width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }}
          />
        )}
        {formErrors.docPhoto && <div className="he-ferr">{formErrors.docPhoto}</div>}
      </div>

      {/* Solicitudes especiales */}
      <div className="he-form-row">
        <label className="he-label" htmlFor="he-f-req">
          <span>{t.lblRequests}</span>{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t.optional}</span>
        </label>
        <textarea
          id="he-f-req"
          className="he-inp he-textarea"
          value={form.requests}
          placeholder="..."
          onChange={e => onFormChange({ requests: e.target.value })}
        />
      </div>

      {/* Reglas de la casa */}
      <div className="he-rules">
        <div className="he-rules-title">
          <AlertTriangle size={14} color="#6A6058" aria-hidden />
          {t.rulesTitle}
        </div>
        {([t.rule1, t.rule2, t.rule3, t.rule4, t.rule5] as string[]).map((rule, i) => {
          const Icon = RULE_ICONS[i];
          return (
            <div key={i} className="he-rule">
              {Icon && <Icon size={15} color="#6A6058" aria-hidden />}
              <span>{rule}</span>
            </div>
          );
        })}
      </div>

      {/* Restricción de edad y movilidad — obligatoria */}
      <div style={{ background: 'rgba(255,255,255,.05)', border: '1.5px solid rgba(255,255,255,.14)', borderRadius: 9, padding: '.85rem .9rem', margin: '.9rem 0' }}>
        <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '.82rem', lineHeight: 1.5 }}>
          <input
            type="checkbox"
            id="he-f-restriction"
            checked={form.restrictionAccepted}
            onChange={e => {
              onFormChange({ restrictionAccepted: e.target.checked });
              onFormErrors({ restriction: undefined });
            }}
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }}
          />
          <span>{t.restrictionText}</span>
        </label>
        {formErrors.restriction && <div className="he-ferr">{formErrors.restriction}</div>}
      </div>

      {/* Política de cancelación */}
      <div className="he-cancel">
        <button className="he-cancel-btn" type="button" onClick={onCancelToggle}>
          <span>{t.cancelBtn}</span>
          <span className={`he-chevron${cancelOpen ? ' open' : ''}`}>
            <ChevronDown size={16} aria-hidden />
          </span>
        </button>
        {cancelOpen && (
          <div className="he-cancel-body">
            <div className="he-cancel-row">
              <span className="he-cbadge he-cbadge-g">{t.cancelFree}</span>
              <span>{t.cancelFreeText}</span>
            </div>
            <div className="he-cancel-row">
              <span className="he-cbadge he-cbadge-r">{t.cancelNo}</span>
              <span>{t.cancelNoText}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
