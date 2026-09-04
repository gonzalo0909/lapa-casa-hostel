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
    heroTitle: 'Seu apartamento no Rio de Janeiro, rendendo enquanto você vive sua vida.',
    heroSubtitle:
      'Cuidamos dos hóspedes, da limpeza, do check-in e do check-out. Você só acompanha a renda crescer, mês a mês.',
    ctaWhatsapp: 'Falar pelo WhatsApp',
    whatsappMessage:
      'Olá! Tenho um apartamento no Rio de Janeiro e quero saber mais sobre a gestão de aluguel por temporada.',
    benefitsTitle: 'O que você ganha como parceiro',
    benefits: [
      'Você ganha desde a primeira reserva: comissão de apenas 5%, a mais baixa do mercado — sem taxa de adesão, sem mensalidade, sem pegadinhas',
      'Fazemos o trabalho pesado: atendemos cada hóspede, coordenamos a limpeza e resolvemos qualquer imprevisto por você',
      'Você recebe rápido: o dinheiro cai na sua conta poucas horas após cada check-in',
      'Liberdade total: você não precisa morar no Rio, nem visitar seu imóvel',
      'Começar é simples: pessoa física ou jurídica, o processo é o mesmo para todos',
      'Tranquilidade de verdade: tratamos os dados dos seus hóspedes com o mesmo cuidado que dedicamos ao seu imóvel',
    ],
    contractNoteTitle: 'E o contrato?',
    contractNote:
      'O contrato vem depois, não antes. Primeiro conversamos e resolvemos suas dúvidas — só enviamos para assinatura quando você tiver 100% de certeza.',
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
    heroTitle: 'Tu apartamento en Río de Janeiro, generando ingresos mientras vos vivís tu vida.',
    heroSubtitle:
      'Nosotros nos ocupamos de los huéspedes, la limpieza, el check-in y el check-out. Vos solo mirás cómo crece tu ingreso, mes a mes.',
    ctaWhatsapp: 'Hablar por WhatsApp',
    whatsappMessage:
      '¡Hola! Tengo un apartamento en Río de Janeiro y quiero saber más sobre la gestión de alquiler por temporada.',
    benefitsTitle: 'Lo que ganas como socio',
    benefits: [
      'Ganás desde la primera reserva: comisión de solo 5%, la más baja del mercado — sin inscripción, sin mensualidad, sin sorpresas',
      'Nosotros hacemos el trabajo pesado: atendemos a cada huésped, coordinamos la limpieza y resolvemos cualquier imprevisto por vos',
      'Cobrás rápido: el dinero llega a tu cuenta a pocas horas de cada check-in',
      'Total libertad: no necesitás vivir en Río, ni siquiera visitar tu propiedad',
      'Empezar es simple: seas persona física o tengas una empresa, el proceso es el mismo para todos',
      'Tranquilidad de verdad: cuidamos los datos de tus huéspedes con el mismo rigor con que cuidamos tu propiedad',
    ],
    contractNoteTitle: '¿Y el contrato?',
    contractNote:
      'El contrato llega después, no antes. Primero conversamos y resolvemos tus dudas — recién te lo mandamos para firmar cuando estés 100% seguro.',
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
    heroTitle: 'Your apartment in Rio de Janeiro, earning while you live your life.',
    heroSubtitle:
      'We handle guests, cleaning, check-in and check-out. You just watch the income grow, month after month.',
    ctaWhatsapp: 'Chat on WhatsApp',
    whatsappMessage:
      'Hi! I have an apartment in Rio de Janeiro and I want to know more about your short-term rental management.',
    benefitsTitle: 'What you get as a partner',
    benefits: [
      'You earn from the first booking: just 5% commission, the lowest around — no sign-up fee, no monthly charge, no surprises',
      'We do the heavy lifting: we handle every guest, coordinate cleaning, and sort out anything unexpected for you',
      'Get paid fast: the money lands in your account a few hours after each check-in',
      'Total freedom: you don’t need to live in Rio, or even visit your property',
      'Getting started is simple: individual or registered business, the process is the same for everyone',
      'Real peace of mind: we handle your guests’ data with the same care we put into your property',
    ],
    contractNoteTitle: 'What about the contract?',
    contractNote:
      'The contract comes later, not first. Let’s talk and answer your questions — we’ll only send it for signature once you’re 100% sure.',
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
    heroTitle: 'Ihre Wohnung in Rio de Janeiro verdient Geld, während Sie Ihr Leben leben.',
    heroSubtitle:
      'Wir kümmern uns um Gäste, Reinigung, Check-in und Check-out. Sie sehen nur zu, wie die Einnahmen wachsen — Monat für Monat.',
    ctaWhatsapp: 'Auf WhatsApp schreiben',
    whatsappMessage:
      'Hallo! Ich habe eine Wohnung in Rio de Janeiro und möchte mehr über Ihre Verwaltung von Ferienwohnungen erfahren.',
    benefitsTitle: 'Ihre Vorteile als Partner',
    benefits: [
      'Sie verdienen ab der ersten Buchung: nur 5% Provision, die niedrigste am Markt — keine Anmeldegebühr, keine monatlichen Kosten, keine Überraschungen',
      'Wir übernehmen die Arbeit: wir betreuen jeden Gast, koordinieren die Reinigung und lösen jedes unerwartete Problem für Sie',
      'Schnelle Auszahlung: das Geld ist wenige Stunden nach jedem Check-in auf Ihrem Konto',
      'Völlige Freiheit: Sie müssen weder in Rio wohnen noch Ihre Immobilie je besuchen',
      'Der Einstieg ist einfach: Privatperson oder Unternehmen — für alle gilt derselbe Prozess',
      'Echte Sicherheit: wir behandeln die Daten Ihrer Gäste mit derselben Sorgfalt wie Ihre Immobilie',
    ],
    contractNoteTitle: 'Und der Vertrag?',
    contractNote:
      'Der Vertrag kommt später, nicht zuerst. Lassen Sie uns zunächst sprechen und Ihre Fragen klären — wir schicken ihn erst zur Unterschrift, wenn Sie sich zu 100% sicher sind.',
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
    heroTitle: 'Votre appartement à Rio de Janeiro rapporte pendant que vous vivez votre vie.',
    heroSubtitle:
      'On s’occupe des voyageurs, du ménage, du check-in et du check-out. Vous n’avez qu’à voir vos revenus grandir, mois après mois.',
    ctaWhatsapp: 'Discuter sur WhatsApp',
    whatsappMessage:
      'Bonjour ! J’ai un appartement à Rio de Janeiro et je voudrais en savoir plus sur votre gestion de location saisonnière.',
    benefitsTitle: 'Ce que vous gagnez en tant que partenaire',
    benefits: [
      'Vous gagnez dès la première réservation : seulement 5% de commission, la plus basse du marché — sans frais d’inscription, sans abonnement, sans surprise',
      'On fait le travail pour vous : on s’occupe de chaque voyageur, on coordonne le ménage et on règle le moindre imprévu',
      'Vous êtes payé rapidement : l’argent arrive sur votre compte quelques heures après chaque check-in',
      'Liberté totale : pas besoin de vivre à Rio, ni même de visiter votre bien',
      'C’est simple pour commencer : particulier ou société, la démarche est la même pour tous',
      'Une vraie tranquillité d’esprit : on traite les données de vos voyageurs avec autant de soin que votre bien',
    ],
    contractNoteTitle: 'Et le contrat ?',
    contractNote:
      'Le contrat arrive après, pas avant. Parlons-en d’abord et répondons à vos questions — on ne vous l’envoie pour signature que lorsque vous êtes sûr à 100%.',
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
    heroTitle: 'Il tuo appartamento a Rio de Janeiro guadagna mentre tu vivi la tua vita.',
    heroSubtitle:
      'Pensiamo noi agli ospiti, alle pulizie, al check-in e al check-out. Tu guardi solo il tuo guadagno crescere, mese dopo mese.',
    ctaWhatsapp: 'Scrivi su WhatsApp',
    whatsappMessage:
      "Ciao! Ho un appartamento a Rio de Janeiro e vorrei saperne di più sulla gestione dell'affitto breve.",
    benefitsTitle: 'Cosa ottieni come partner',
    benefits: [
      'Guadagni dalla prima prenotazione: solo il 5% di commissione, la più bassa sul mercato — nessuna quota di iscrizione, nessun canone mensile, nessuna sorpresa',
      'Facciamo noi il lavoro pesante: seguiamo ogni ospite, coordiniamo le pulizie e risolviamo qualsiasi imprevisto per te',
      'Vieni pagato in fretta: il denaro arriva sul tuo conto poche ore dopo ogni check-in',
      'Libertà totale: non devi vivere a Rio, né mai visitare il tuo immobile',
      'Iniziare è semplice: persona fisica o azienda, la procedura è la stessa per tutti',
      'Tranquillità vera: trattiamo i dati dei tuoi ospiti con la stessa cura che dedichiamo al tuo immobile',
    ],
    contractNoteTitle: 'E il contratto?',
    contractNote:
      'Il contratto arriva dopo, non prima. Parliamone prima e rispondiamo alle tue domande — te lo inviamo per la firma solo quando sei sicuro al 100%.',
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
