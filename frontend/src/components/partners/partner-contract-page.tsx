// lapa-casa-hostel/frontend/src/components/partners/partner-contract-page.tsx
//
// Página de parceiros — propuesta para dueños de propiedad en Río.

'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

interface Props {
  locale: string;
}

const PARTNER_NARRATIVE: Record<string, {
  intro: string;
  body: string[];
  service: string[];
  cta: string;
  whatsappMessage: string;
  ctaLabel: string;
}> = {
  es: {
    intro: 'Tu apartamento en Río, administrado como si fuera de Lapa Casa Río.',
    body: [
      'Río no se explica en un cartel turístico. Se explica en el barrio, en el almacén de la esquina, en la vista que solo existe desde esa ventana a esa hora de la tarde. Eso es lo que tu apartamento tiene para dar — no una habitación más, sino un pedazo real de la ciudad.',
      'Un taxista cuenta una versión de Río; alguien que vive ahí cuenta otra, la que la mayoría de los viajeros busca sin saber que la está buscando. Tu apartamento ya puede ser esa versión para alguien. No hace falta hacer nada para lograrlo — ya está en las paredes, en cómo lo armaste.',
      'Lo que hace falta es que llegue a la persona correcta, y que alguien se ocupe de todo lo que viene después.',
    ],
    service: [
      'De eso se encarga Lapa Casa Río: administra tu apartamento como propio. Elige al huésped, coordina la entrada y la salida, resuelve lo que aparezca durante la estadía, organiza la limpieza entre una reserva y otra.',
      'Vos no atendés un mensaje ni un imprevisto. Recibís lo que te corresponde, con condiciones claras acordadas antes de empezar — sin sorpresas, sin letra chica.',
      'No es una plataforma ni un algoritmo administrando tu propiedad. Es Lapa Casa Río respondiendo por cada huésped que entra a tu apartamento.',
    ],
    cta: 'Cuando quieras, hablamos de tu apartamento.',
    ctaLabel: 'Quiero saber más',
    whatsappMessage: '¡Hola! Tengo un apartamento en Río de Janeiro y quiero saber más sobre la gestión de alquiler por temporada.',
  },
  pt: {
    intro: 'Seu apartamento no Rio, administrado como se fosse da Lapa Casa Rio.',
    body: [
      'O Rio não se explica em um cartaz turístico. Se explica no bairro, no bar da esquina, na vista que só existe daquela janela àquela hora da tarde. É isso que o seu apartamento tem para oferecer — não mais um quarto, mas um pedaço real da cidade.',
      'Um taxista conta uma versão do Rio; quem mora lá conta outra, a que a maioria dos viajantes busca sem saber que está buscando. Seu apartamento já pode ser essa versão para alguém. Não é preciso fazer nada para isso — já está nas paredes, no jeito como você montou o lugar.',
      'O que falta é chegar à pessoa certa, e alguém cuidar de tudo que vem depois.',
    ],
    service: [
      'É disso que a Lapa Casa Rio cuida: administra seu apartamento como se fosse seu. Escolhe o hóspede, coordena a entrada e a saída, resolve o que aparecer durante a estadia, organiza a limpeza entre uma reserva e outra.',
      'Você não atende uma mensagem nem um imprevisto. Recebe o que é seu, com condições claras acordadas antes de começar — sem surpresas, sem letras miúdas.',
      'Não é uma plataforma nem um algoritmo administrando sua propriedade. É a Lapa Casa Rio respondendo por cada hóspede que entra no seu apartamento.',
    ],
    cta: 'Quando quiser, a gente conversa sobre seu apartamento.',
    ctaLabel: 'Quero saber mais',
    whatsappMessage: 'Olá! Tenho um apartamento no Rio de Janeiro e quero saber mais sobre a gestão de aluguel por temporada.',
  },
  en: {
    intro: 'Your apartment in Rio, managed as if it were Lapa Casa Rio\'s own.',
    body: [
      'Rio doesn\'t explain itself on a tourist poster. It explains itself in the neighborhood, in the corner store, in the view that only exists from that window at that hour of the afternoon. That\'s what your apartment has to offer — not another room, but a real piece of the city.',
      'A taxi driver tells one version of Rio; someone who lives there tells another — the one most travelers search for without knowing what they\'re looking for. Your apartment can already be that version for someone. Nothing needs to be done to make it so — it\'s already in the walls, in how you set it up.',
      'What\'s needed is for it to reach the right person, and for someone to handle everything that comes after.',
    ],
    service: [
      'That\'s what Lapa Casa Rio takes care of: manages your apartment as its own. Selects the guest, coordinates check-in and check-out, handles whatever comes up during the stay, organizes cleaning between bookings.',
      'You don\'t answer a message or deal with a surprise. You receive what\'s yours, with clear conditions agreed upon before anything starts — no surprises, no fine print.',
      'It\'s not a platform or an algorithm managing your property. It\'s Lapa Casa Rio answering for every guest who walks through your apartment door.',
    ],
    cta: 'Whenever you\'re ready, let\'s talk about your apartment.',
    ctaLabel: 'Tell me more',
    whatsappMessage: 'Hi! I have an apartment in Rio de Janeiro and I want to know more about your short-term rental management.',
  },
  fr: {
    intro: 'Votre appartement à Rio, géré comme s\'il appartenait à Lapa Casa Rio.',
    body: [
      'Rio ne s\'explique pas sur une affiche touristique. Il s\'explique dans le quartier, à l\'épicerie du coin, dans la vue qui n\'existe que depuis cette fenêtre à cette heure de l\'après-midi. C\'est ce que votre appartement a à offrir — pas une chambre de plus, mais un vrai morceau de la ville.',
      'Un chauffeur de taxi raconte une version de Rio ; quelqu\'un qui y vit en raconte une autre — celle que la plupart des voyageurs cherchent sans savoir ce qu\'ils cherchent. Votre appartement peut déjà être cette version pour quelqu\'un. Rien n\'a besoin d\'être fait pour y arriver — c\'est déjà dans les murs, dans la façon dont vous l\'avez aménagé.',
      'Ce qu\'il faut, c\'est qu\'il atteigne la bonne personne, et que quelqu\'un s\'occupe de tout ce qui suit.',
    ],
    service: [
      'C\'est de cela que Lapa Casa Rio s\'occupe : gérer votre appartement comme le sien. Choisit le voyageur, coordonne l\'arrivée et le départ, résout ce qui se présente pendant le séjour, organise le ménage entre deux réservations.',
      'Vous ne répondez à aucun message ni à aucun imprévu. Vous recevez ce qui vous revient, avec des conditions claires convenues avant de commencer — sans surprises, sans petites lignes.',
      'Ce n\'est pas une plateforme ni un algorithme qui gère votre propriété. C\'est Lapa Casa Rio qui répond de chaque voyageur qui entre dans votre appartement.',
    ],
    cta: 'Quand vous voulez, parlons de votre appartement.',
    ctaLabel: 'En savoir plus',
    whatsappMessage: 'Bonjour ! J\'ai un appartement à Rio de Janeiro et je voudrais en savoir plus sur votre gestion de location saisonnière.',
  },
  de: {
    intro: 'Ihre Wohnung in Rio, verwaltet als wäre es die eigene von Lapa Casa Rio.',
    body: [
      'Rio erklärt sich nicht auf einem Touristenposter. Es erklärt sich im Viertel, im Eckladen, in dem Ausblick, der nur von diesem Fenster zu dieser Tageszeit existiert. Das ist, was Ihre Wohnung zu bieten hat — kein weiteres Zimmer, sondern ein echtes Stück der Stadt.',
      'Ein Taxifahrer erzählt eine Version von Rio; jemand, der dort lebt, erzählt eine andere — die, nach der die meisten Reisenden suchen, ohne zu wissen, wonach sie suchen. Ihre Wohnung kann diese Version für jemanden sein. Es muss nichts dafür getan werden — es steckt schon in den Wänden, in der Art, wie Sie sie eingerichtet haben.',
      'Was gebraucht wird, ist, dass sie die richtige Person erreicht, und dass sich jemand um alles kümmert, was danach kommt.',
    ],
    service: [
      'Darum kümmert sich Lapa Casa Rio: verwaltet Ihre Wohnung wie eine eigene. Wählt den Gast aus, koordiniert An- und Abreise, löst auf, was während des Aufenthalts auftaucht, organisiert die Reinigung zwischen den Buchungen.',
      'Sie beantworten keine Nachricht und kümmern sich um keine Überraschung. Sie erhalten, was Ihnen zusteht, mit klaren Bedingungen, die vor Beginn vereinbart wurden — keine Überraschungen, kein Kleingedrucktes.',
      'Es ist keine Plattform oder ein Algorithmus, der Ihre Immobilie verwaltet. Es ist Lapa Casa Rio, das für jeden Gast einsteht, der Ihre Wohnung betritt.',
    ],
    cta: 'Wann immer Sie möchten, sprechen wir über Ihre Wohnung.',
    ctaLabel: 'Mehr erfahren',
    whatsappMessage: 'Hallo! Ich habe eine Wohnung in Rio de Janeiro und möchte mehr über Ihre Verwaltung von Ferienwohnungen erfahren.',
  },
  it: {
    intro: 'Il tuo appartamento a Rio, gestito come se fosse di Lapa Casa Rio.',
    body: [
      'Rio non si spiega su un poster turistico. Si spiega nel quartiere, nel bar all\'angolo, nella vista che esiste solo da quella finestra a quell\'ora del pomeriggio. È quello che il tuo appartamento ha da offrire — non un\'altra camera, ma un pezzo vero della città.',
      'Un tassista racconta una versione di Rio; chi ci abita ne racconta un\'altra — quella che la maggior parte dei viaggiatori cerca senza sapere cosa sta cercando. Il tuo appartamento può già essere quella versione per qualcuno. Non c\'è nulla da fare per arrivarci — è già nelle pareti, nel modo in cui l\'hai arredato.',
      'Quello che serve è che raggiunga la persona giusta, e che qualcuno si occupi di tutto quello che viene dopo.',
    ],
    service: [
      'Di questo si occupa Lapa Casa Rio: gestisce il tuo appartamento come se fosse il suo. Sceglie l\'ospite, coordina arrivo e partenza, risolve quello che si presenta durante il soggiorno, organizza le pulizie tra una prenotazione e l\'altra.',
      'Tu non rispondi a nessun messaggio né gestisci nessun imprevisto. Ricevi quello che ti spetta, con condizioni chiare concordate prima di iniziare — senza sorprese, senza piccole note.',
      'Non è una piattaforma né un algoritmo a gestire la tua proprietà. È Lapa Casa Rio a rispondere per ogni ospite che entra nel tuo appartamento.',
    ],
    cta: 'Quando vuoi, parliamo del tuo appartamento.',
    ctaLabel: 'Voglio saperne di più',
    whatsappMessage: 'Ciao! Ho un appartamento a Rio de Janeiro e vorrei saperne di più sulla gestione dell\'affitto breve.',
  },
};

export function PartnerContractPage({ locale }: Props) {
  const narrative = PARTNER_NARRATIVE[locale] ?? PARTNER_NARRATIVE.pt!;
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5521977157530';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.25rem 4rem', fontFamily: 'Georgia, serif' }}>
      <div style={{
        padding: '2.5rem 2rem 2.5rem',
        background: 'linear-gradient(160deg, #0f1c2e 0%, #1a2f4a 60%, #0e2236 100%)',
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Decoración de fondo */}
        <div aria-hidden style={{
          position: 'absolute', top: 0, right: 0, width: 320, height: 320,
          background: 'radial-gradient(circle at top right, rgba(44,95,138,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '.45rem',
          fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.12em', color: '#7fb3d3', marginBottom: '1.25rem',
        }}>
          <MapPin size={11} />
          Lapa Casa Río · Rio de Janeiro
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
          fontWeight: 400,
          lineHeight: 1.3,
          color: '#f0f6ff',
          margin: '0 0 1.75rem',
          maxWidth: 600,
        }}>
          {narrative.intro}
        </h1>

        {/* Párrafos narrativos */}
        <div style={{ maxWidth: 640, marginBottom: '1.75rem' }}>
          {narrative.body.map((paragraph, i) => (
            <p key={i} style={{
              fontSize: 'clamp(.88rem, 2vw, .95rem)',
              lineHeight: 1.8,
              color: '#b8cfe0',
              margin: '0 0 1rem',
            }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Divisor */}
        <div style={{
          width: 48, height: 1,
          background: 'linear-gradient(to right, #2c5f8a, transparent)',
          marginBottom: '1.5rem',
        }} />

        {/* Servicio */}
        <div style={{ maxWidth: 640, marginBottom: '2rem' }}>
          {narrative.service.map((paragraph, i) => (
            <p key={i} style={{
              fontSize: 'clamp(.85rem, 2vw, .92rem)',
              lineHeight: 1.8,
              color: '#e8f0f8',
              margin: '0 0 .85rem',
            }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <p style={{
            margin: 0,
            fontSize: '.9rem',
            fontStyle: 'italic',
            color: '#7fb3d3',
            fontFamily: 'Georgia, serif',
          }}>
            {narrative.cta}
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(narrative.whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '.65rem 1.35rem',
              background: '#2c5f8a',
              color: '#fff',
              borderRadius: 9,
              fontSize: '.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {narrative.ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
