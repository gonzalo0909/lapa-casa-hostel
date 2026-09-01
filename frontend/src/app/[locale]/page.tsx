// lapa-casa-hostel/frontend/src/app/[locale]/page.tsx

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PropertyExperience } from '@/components/booking/property-experience';
import { PropertyManagementBanner } from '@/components/booking/property-management-banner';
import { StructuredData, SpeakableSchema, WebSiteSchema, LocalBusinessSchema } from '@/components/seo/structured-data';
import { locales, defaultLocale, type Locale } from '@/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lapacasario.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const DEFAULT_LUGGAGE_STORAGE = { price: 30, startTime: '08:00', endTime: '22:00' };

/** Precio/horario del guarda-equipaje -- editable desde /admin/pricing.html (system_config.luggage_storage). */
async function getLuggageStorage(): Promise<typeof DEFAULT_LUGGAGE_STORAGE> {
  try {
    const res = await fetch(`${API_URL}/rooms`, { next: { revalidate: 300 } });
    if (!res.ok) {return DEFAULT_LUGGAGE_STORAGE;}
    const json = await res.json();
    const ls = json?.data?.policies?.luggageStorage;
    if (!ls || typeof ls.price !== 'number' || !ls.startTime || !ls.endTime) {return DEFAULT_LUGGAGE_STORAGE;}
    return { price: ls.price, startTime: ls.startTime, endTime: ls.endTime };
  } catch {
    return DEFAULT_LUGGAGE_STORAGE;
  }
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'seo' });
  const title = t('homeTitle');
  const description = t('homeDescription');
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}`]),
      ),
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}`,
      siteName: 'Lapa Casa',
      locale,
      type: 'website',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Lapa Casa — Santa Teresa, Rio de Janeiro' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.jpg'] },
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale) ? params.locale : defaultLocale) as Locale;
  setRequestLocale(locale);
  const luggageStorage = await getLuggageStorage();

  return (
    <main className="min-h-screen bg-background">
      {/* WebSite + LocalBusiness + Speakable — AEO para motores de IA y asistentes de voz */}
      <StructuredData data={WebSiteSchema} />
      <StructuredData data={LocalBusinessSchema} />
      <StructuredData data={SpeakableSchema} />
      <PropertyManagementBanner locale={locale} />
      <PropertyExperience locale={locale} luggageStorage={luggageStorage} />
    </main>
  );
}
