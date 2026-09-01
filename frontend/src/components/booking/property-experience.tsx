// lapa-casa-hostel/frontend/src/components/booking/property-experience.tsx

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PropertySelectorHero } from './property-selector-hero';
import type { Locale } from '@/i18n';

interface PropertyExperienceProps {
  locale: Locale;
  /** Precio/horario del guarda-equipaje -- editable desde /admin/pricing.html. */
  luggageStorage?: { price: number; startTime: string; endTime: string };
}

/**
 * PropertyExperience
 *
 * Home: hero selector (Hostel/Apartamentos).
 * Hostel → /hostel (BookingEngine), Apartamentos → /apartamentos (ApartmentEngine).
 */
export const PropertyExperience: React.FC<PropertyExperienceProps> = ({ locale, luggageStorage }) => {
  const router = useRouter();

  const handleSelectHostel = () => {
    router.push(`/${locale}/hostel`);
  };

  const handleSelectApartments = () => {
    router.push(`/${locale}/apartamentos`);
  };

  return (
    <PropertySelectorHero
      onSelectHostel={handleSelectHostel}
      onSelectApartments={handleSelectApartments}
      luggageStorage={luggageStorage}
    />
  );
};
