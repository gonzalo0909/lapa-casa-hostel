// lapa-casa-hostel/frontend/src/components/seo/faq-section.tsx
//
// Componente FAQ visible en la página + JSON-LD FAQPage para AEO.
// Las respuestas aparecen tanto en el HTML (para lectores y Google) como en
// el schema JSON-LD (para motores de IA: ChatGPT, Perplexity, Gemini, etc.).
//
// Uso:
//   <FAQSection locale="pt" />
//   <FAQSection locale="en" pageName="hostel" />

'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  /** Idioma para mostrar el contenido */
  locale: string;
  /** Nombre de página para contexto — si se omite usa el FAQ general */
  pageName?: 'hostel' | 'apartamentos' | 'general';
  /** Título de la sección */
  title?: string;
}

// ─── Contenido FAQ por idioma ─────────────────────────────────────────────

const FAQ_CONTENT: Record<string, FAQItem[]> = {
  pt: [
    {
      question: 'Qual é o horário de check-in?',
      answer:   'O check-in é a partir das 14h. Guardamos sua bagagem gratuitamente antes desse horário.',
    },
    {
      question: 'Qual é o horário de check-out?',
      answer:   'O check-out é até as 11h. Podemos guardar sua bagagem após o check-out sem custo adicional.',
    },
    {
      question: 'Qual é a política de cancelamento?',
      answer:   'Cancelamento gratuito até 72 horas antes do check-in. Após esse prazo, cobra-se o valor da primeira noite.',
    },
    {
      question: 'Vocês oferecem descontos para grupos?',
      answer:   'Sim! Grupos com 6 ou mais camas têm 10% de desconto. Quartos completos têm 15% de desconto. Entre em contato para orçamentos personalizados.',
    },
    {
      question: 'Quais métodos de pagamento vocês aceitam?',
      answer:   'Aceitamos cartão de crédito/débito (Stripe), PIX e Mercado Pago. O pagamento pode ser parcelado.',
    },
    {
      question: 'Tem Wi-Fi grátis?',
      answer:   'Sim, Wi-Fi gratuito e de alta velocidade em todas as áreas do hostel.',
    },
    {
      question: 'Café da manhã está incluído?',
      answer:   'O café da manhã não está incluído, mas temos cozinha compartilhada disponível 24 horas.',
    },
    {
      question: 'Tem estacionamento?',
      answer:   'Não temos estacionamento próprio, mas há vagas na rua próximas ao hostel em Santa Teresa.',
    },
  ],
  en: [
    {
      question: 'What time is check-in?',
      answer:   'Check-in is from 2:00 PM. We store your luggage free of charge before that time.',
    },
    {
      question: 'What time is check-out?',
      answer:   'Check-out is by 11:00 AM. We can store your luggage after check-out at no extra cost.',
    },
    {
      question: 'What is the cancellation policy?',
      answer:   'Free cancellation up to 72 hours before check-in. After that, the first night is charged.',
    },
    {
      question: 'Do you offer group discounts?',
      answer:   'Yes! Groups of 6 or more beds get 10% off. Full room bookings get 15% off. Contact us for custom group quotes.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:   'We accept credit/debit cards (Stripe), PIX, and Mercado Pago. Installment payment available.',
    },
    {
      question: 'Is there free Wi-Fi?',
      answer:   'Yes, free high-speed Wi-Fi throughout the hostel.',
    },
    {
      question: 'Is breakfast included?',
      answer:   'Breakfast is not included, but we have a shared kitchen available 24/7.',
    },
    {
      question: 'Is there parking?',
      answer:   'We do not have our own parking, but there is street parking near the hostel in Santa Teresa.',
    },
  ],
  es: [
    {
      question: '¿Cuál es el horario de check-in?',
      answer:   'El check-in es a partir de las 14:00. Guardamos tu equipaje gratis antes de ese horario.',
    },
    {
      question: '¿Cuál es el horario de check-out?',
      answer:   'El check-out es hasta las 11:00. Podemos guardar tu equipaje después del check-out sin costo adicional.',
    },
    {
      question: '¿Cuál es la política de cancelación?',
      answer:   'Cancelación gratuita hasta 72 horas antes del check-in. Después se cobra el valor de la primera noche.',
    },
    {
      question: '¿Ofrecen descuentos para grupos?',
      answer:   '¡Sí! Grupos de 6 o más camas obtienen 10% de descuento. Habitaciones completas tienen 15% de descuento. Contáctenos para presupuestos personalizados.',
    },
    {
      question: '¿Qué métodos de pago aceptan?',
      answer:   'Aceptamos tarjeta de crédito/débito (Stripe), PIX y Mercado Pago. Pago en cuotas disponible.',
    },
    {
      question: '¿Hay Wi-Fi gratis?',
      answer:   'Sí, Wi-Fi gratuito de alta velocidad en todo el hostel.',
    },
    {
      question: '¿El desayuno está incluido?',
      answer:   'El desayuno no está incluido, pero tenemos cocina compartida disponible las 24 horas.',
    },
    {
      question: '¿Hay estacionamiento?',
      answer:   'No tenemos estacionamiento propio, pero hay lugares en la calle cerca del hostel en Santa Teresa.',
    },
  ],
  de: [
    {
      question: 'Wann ist der Check-in?',
      answer:   'Der Check-in ist ab 14:00 Uhr. Wir verwahren Ihr Gepäck kostenlos vor dieser Zeit.',
    },
    {
      question: 'Wann ist der Check-out?',
      answer:   'Der Check-out ist bis 11:00 Uhr. Wir können Ihr Gepäck nach dem Check-out kostenlos aufbewahren.',
    },
    {
      question: 'Wie lautet die Stornierungsrichtlinie?',
      answer:   'Kostenlose Stornierung bis 72 Stunden vor dem Check-in. Danach wird die erste Nacht berechnet.',
    },
    {
      question: 'Bieten Sie Gruppenrabatte an?',
      answer:   'Ja! Gruppen ab 6 Betten erhalten 10% Rabatt. Komplette Zimmerbuchungen erhalten 15% Rabatt. Kontaktieren Sie uns für individuelle Angebote.',
    },
    {
      question: 'Welche Zahlungsmethoden akzeptieren Sie?',
      answer:   'Wir akzeptieren Kredit-/Debitkarten (Stripe), PIX und Mercado Pago. Ratenzahlung verfügbar.',
    },
    {
      question: 'Gibt es kostenloses WLAN?',
      answer:   'Ja, kostenloses Hochgeschwindigkeits-WLAN im gesamten Hostel.',
    },
    {
      question: 'Ist das Frühstück inbegriffen?',
      answer:   'Das Frühstück ist nicht inbegriffen, aber wir haben eine Gemeinschaftsküche, die 24 Stunden verfügbar ist.',
    },
    {
      question: 'Gibt es Parkplätze?',
      answer:   'Wir haben keinen eigenen Parkplatz, aber es gibt Straßenparkplätze in der Nähe des Hostels in Santa Teresa.',
    },
  ],
  fr: [
    {
      question: "Quelle est l'heure d'arrivée ?",
      answer:   "L'arrivée est à partir de 14h00. Nous gardons vos bagages gratuitement avant cette heure.",
    },
    {
      question: "Quelle est l'heure de départ ?",
      answer:   "Le départ est avant 11h00. Nous pouvons garder vos bagages après le départ sans frais supplémentaires.",
    },
    {
      question: "Quelle est la politique d'annulation ?",
      answer:   "Annulation gratuite jusqu'à 72 heures avant l'arrivée. Après ce délai, la première nuit est facturée.",
    },
    {
      question: 'Proposez-vous des remises de groupe ?',
      answer:   "Oui ! Les groupes de 6 lits ou plus bénéficient de 10% de réduction. Les chambres complètes ont 15% de réduction.",
    },
    {
      question: 'Quels modes de paiement acceptez-vous ?',
      answer:   'Nous acceptons les cartes de crédit/débit (Stripe), PIX et Mercado Pago. Paiement en plusieurs fois disponible.',
    },
    {
      question: 'Y a-t-il le Wi-Fi gratuit ?',
      answer:   "Oui, Wi-Fi gratuit et haut débit dans tout l'auberge.",
    },
    {
      question: 'Le petit-déjeuner est-il inclus ?',
      answer:   "Le petit-déjeuner n'est pas inclus, mais nous avons une cuisine commune disponible 24h/24.",
    },
    {
      question: 'Y a-t-il un parking ?',
      answer:   "Nous n'avons pas de parking propre, mais il y a des places de stationnement dans la rue près de l'auberge à Santa Teresa.",
    },
  ],
};

// ─── JSON-LD builder ──────────────────────────────────────────────────────

function buildFAQSchema(items: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name:    item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    item.answer,
      },
    })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────

const TITLES: Record<string, string> = {
  pt: 'Perguntas Frequentes',
  en: 'Frequently Asked Questions',
  es: 'Preguntas Frecuentes',
  de: 'Häufig gestellte Fragen',
  fr: 'Questions fréquentes',
};

export function FAQSection({ locale, title }: FAQSectionProps) {
  const lang   = locale in FAQ_CONTENT ? locale : 'en';
  const items  = FAQ_CONTENT[lang];
  const heading = title ?? TITLES[lang] ?? 'FAQ';
  const schema = buildFAQSchema(items);

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="faq-heading" className="py-12 px-4 max-w-3xl mx-auto">
      {/* JSON-LD: consumido por Google, ChatGPT, Perplexity, Gemini */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <h2
        id="faq-heading"
        className="text-2xl font-display font-semibold text-foreground mb-8 text-center"
      >
        {heading}
      </h2>

      <dl className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="bg-card">
              <dt>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left
                             text-sm font-medium text-foreground hover:bg-accent/50
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                             transition-colors"
                >
                  <span>{item.question}</span>
                  <span
                    aria-hidden="true"
                    className={`ml-4 flex-shrink-0 text-muted-foreground transition-transform duration-200
                               ${isOpen ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </button>
              </dt>
              <dd
                id={`faq-answer-${i}`}
                className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
              >
                <p className="px-5 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export default FAQSection;
