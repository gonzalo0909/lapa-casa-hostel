'use client';

// lapa-casa-hostel/frontend/src/app/owner/contract/page.tsx
//
// Visualização do Termo de Adesão aceito pelo administrador.
// Mostra a data/hora do aceite e permite ler o contrato em PT-BR, ES ou FR.
// Página só acessível após o aceite (useOwnerAuth redireciona se termAcceptedAt===null).

import { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useOwnerAuth } from '@/lib/use-owner-auth';
import { OwnerNav } from '@/components/owner/owner-nav';
import { CURRENT_TERM_VERSION } from '@/lib/owner-api';

type Lang = 'pt' | 'es' | 'fr';

const LANG_LABELS: Record<Lang, string> = {
  pt: 'Português (BR)',
  es: 'Español',
  fr: 'Français',
};

export default function OwnerContractPage() {
  const { profile, loading } = useOwnerAuth();
  const [lang, setLang] = useState<Lang>('pt');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  if (!profile) {return null;}

  const acceptedAt = profile.termAcceptedAt
    ? new Date(profile.termAcceptedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <OwnerNav fullName={profile.fullName} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Termo de Adesão</h1>
        {acceptedAt && (
          <p className="mt-1 text-sm text-green-700 font-medium">
            ✓ Aceito em {acceptedAt} · Versão {profile.termVersion ?? CURRENT_TERM_VERSION}
          </p>
        )}
      </div>

      {/* Seletor de idioma */}
      <div className="mb-4 flex gap-2">
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              lang === l
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>

      {/* Texto do contrato */}
      <div className="rounded-lg border border-border bg-card p-6 text-sm leading-relaxed text-neutral-800 overflow-y-auto max-h-[70vh]">
        {lang === 'pt' && <ContractPT version={CURRENT_TERM_VERSION} />}
        {lang === 'es' && <ContractES version={CURRENT_TERM_VERSION} />}
        {lang === 'fr' && <ContractFR version={CURRENT_TERM_VERSION} />}
      </div>
    </div>
  );
}

// ─── Versão PT-BR ─────────────────────────────────────────────────────────────

function ContractPT({ version }: { version: string }) {
  return (
    <article className="prose prose-sm max-w-none prose-neutral">
      <h2 className="text-center text-base font-semibold">
        TERMO DE ADESÃO — ADMINISTRADOR DE APARTAMENTO<br />
        Lapa Casa Rio · Versão {version}
      </h2>
      <Section title="1. PARTES E NATUREZA">
        <p>A Plataforma <strong>Lapa Casa Rio</strong> atua como marketplace de hospedagem, aproximando hóspedes e administradores por meio de processadores de pagamento licenciados pelo Banco Central do Brasil (Stripe / Mercado Pago). O Administrador é o proprietário ou gestor do imóvel cadastrado.</p>
      </Section>
      <Section title="2. MODELO DE PAGAMENTO">
        <p><strong>30% sinal</strong> pago pelo hóspede à Plataforma no ato da reserva (arras confirmatórias). <strong>70% saldo</strong> pago diretamente ao Administrador no check-in. Sobretaxa de <strong>10%</strong> sobre o sinal para pagamentos com cartão.</p>
      </Section>
      <Section title="3. COMISSÃO E TAXAS">
        <p><strong>5%</strong> comissão da Plataforma + <strong>1,39%</strong> taxa operacional (0,99% gateway + 0,40% proteção contra estornos) = <strong>6,39% total</strong>, descontado do sinal de 30%.</p>
      </Section>
      <Section title="4. CANCELAMENTOS">
        <p>Cancelamento pelo Administrador sem força maior implica multa equivalente à comissão devida. No-show do hóspede: sinal retido pelo Administrador.</p>
      </Section>
      <Section title="5. NÃO CIRCUNVENÇÃO">
        <p>Vedada a reserva direta de hóspedes captados pela Plataforma por <strong>12 meses</strong>. Penalidade: <strong>3× a comissão</strong> que seria devida.</p>
      </Section>
      <Section title="6. FORÇA MAIOR">
        <p>Isenção de multa exige: (a) documento oficial, (b) aviso em até 7 dias, (c) sem novas reservas nos 30 dias anteriores ao evento com ciência do risco.</p>
      </Section>
      <Section title="7. PROGRAMA DE RECONHECIMENTO">
        <p><strong>Verificado</strong> — docs completos. <strong>Destaque</strong> — 10+ reservas. <strong>Elite</strong> — 30+ reservas, 0 cancelamentos em 12 meses → repasse em 1 dia útil + crédito de R$ 100 por indicação.</p>
      </Section>
      <Section title="8. LGPD">
        <p>Dados tratados para gestão contratual e pagamentos. Compartilhados com Stripe/Mercado Pago e autoridades fiscais quando exigido por lei.</p>
      </Section>
      <Section title="9. FORO">
        <p>Comarca do Rio de Janeiro/RJ. Legislação brasileira (CC, CDC, LGPD, Marco Civil).</p>
      </Section>
    </article>
  );
}

// ─── Versão ES ────────────────────────────────────────────────────────────────

function ContractES({ version }: { version: string }) {
  return (
    <article className="prose prose-sm max-w-none prose-neutral">
      <h2 className="text-center text-base font-semibold">
        TÉRMINO DE ADHESIÓN — ADMINISTRADOR DE APARTAMENTO<br />
        Lapa Casa Rio · Versión {version}
      </h2>
      <Section title="1. PARTES Y NATURALEZA">
        <p>La Plataforma <strong>Lapa Casa Rio</strong> actúa como marketplace de hospedaje, conectando huéspedes y administradores a través de procesadores de pago autorizados por el Banco Central de Brasil (Stripe / Mercado Pago). El Administrador es el propietario o gestor del inmueble registrado.</p>
      </Section>
      <Section title="2. MODELO DE PAGO">
        <p><strong>30% señal</strong> pagada por el huésped a la Plataforma al momento de la reserva (arras confirmatorias). <strong>70% saldo</strong> pagado directamente al Administrador en el check-in. Recargo de <strong>10%</strong> sobre la señal para pagos con tarjeta.</p>
      </Section>
      <Section title="3. COMISIÓN Y TASAS">
        <p><strong>5%</strong> comisión de la Plataforma + <strong>1,39%</strong> tasa operativa (0,99% pasarela + 0,40% protección contra contracargos) = <strong>6,39% total</strong>, descontado de la señal del 30%.</p>
      </Section>
      <Section title="4. CANCELACIONES">
        <p>Cancelación por el Administrador sin fuerza mayor implica multa equivalente a la comisión debida. No-show del huésped: señal retenida por el Administrador.</p>
      </Section>
      <Section title="5. NO CIRCUNVENCIÓN">
        <p>Prohibida la reserva directa de huéspedes captados por la Plataforma durante <strong>12 meses</strong>. Penalidad: <strong>3× la comisión</strong> que hubiera correspondido.</p>
      </Section>
      <Section title="6. FUERZA MAYOR">
        <p>Exención de multa requiere: (a) documento oficial, (b) aviso en hasta 7 días, (c) sin nuevas reservas en los 30 días anteriores al evento con conocimiento del riesgo.</p>
      </Section>
      <Section title="7. PROGRAMA DE RECONOCIMIENTO">
        <p><strong>Verificado</strong> — docs completos. <strong>Destacado</strong> — 10+ reservas. <strong>Élite</strong> — 30+ reservas, 0 cancelaciones en 12 meses → transferencia en 1 día hábil + crédito de R$ 100 por referido.</p>
      </Section>
      <Section title="8. PROTECCIÓN DE DATOS">
        <p>Datos tratados para gestión contractual y pagos. Compartidos con Stripe/Mercado Pago y autoridades fiscales cuando la ley lo requiera.</p>
      </Section>
      <Section title="9. FORO">
        <p>Comarca de Río de Janeiro/RJ. Legislación brasileña aplicable.</p>
      </Section>
    </article>
  );
}

// ─── Versão FR ────────────────────────────────────────────────────────────────

function ContractFR({ version }: { version: string }) {
  return (
    <article className="prose prose-sm max-w-none prose-neutral">
      <h2 className="text-center text-base font-semibold">
        CONDITIONS D&apos;ADHÉSION — GESTIONNAIRE D&apos;APPARTEMENT<br />
        Lapa Casa Rio · Version {version}
      </h2>
      <Section title="1. PARTIES ET NATURE">
        <p>La Plateforme <strong>Lapa Casa Rio</strong> agit en tant que marketplace d&apos;hébergement, mettant en relation hôtes et gestionnaires via des processeurs de paiement agréés par la Banque Centrale du Brésil (Stripe / Mercado Pago). Le Gestionnaire est le propriétaire ou le gestionnaire du bien enregistré.</p>
      </Section>
      <Section title="2. MODÈLE DE PAIEMENT">
        <p><strong>30% d&apos;acompte</strong> payé par l&apos;hôte à la Plateforme lors de la réservation (arrhes confirmatoires). <strong>70% du solde</strong> payé directement au Gestionnaire au check-in. Majoration de <strong>10%</strong> sur l&apos;acompte pour les paiements par carte.</p>
      </Section>
      <Section title="3. COMMISSION ET FRAIS">
        <p><strong>5%</strong> de commission Plateforme + <strong>1,39%</strong> de frais opérationnels (0,99% passerelle + 0,40% protection contre les contestations) = <strong>6,39% au total</strong>, déduit de l&apos;acompte de 30%.</p>
      </Section>
      <Section title="4. ANNULATIONS">
        <p>Annulation par le Gestionnaire sans force majeure entraîne une pénalité équivalente à la commission due. No-show de l&apos;hôte : acompte conservé par le Gestionnaire.</p>
      </Section>
      <Section title="5. NON-CONTOURNEMENT">
        <p>Toute réservation directe avec des hôtes captés par la Plateforme est interdite pendant <strong>12 mois</strong>. Pénalité : <strong>3× la commission</strong> qui aurait été due.</p>
      </Section>
      <Section title="6. FORCE MAJEURE">
        <p>Exonération de pénalité sous conditions : (a) document officiel, (b) notification dans les 7 jours, (c) aucune nouvelle réservation dans les 30 jours précédant l&apos;événement en connaissance du risque.</p>
      </Section>
      <Section title="7. PROGRAMME DE RECONNAISSANCE">
        <p><strong>Vérifié</strong> — documents complets. <strong>En vedette</strong> — 10+ réservations. <strong>Élite</strong> — 30+ réservations, 0 annulation en 12 mois → virement en 1 jour ouvrable + crédit de R$ 100 par parrainage.</p>
      </Section>
      <Section title="8. PROTECTION DES DONNÉES">
        <p>Données traitées à des fins contractuelles et de paiement. Partagées avec Stripe/Mercado Pago et les autorités fiscales si la loi l&apos;exige.</p>
      </Section>
      <Section title="9. JURIDICTION">
        <p>Tribunal de Rio de Janeiro/RJ. Législation brésilienne applicable.</p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{title}</h3>
      <div className="text-neutral-700">{children}</div>
    </section>
  );
}
