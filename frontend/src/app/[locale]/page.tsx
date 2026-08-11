// lapa-casa-hostel/frontend/src/app/[locale]/page.tsx
// channelhostel — muestra solo el motor de reservas del hostel (camas, cuartos, CPF, etc.)
// Los archivos del motor de apartamentos (apartment-engine, apartment-card, apartment-store,
// property-tabs) permanecen en la rama; simplemente no se importan en esta página.
// Para ver ambos motores juntos → ver rama channel1008 o channelbackend.

import { setRequestLocale } from 'next-intl/server';
import { BookingEngine } from '@/components/booking/booking-engine';
import { LandingSection } from '@/components/landing/landing-section';
import { locales, defaultLocale, type Locale } from '@/i18n';

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale)
    ? params.locale
    : defaultLocale) as Locale;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-background">
      <LandingSection locale={locale} />
      <section id="reservar" className="scroll-mt-4">
        <BookingEngine locale={locale} />
      </section>
    </main>
  );
}
