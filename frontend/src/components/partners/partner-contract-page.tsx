// lapa-casa-hostel/frontend/src/components/partners/partner-contract-page.tsx
//
// Página pública para administradores de propiedad interesados en sumar
// su apartamento a Lapa Casa. Antes mostraba el contrato legal completo
// (12 cláusulas) de entrada -- reemplazado por un pitch de beneficios +
// contacto, a pedido del dueño: el contrato se comparte recién cuando el
// interesado ya tiene decidido avanzar, no antes. Reescrito además con
// las clases Tailwind del resto del sitio (antes tenía estilos inline
// propios, sin relación visual con la home).

'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { partnersAPI } from '@/lib/api';

interface Props {
  locale: string;
}

interface PartnersContent {
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaWhatsapp: string;
  whatsappMessage: string;
  benefitsTitle: string;
  benefits: string[];
  contractNoteTitle: string;
  contractNote: string;
  formTitle: string;
  formBody: string;
  labelName: string;
  labelEmail: string;
  labelPhone: string;
  labelProperty: string;
  labelMessage: string;
  placeholderName: string;
  placeholderEmail: string;
  placeholderPhone: string;
  placeholderProperty: string;
  placeholderMessage: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  errorBody: string;
}

const CONTENT: Record<string, PartnersContent> = {
  pt: {
    eyebrow: 'Rio de Janeiro · Programa de Parceiros',
    heroTitle: 'Seu apartamento rendendo no Rio de Janeiro, sem você mexer um dedo.',
    heroSubtitle: 'Cuidamos de tudo: hóspedes, check-in, check-out e limpeza. Você só recebe.',
    ctaWhatsapp: 'Falar pelo WhatsApp',
    whatsappMessage:
      'Olá! Tenho um apartamento no Rio de Janeiro e quero saber mais sobre a gestão de aluguel por temporada.',
    benefitsTitle: 'O que você ganha como parceiro',
    benefits: [
      'Comissão de apenas 5% por reserva confirmada — sem taxa de adesão nem mensalidade',
      'Cuidamos de tudo: check-in, check-out, atendimento ao hóspede e coordenação da limpeza',
      'Repasse automático poucas horas após cada check-in, via TED ou PIX',
      'Você não precisa estar disponível no imóvel nem morar perto',
      'Pessoa física ou jurídica, tanto faz — as condições são as mesmas',
      'Tratamos os dados dos seus hóspedes com todo o cuidado exigido pela LGPD',
    ],
    contractNoteTitle: 'E o contrato?',
    contractNote:
      'Só enviamos o contrato completo quando você já tiver certeza de que quer seguir em frente — não precisa ler cláusula por cláusula antes de dar o primeiro passo. Fale com a gente e resolvemos suas dúvidas primeiro.',
    formTitle: 'Quero listar minha propriedade',
    formBody:
      'Preencha o formulário e nossa equipe entra em contato para conversar sobre seu imóvel.',
    labelName: 'Nome completo',
    labelEmail: 'E-mail',
    labelPhone: 'WhatsApp / Telefone',
    labelProperty: 'Endereço da propriedade',
    labelMessage: 'Mensagem (opcional)',
    placeholderName: 'João Silva',
    placeholderEmail: 'joao@email.com',
    placeholderPhone: '+55 21 99999-9999',
    placeholderProperty: 'Rua X, Santa Teresa, RJ',
    placeholderMessage: 'Conte um pouco sobre seu imóvel, disponibilidade, dúvidas...',
    submit: 'Quero ser parceiro(a)',
    submitting: 'Enviando…',
    successTitle: 'Mensagem enviada!',
    successBody: 'Entraremos em contato em até 48 horas úteis.',
    errorBody: 'Erro ao enviar. Tente novamente ou entre em contato por e-mail.',
  },
  es: {
    eyebrow: 'Río de Janeiro · Programa de Socios',
    heroTitle: 'Tu apartamento generando ingresos en Río de Janeiro, sin mover un dedo.',
    heroSubtitle:
      'Nos encargamos de todo: huéspedes, check-in, check-out y limpieza. Tú solo cobras.',
    ctaWhatsapp: 'Hablar por WhatsApp',
    whatsappMessage:
      '¡Hola! Tengo un apartamento en Río de Janeiro y quiero saber más sobre la gestión de alquiler por temporada.',
    benefitsTitle: 'Lo que ganas como socio',
    benefits: [
      'Comisión de solo 5% por reserva confirmada — sin tarifa de inscripción ni mensualidad',
      'Nos encargamos de todo: check-in, check-out, atención al huésped y coordinación de limpieza',
      'Pago automático a pocas horas de cada check-in, por TED o PIX',
      'No necesitas estar disponible en la propiedad ni vivir cerca',
      'Persona física o empresa, da igual — las condiciones son las mismas',
      'Cuidamos los datos de tus huéspedes con todo el resguardo que exige la LGPD',
    ],
    contractNoteTitle: '¿Y el contrato?',
    contractNote:
      'El contrato completo se lo mandamos recién cuando ya tengas la certeza de que querés seguir adelante — no hace falta leer cláusula por cláusula antes de dar el primer paso. Hablemos primero y resolvemos tus dudas.',
    formTitle: 'Quiero listar mi propiedad',
    formBody:
      'Completa el formulario y nuestro equipo se pone en contacto para conversar sobre tu inmueble.',
    labelName: 'Nombre completo',
    labelEmail: 'Email',
    labelPhone: 'WhatsApp / Teléfono',
    labelProperty: 'Dirección de la propiedad',
    labelMessage: 'Mensaje (opcional)',
    placeholderName: 'Juan Pérez',
    placeholderEmail: 'juan@email.com',
    placeholderPhone: '+55 21 99999-9999',
    placeholderProperty: 'Calle X, Santa Teresa, RJ',
    placeholderMessage: 'Cuéntanos un poco sobre tu propiedad, disponibilidad, dudas...',
    submit: 'Quiero ser socio',
    submitting: 'Enviando…',
    successTitle: '¡Mensaje enviado!',
    successBody: 'Nos pondremos en contacto en un plazo de 48 horas hábiles.',
    errorBody: 'Error al enviar. Intenta de nuevo o escríbenos por email.',
  },
  en: {
    eyebrow: 'Rio de Janeiro · Partner Program',
    heroTitle: 'Your apartment earning in Rio de Janeiro, without you lifting a finger.',
    heroSubtitle:
      'We handle everything: guests, check-in, check-out, and cleaning. You just collect.',
    ctaWhatsapp: 'Chat on WhatsApp',
    whatsappMessage:
      'Hi! I have an apartment in Rio de Janeiro and I want to know more about your short-term rental management.',
    benefitsTitle: 'What you get as a partner',
    benefits: [
      'Just 5% commission per confirmed booking — no sign-up fee, no monthly charge',
      'We handle everything: check-in, check-out, guest support, and cleaning coordination',
      'Automatic payout a few hours after each check-in, by bank transfer',
      'You don’t need to be on-site or live nearby',
      'Individuals or registered businesses — same terms either way',
      'We handle your guests’ data with the care required by data protection law (LGPD)',
    ],
    contractNoteTitle: 'What about the contract?',
    contractNote:
      'We only send the full contract once you’re sure you want to move forward — no need to read every clause before taking the first step. Let’s talk first and answer your questions.',
    formTitle: 'I want to list my property',
    formBody: 'Fill out the form and our team will reach out to talk about your property.',
    labelName: 'Full name',
    labelEmail: 'Email',
    labelPhone: 'WhatsApp / Phone',
    labelProperty: 'Property address',
    labelMessage: 'Message (optional)',
    placeholderName: 'John Smith',
    placeholderEmail: 'john@email.com',
    placeholderPhone: '+55 21 99999-9999',
    placeholderProperty: 'Street X, Santa Teresa, RJ',
    placeholderMessage: 'Tell us a bit about your property, availability, questions...',
    submit: 'I want to be a partner',
    submitting: 'Sending…',
    successTitle: 'Message sent!',
    successBody: 'We’ll get back to you within 48 business hours.',
    errorBody: 'Something went wrong. Please try again or email us directly.',
  },
  de: {
    eyebrow: 'Rio de Janeiro · Partnerprogramm',
    heroTitle: 'Ihre Wohnung in Rio de Janeiro bringt Einnahmen, ohne dass Sie etwas tun müssen.',
    heroSubtitle:
      'Wir kümmern uns um alles: Gäste, Check-in, Check-out und Reinigung. Sie kassieren einfach.',
    ctaWhatsapp: 'Auf WhatsApp schreiben',
    whatsappMessage:
      'Hallo! Ich habe eine Wohnung in Rio de Janeiro und möchte mehr über Ihre Verwaltung von Ferienwohnungen erfahren.',
    benefitsTitle: 'Ihre Vorteile als Partner',
    benefits: [
      'Nur 5% Provision pro bestätigter Buchung — keine Anmeldegebühr, keine monatlichen Kosten',
      'Wir kümmern uns um alles: Check-in, Check-out, Gästebetreuung und Reinigungskoordination',
      'Automatische Auszahlung wenige Stunden nach jedem Check-in, per Überweisung',
      'Sie müssen nicht vor Ort sein oder in der Nähe wohnen',
      'Privatperson oder Unternehmen — die Bedingungen sind gleich',
      'Wir behandeln die Daten Ihrer Gäste mit der von der LGPD geforderten Sorgfalt',
    ],
    contractNoteTitle: 'Und der Vertrag?',
    contractNote:
      'Den vollständigen Vertrag schicken wir erst, wenn Sie sicher sind, dass Sie fortfahren möchten — Sie müssen nicht jede Klausel lesen, bevor Sie den ersten Schritt machen. Lassen Sie uns zuerst sprechen und Ihre Fragen klären.',
    formTitle: 'Ich möchte meine Immobilie eintragen',
    formBody:
      'Füllen Sie das Formular aus, unser Team meldet sich, um über Ihre Immobilie zu sprechen.',
    labelName: 'Vollständiger Name',
    labelEmail: 'E-Mail',
    labelPhone: 'WhatsApp / Telefon',
    labelProperty: 'Adresse der Immobilie',
    labelMessage: 'Nachricht (optional)',
    placeholderName: 'Max Mustermann',
    placeholderEmail: 'max@email.com',
    placeholderPhone: '+55 21 99999-9999',
    placeholderProperty: 'Straße X, Santa Teresa, RJ',
    placeholderMessage: 'Erzählen Sie uns etwas über Ihre Immobilie, Verfügbarkeit, Fragen...',
    submit: 'Ich möchte Partner werden',
    submitting: 'Wird gesendet…',
    successTitle: 'Nachricht gesendet!',
    successBody: 'Wir melden uns innerhalb von 48 Werktagsstunden.',
    errorBody:
      'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns per E-Mail.',
  },
  fr: {
    eyebrow: 'Rio de Janeiro · Programme Partenaire',
    heroTitle:
      'Votre appartement génère des revenus à Rio de Janeiro, sans que vous ayez à vous en occuper.',
    heroSubtitle:
      'On s’occupe de tout : voyageurs, check-in, check-out et ménage. Vous n’avez qu’à encaisser.',
    ctaWhatsapp: 'Discuter sur WhatsApp',
    whatsappMessage:
      'Bonjour ! J’ai un appartement à Rio de Janeiro et je voudrais en savoir plus sur votre gestion de location saisonnière.',
    benefitsTitle: 'Ce que vous gagnez en tant que partenaire',
    benefits: [
      'Seulement 5% de commission par réservation confirmée — sans frais d’inscription ni abonnement',
      'On s’occupe de tout : check-in, check-out, assistance aux voyageurs et coordination du ménage',
      'Virement automatique quelques heures après chaque check-in, par virement bancaire',
      'Vous n’avez pas besoin d’être sur place ni d’habiter à proximité',
      'Particulier ou société — les conditions sont les mêmes',
      'Nous traitons les données de vos voyageurs avec la rigueur exigée par le RGPD/LGPD',
    ],
    contractNoteTitle: 'Et le contrat ?',
    contractNote:
      'Nous n’envoyons le contrat complet qu’une fois que vous êtes certain de vouloir avancer — pas besoin de lire chaque clause avant de faire le premier pas. Parlons-en d’abord et répondons à vos questions.',
    formTitle: 'Je veux inscrire mon bien',
    formBody:
      'Remplissez le formulaire et notre équipe vous contactera pour discuter de votre bien.',
    labelName: 'Nom complet',
    labelEmail: 'E-mail',
    labelPhone: 'WhatsApp / Téléphone',
    labelProperty: 'Adresse du bien',
    labelMessage: 'Message (optionnel)',
    placeholderName: 'Jean Dupont',
    placeholderEmail: 'jean@email.com',
    placeholderPhone: '+55 21 99999-9999',
    placeholderProperty: 'Rue X, Santa Teresa, RJ',
    placeholderMessage: 'Parlez-nous un peu de votre bien, disponibilité, questions...',
    submit: 'Je veux devenir partenaire',
    submitting: 'Envoi…',
    successTitle: 'Message envoyé !',
    successBody: 'Nous vous répondrons sous 48 heures ouvrables.',
    errorBody: 'Une erreur est survenue. Réessayez ou écrivez-nous par e-mail.',
  },
  it: {
    eyebrow: 'Rio de Janeiro · Programma Partner',
    heroTitle:
      'Il tuo appartamento genera reddito a Rio de Janeiro, senza che tu debba muovere un dito.',
    heroSubtitle: 'Pensiamo a tutto: ospiti, check-in, check-out e pulizie. Tu incassi soltanto.',
    ctaWhatsapp: 'Scrivi su WhatsApp',
    whatsappMessage:
      "Ciao! Ho un appartamento a Rio de Janeiro e vorrei saperne di più sulla gestione dell'affitto breve.",
    benefitsTitle: 'Cosa ottieni come partner',
    benefits: [
      'Solo il 5% di commissione per prenotazione confermata — nessuna quota di iscrizione né canone mensile',
      'Pensiamo a tutto: check-in, check-out, assistenza agli ospiti e coordinamento delle pulizie',
      'Pagamento automatico poche ore dopo ogni check-in, tramite bonifico',
      "Non devi essere presente nell'immobile né abitare nelle vicinanze",
      'Persona fisica o azienda, per noi è lo stesso — le condizioni non cambiano',
      'Trattiamo i dati dei tuoi ospiti con tutta la cura richiesta dalla normativa (LGPD)',
    ],
    contractNoteTitle: 'E il contratto?',
    contractNote:
      'Il contratto completo te lo inviamo solo quando sei sicuro di voler andare avanti — non serve leggere ogni clausola prima di fare il primo passo. Parliamone prima e rispondiamo alle tue domande.',
    formTitle: 'Voglio inserire il mio immobile',
    formBody: 'Compila il modulo e il nostro team ti contatterà per parlare del tuo immobile.',
    labelName: 'Nome completo',
    labelEmail: 'Email',
    labelPhone: 'WhatsApp / Telefono',
    labelProperty: "Indirizzo dell'immobile",
    labelMessage: 'Messaggio (facoltativo)',
    placeholderName: 'Mario Rossi',
    placeholderEmail: 'mario@email.com',
    placeholderPhone: '+55 21 99999-9999',
    placeholderProperty: 'Via X, Santa Teresa, RJ',
    placeholderMessage: 'Raccontaci qualcosa sul tuo immobile, disponibilità, domande...',
    submit: 'Voglio diventare partner',
    submitting: 'Invio…',
    successTitle: 'Messaggio inviato!',
    successBody: 'Ti contatteremo entro 48 ore lavorative.',
    errorBody: "Errore durante l'invio. Riprova o scrivici via email.",
  },
};

function ContactForm({ c }: { c: PartnersContent }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', property: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await partnersAPI.contact(form);
      setSent(true);
    } catch {
      setError(c.errorBody);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-8">
        <CheckCircle size={40} className="text-primary" />
        <p className="font-semibold text-foreground">{c.successTitle}</p>
        <p className="text-sm text-muted-foreground">{c.successBody}</p>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40';
  const labelClass = 'block text-xs font-semibold text-foreground mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{c.labelName} *</label>
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={c.placeholderName}
          />
        </div>
        <div>
          <label className={labelClass}>{c.labelEmail} *</label>
          <input
            required
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder={c.placeholderEmail}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{c.labelPhone}</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder={c.placeholderPhone}
          />
        </div>
        <div>
          <label className={labelClass}>{c.labelProperty} *</label>
          <input
            required
            className={inputClass}
            value={form.property}
            onChange={(e) => setForm((f) => ({ ...f, property: e.target.value }))}
            placeholder={c.placeholderProperty}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>{c.labelMessage}</label>
        <textarea
          rows={3}
          className={`${inputClass} resize-y`}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder={c.placeholderMessage}
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="self-start inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <Mail size={16} />
        {sending ? c.submitting : c.submit}
      </button>
    </form>
  );
}

export function PartnerContractPage({ locale }: Props) {
  const c = CONTENT[locale] ?? CONTENT.pt!;
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5521977157530';

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-4">
            {c.eyebrow}
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-5 leading-tight">
            {c.heroTitle}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">
            {c.heroSubtitle}
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(c.whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            💬 {c.ctaWhatsapp}
          </a>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4">
        {/* ── Beneficios ── */}
        <section className="py-12 border-b border-border">
          <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
            {c.benefitsTitle}
          </h2>
          <ul className="space-y-3">
            {c.benefits.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Nota sobre el contrato ── */}
        <section className="py-12 border-b border-border">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-2">
              {c.contractNoteTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.contractNote}</p>
          </div>
        </section>

        {/* ── Formulario de contacto ── */}
        <section className="py-12">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-display font-semibold text-foreground mb-2">
              {c.formTitle}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">{c.formBody}</p>
            <ContactForm c={c} />
          </div>
        </section>
      </div>
    </div>
  );
}
