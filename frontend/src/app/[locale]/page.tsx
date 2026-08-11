// lapa-casa-hostel/frontend/src/app/[locale]/page.tsx
// channelapartamentos — muestra solo el motor de reservas de apartamentos (10 unidades).
// Los archivos del motor de hostel (booking-engine, room-card, room-selector, room-details,
// gender-selector, flexible-room-notice, booking-summary, booking-store, etc.)
// permanecen en la rama; simplemente no se importan en esta página.
// Para ver ambos motores juntos → ver rama channel1008 o channelbackend.

import { setRequestLocale } from 'next-intl/server';
import { ApartmentEngine } from '@/components/booking/apartment-engine';
import { LandingSection } from '@/components/landing/landing-section';
import { PropertyManagementBanner } from '@/components/booking/property-management-banner';
import { locales, defaultLocale, type Locale } from '@/i18n';

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale)
    ? params.locale
    : defaultLocale) as Locale;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-background">
      <LandingSection locale={locale} />
      <PropertyManagementBanner locale={locale} />
      <section id="reservar" className="scroll-mt-4">
        <ApartmentEngine locale={locale} />
      </section>
    </main>
  );
}
