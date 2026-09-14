// lapa-casa-hostel/backend/src/routes/availability/apartment-availability.ts
//
// Disponibilidad de apartamentos. Cada apartamento es una unidad completa
// (1 cama en la tabla beds = la unidad entera). El precio es por noche
// sin multiplicadores por persona.

import type { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { pricingService } from '../../services/pricing-service';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/responses';

export const checkApartmentAvailabilityHandler = async (
  req: Request<{}, {}, {}, { checkIn?: string; checkOut?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      res.status(400).json(ApiResponse.error('checkIn y checkOut son requeridos (YYYY-MM-DD)'));
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      res.status(400).json(ApiResponse.error('Fechas inválidas'));
      return;
    }

    // Calcular la fecha mínima de check-in en hora de Sao Paulo.
    // El check-in abre a las 12:00 BRT, por eso:
    //   - Antes de las 12:00 BRT: hoy todavía no tiene check-in disponible
    //     → mínimo es mañana.
    //   - A partir de las 12:00 BRT: check-in abierto, hoy se acepta.
    // Se usa formatToParts para extraer la hora de forma robusta (evita parsear
    // strings localizados que pueden variar según la plataforma).
    const now = new Date();
    const todayInSaoPaulo = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const hourParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(now);
    const hourBrt = parseInt(hourParts.find((p) => p.type === 'hour')!.value, 10);

    // Mínimo válido: mañana si son antes de las 12h, hoy si ya son las 12h o más.
    let minCheckIn = todayInSaoPaulo;
    if (hourBrt < 12) {
      const [y, m, d] = todayInSaoPaulo.split('-').map(Number);
      const tomorrow = new Date(y, m - 1, d + 1);
      minCheckIn = tomorrow.getFullYear() +
        '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') +
        '-' + String(tomorrow.getDate()).padStart(2, '0');
    }

    if (checkIn < minCheckIn) {
      const msg = checkIn === todayInSaoPaulo
        ? 'Las reservas para hoy están disponibles a partir de las 12h'
        : 'La fecha de check-in no puede ser en el pasado';
      res.status(400).json(ApiResponse.error(msg));
      return;
    }

    if (checkOutDate <= checkInDate) {
      res.status(400).json(ApiResponse.error('El check-out debe ser posterior al check-in'));
      return;
    }

    const nights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Una sola query: apartamentos + disponibilidad.
    // available = true si NO existe reserva activa solapada con las fechas.
    // No se filtra por is_active ni por precio.
    const { rows: apartments } = await query<{
      id: string; code: string; name: string; capacity: number; base_price: string; available: boolean;
      neighborhood: string | null; external_rating: string | null; external_review_count: number | null; external_rating_label: string | null;
    }>(
      `SELECT
         rt.id,
         rt.code,
         rt.name,
         rt.capacity,
         rt.base_price,
         rt.neighborhood,
         rt.external_rating,
         rt.external_review_count,
         rt.external_rating_label,
         NOT EXISTS (
           SELECT 1
           FROM reservation_beds rb
           JOIN beds b ON b.id = rb.bed_id
           JOIN reservations res ON res.id = rb.reservation_id
           WHERE b.room_type_id = rt.id
             AND res.status != 'cancelled'
             AND daterange(rb.check_in, rb.check_out, '[)') && daterange($1::date, $2::date, '[)')
         ) AS available
       FROM room_types rt
       WHERE rt.property_type = 'apartment'
       ORDER BY rt.name`,
      [checkIn, checkOut]
    );

    // Fotos de todos los apartamentos en una sola query (evitar N+1)
    const { rows: allPhotos } = await query<{
      room_type_id: string; id: string; image_url: string; display_order: number; is_primary: boolean; alt_text: string | null;
    }>(
      `SELECT room_type_id, id, image_url, display_order, is_primary, alt_text
       FROM room_type_photos
       ORDER BY room_type_id, display_order ASC, created_at ASC`
    );
    const photosByApt = allPhotos.reduce<Record<string, typeof allPhotos>>((acc, p) => {
      (acc[p.room_type_id] ??= []).push(p);
      return acc;
    }, {});

    const apartmentsWithAvailability = await Promise.all(
      apartments.map(async (apt) => {
        const basePrice = parseFloat(apt.base_price) || 0;
        const available = apt.available;

        const sharedFields = {
          id: apt.id,
          code: apt.code,
          name: apt.name,
          capacity: apt.capacity,
          basePrice,
          available,
          neighborhood: apt.neighborhood ?? undefined,
          externalRating: apt.external_rating !== null ? parseFloat(apt.external_rating) : undefined,
          externalReviewCount: apt.external_review_count ?? undefined,
          externalRatingLabel: apt.external_rating_label ?? undefined,
          photos: (photosByApt[apt.id] ?? []).map(p => ({
            id: p.id, url: p.image_url, isPrimary: p.is_primary, altText: p.alt_text,
          })),
        };

        try {
          const pricing = await pricingService.calculateTotalPrice({
            checkInDate: checkIn,
            checkOutDate: checkOut,
            rooms: [{ roomId: apt.id, bedsCount: 1 }],
            totalBeds: 1,
          });
          return {
            ...sharedFields,
            priceTotal: pricing.totalPrice,
            seasonMultiplier: pricing.seasonMultiplier,
            seasonType: pricing.seasonType,
            depositAmount: pricing.depositAmount,
          };
        } catch (pricingError) {
          // Si el cálculo de precio falla (ej. Carnaval con menos noches del mínimo),
          // el apartamento sigue apareciendo — la disponibilidad no depende del precio.
          logger.warn('Apartment pricing unavailable for date range', {
            apartmentId: apt.id,
            checkIn, checkOut,
            error: pricingError instanceof Error ? pricingError.message : 'Unknown error',
          });
          return {
            ...sharedFields,
            priceTotal: basePrice * nights,
            seasonMultiplier: 1,
            seasonType: 'media' as const,
            depositAmount: basePrice * nights * 0.3,
          };
        }
      })
    );

    logger.info('Apartment availability checked', {
      checkIn, checkOut, nights,
      total: apartments.length,
      available: apartmentsWithAvailability.filter(a => a.available).length,
    });

    res.status(200).json(ApiResponse.success({
      checkIn,
      checkOut,
      nights,
      apartments: apartmentsWithAvailability,
    }, 'Disponibilidad de apartamentos consultada'));
  } catch (error) {
    logger.error('Error checking apartment availability', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
};
