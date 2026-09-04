// lapa-casa-hostel/backend/src/routes/bookings/create-booking.ts
// ventana4: envío de email de confirmación reenganchado a notificationService (ver notify('booking_confirmation', ...) más abajo)

import type { Request, Response, NextFunction } from 'express';
import { BookingService, InsufficientAvailabilityError } from '../../services/booking-service';
import { AvailabilityService } from '../../services/availability-service';
import { PricingService } from '../../services/pricing-service';
import { notificationService } from '../../services/notification-service';
import { whatsappNotificationService } from '../../services/whatsapp-notification-service';
import { emailService, type BookingWithGuest } from '../../services/email-service';
import { query } from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/responses';
import { generateReferralCode } from '../../utils/encryption';
import { GuestRepository } from '../../database/repositories/guest-repository';
import { uploadDocumentPhoto } from '../../lib/cloudinary/cloudinary-client';
import { decodeBase64Image } from '../../utils/decode-base64-image';

const guestRepo = new GuestRepository();

const bookingService = new BookingService();
const availabilityService = new AvailabilityService();
const pricingService = new PricingService();

interface CreateBookingRequest {
  checkIn: string;
  checkOut: string;
  rooms: Array<{
    roomId: string;
    bedsCount: number;
    /** Camas puntuales elegidas a mano en el selector -- opcional, ver bookingService.createBooking(). */
    preferredBedIds?: string[];
  }>;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    document?: string;
    /** Foto del DNI/pasaporte (data URL base64) -- obligatoria en el motor del hostel. */
    documentPhotoBase64?: string;
  };
  /**
   * Acompañantes declarados por el titular en el checkout (tabla booking_guests).
   * Cada CPF es verificado contra guests.blocked antes de crear la reserva.
   * El huésped bloqueado recibe un error genérico sin revelar el motivo.
   */
  additionalGuests?: Array<{
    fullName: string;
    document: string;
    documentType?: string; // 'CPF' | 'RG' | 'passaporte' — default 'CPF'
  }>;
  specialRequests?: string;
  arrivalTime?: string;
  language?: 'pt' | 'en' | 'es';
  source?: string;
  guestGender?: 'mixed' | 'female' | 'male';
  /** Código de oferta/cupón de descuento para apartamentos (opcional). */
  offerCode?: string;
}

// ── Helpers de blocklist ──────────────────────────────────────────────────────

/** Normaliza un CPF quitando puntos y guión → '00000000000' */
function normalizeCPF(doc: string): string {
  return doc.replace(/\D/g, '');
}

/** Verifica si alguno de los documentos está en la lista negra (guests.blocked = true).
 *  Solo verifica CPFs de 11 dígitos — pasaportes y documentos con letras se saltan.
 *  Devuelve true si alguno está bloqueado (no revela cuál para no ayudar a la evasión). */
async function anyDocumentBlocked(documents: string[]): Promise<boolean> {
  const cpfs = documents.map(normalizeCPF).filter((d) => /^\d{11}$/.test(d)); // solo CPFs puros, no pasaportes
  if (cpfs.length === 0) {
    return false;
  }
  // Un solo query paramétrico para todos los CPFs
  const placeholders = cpfs.map((_, i) => `$${i + 1}`).join(', ');
  const result = await query<{ id: string }>(
    `SELECT g.id FROM guests g
     WHERE g.blocked = true
       AND g.document_number = ANY(ARRAY[${placeholders}])
     LIMIT 1`,
    cpfs,
  );
  return (result.rowCount ?? 0) > 0;
}

/** Inserta todos los hóspedes declarados en booking_guests.
 *  El titular va con is_titular = true; los acompañantes con false.
 *  Fire-and-forget seguro: si falla, la reserva ya quedó guardada. */
async function insertBookingGuests(
  reservationId: string,
  titular: { fullName: string; document: string; documentType: string },
  additional: Array<{ fullName: string; document: string; documentType?: string }>,
): Promise<void> {
  const guests = [
    { ...titular, isTitular: true },
    ...additional.map((g) => ({ ...g, documentType: g.documentType ?? 'CPF', isTitular: false })),
  ];
  // INSERT en batch usando unnest para evitar N queries individuales
  const names = guests.map((g) => g.fullName);
  const docs = guests.map((g) => g.document.replace(/\D/g, '') || g.document); // normaliza CPF
  const types = guests.map((g) => g.documentType);
  const titular_flags = guests.map((g) => g.isTitular);
  await query(
    `INSERT INTO booking_guests (reservation_id, full_name, document_number, document_type, is_titular)
     SELECT $1, name, doc, dtype, is_tit
     FROM unnest($2::text[], $3::text[], $4::text[], $5::bool[])
            AS t(name, doc, dtype, is_tit)`,
    [reservationId, names, docs, types, titular_flags],
  );
}

export const createBookingHandler = async (
  req: Request<{}, {}, CreateBookingRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const bookingData = req.body;

    logger.info('Creating booking', {
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      totalBeds: bookingData.rooms.reduce((sum, r) => sum + r.bedsCount, 0),
    });

    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);
    const now = new Date();

    // Ni fechas pasadas ni el mismo día (decisión explícita del dueño): un
    // simple "checkIn < now" no alcanza para excluir HOY -- con now() a
    // media mañana, una fecha de check-in de hoy sigue siendo "en el
    // futuro" en términos de reloj puro. Se compara la fecha de calendario
    // en America/Sao_Paulo (zona horaria operativa unica del sistema, ver
    // 0004_pricing_functions.sql) contra la de check-in; esto ya cubre
    // tambien cualquier fecha pasada, no solo hoy.
    const todayInSaoPaulo = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
    }).format(now);
    if (bookingData.checkIn <= todayInSaoPaulo) {
      res
        .status(400)
        .json(
          ApiResponse.error(
            'No se aceptan reservas para el mismo día -- elegí una fecha a partir de mañana',
          ),
        );
      return;
    }

    if (checkOut <= checkIn) {
      res.status(400).json(ApiResponse.error('Check-out date must be after check-in date'));
      return;
    }

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const totalBedsRequested = bookingData.rooms.reduce((sum, r) => sum + r.bedsCount, 0);

    // ── Verificación de lista negra (blocklist) ───────────────────────────────
    // Se chequean todos los CPFs: el titular + los acompañantes declarados.
    // Si cualquiera está bloqueado → 409 genérico (sin revelar el motivo ni
    // quién está bloqueado, para evitar que el huésped evada con otro email).
    const allDocuments = [
      bookingData.guest.document,
      ...(bookingData.additionalGuests ?? []).map((g) => g.document),
    ].filter(Boolean) as string[];

    const hasBlocked = await anyDocumentBlocked(allDocuments);
    if (hasBlocked) {
      logger.warn('Booking blocked: CPF en lista negra', {
        // No logueamos qué CPF para respetar la privacidad en los logs públicos
        reservationEmail: bookingData.guest.email,
      });
      res
        .status(409)
        .json(ApiResponse.error('No hay disponibilidad para las fechas seleccionadas'));
      return;
    }

    // Check overall availability
    const availability = await availabilityService.checkAvailability({
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      bedsNeeded: totalBedsRequested,
    });

    if (!availability.available) {
      logger.warn('Insufficient availability', {
        requested: totalBedsRequested,
        available: availability.availableBeds,
      });
      res.status(409).json(
        ApiResponse.error('Insufficient availability for requested dates', {
          availableBeds: availability.availableBeds,
          requestedBeds: totalBedsRequested,
          alternativeDates: availability.alternativeDates,
        }),
      );
      return;
    }

    // Calculate pricing
    const pricingDetails = await pricingService.calculateTotalPrice({
      checkInDate: bookingData.checkIn,
      checkOutDate: bookingData.checkOut,
      rooms: bookingData.rooms,
      totalBeds: totalBedsRequested,
    });

    // ── Cupón de oferta (apartamentos y referidos) ────────────────────────────
    // Si viene offerCode, validamos contra apartment_offers y aplicamos el
    // descuento al precio final ANTES de crear la reserva. Los códigos de
    // referido (idea #49, roadmap.html) son filas de esta misma tabla con
    // referral_owner_guest_id seteado -- ver 0032_referral_codes.sql.
    let appliedOffer: {
      id: string;
      code: string;
      label: string;
      discount_percent: number;
      referral_owner_guest_id: string | null;
    } | null = null;
    if (bookingData.offerCode) {
      const today = bookingData.checkIn; // fecha de check-in como referencia de validez
      const { rows: offerRows } = await query(
        `SELECT id, code, label, discount_percent, apartment_ids, referral_owner_guest_id
         FROM apartment_offers
         WHERE code = $1
           AND is_active = true
           AND (valid_from IS NULL OR valid_from <= $2::date)
           AND (valid_to   IS NULL OR valid_to   >= $2::date)
         LIMIT 1`,
        [bookingData.offerCode.trim().toUpperCase(), today],
      );
      if (offerRows.length > 0) {
        const offer = offerRows[0];
        // Verificar si aplica al apartamento solicitado (null/vacío = todos)
        const aptId = bookingData.rooms[0]?.roomId;
        const aptOk =
          !offer.apartment_ids ||
          offer.apartment_ids.length === 0 ||
          (aptId && offer.apartment_ids.includes(aptId));
        // Un código de referido no aplica sobre la reserva del propio dueño
        // del código (mismo email) -- si no, cualquiera se autorregala 10%.
        let selfReferral = false;
        if (aptOk && offer.referral_owner_guest_id) {
          const { rows: ownerRows } = await query<{ email: string }>(
            `SELECT email FROM guests WHERE id = $1`,
            [offer.referral_owner_guest_id],
          );
          selfReferral =
            ownerRows[0]?.email?.toLowerCase() === bookingData.guest.email.trim().toLowerCase();
          if (selfReferral) {
            logger.warn('Código de referido rechazado -- autorreferido', { offerCode: offer.code });
          }
        }
        if (aptOk && !selfReferral) {
          appliedOffer = offer;
          const discountFactor = 1 - offer.discount_percent / 100;
          pricingDetails.totalPrice =
            Math.round(pricingDetails.totalPrice * discountFactor * 100) / 100;
          pricingDetails.depositAmount =
            Math.round(pricingDetails.depositAmount * discountFactor * 100) / 100;
          pricingDetails.remainingAmount =
            Math.round(pricingDetails.remainingAmount * discountFactor * 100) / 100;
          logger.info('Oferta aplicada a reserva', {
            offerCode: offer.code,
            discount: offer.discount_percent,
          });
        }
      }
    }

    // Check per-room availability
    for (const room of bookingData.rooms) {
      const roomAvail = await availabilityService.checkRoomAvailability(
        room.roomId,
        bookingData.checkIn,
        bookingData.checkOut,
      );

      if (roomAvail.availableBeds < room.bedsCount) {
        res.status(409).json(
          ApiResponse.error(`Insufficient beds in room ${room.roomId}`, {
            roomId: room.roomId,
            requested: room.bedsCount,
            available: roomAvail.availableBeds,
          }),
        );
        return;
      }
    }

    // Merge first/last name for DB
    const fullName = `${bookingData.guest.firstName} ${bookingData.guest.lastName}`.trim();

    // Create booking
    const booking = await bookingService.createBooking({
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      rooms: bookingData.rooms,
      guest: {
        full_name: fullName,
        email: bookingData.guest.email,
        phone: bookingData.guest.phone,
        country: bookingData.guest.country,
        document: bookingData.guest.document,
      },
      nights,
      totalBeds: totalBedsRequested,
      pricing: pricingDetails,
      specialRequests:
        [
          bookingData.arrivalTime
            ? `Horario de llegada: ${bookingData.arrivalTime.replace('-', ':00 – ')}:00`
            : null,
          bookingData.specialRequests || null,
        ]
          .filter(Boolean)
          .join('\n') || undefined,
      source: bookingData.source || 'website',
      language: bookingData.language || 'pt',
      status: 'pending_payment',
      guestGender: bookingData.guestGender || 'mixed',
    });

    logger.info('Booking created successfully', {
      bookingId: booking.id,
      totalPrice: pricingDetails.totalPrice,
    });

    // ── Programa de referidos (idea #49, roadmap.html) ────────────────────────
    // Cada reserva nueva recibe su propio código de referido (10% para quien
    // lo use, ver 0032_referral_codes.sql) -- se muestra en la pantalla de
    // éxito para que el huésped lo comparta. Si esta reserva a su vez redimió
    // un código, quien lo compartió recibe un email con un premio propio.
    // Todo fire-and-forget: un fallo acá nunca debe tumbar la reserva ya creada.
    let ownReferralCode: string | null = null;
    try {
      ownReferralCode = generateReferralCode();
      const validTo = new Date();
      validTo.setFullYear(validTo.getFullYear() + 1);
      await query(
        `INSERT INTO apartment_offers
           (code, label, discount_percent, apartment_ids, valid_from, valid_to, is_active, referral_owner_guest_id)
         VALUES ($1, 'Código de referido', 10, NULL, now()::date, $2::date, true, $3)`,
        [ownReferralCode, validTo.toISOString().slice(0, 10), booking.guest_id],
      );
    } catch (error) {
      logger.error('No se pudo generar el código de referido', {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : String(error),
      });
      ownReferralCode = null;
    }

    if (appliedOffer?.referral_owner_guest_id) {
      (async () => {
        try {
          const { rows: referrerRows } = await query<{
            full_name: string;
            email: string;
            language: string | null;
          }>(`SELECT full_name, email, language FROM guests WHERE id = $1`, [
            appliedOffer!.referral_owner_guest_id,
          ]);
          const referrer = referrerRows[0];
          if (!referrer) {
            return;
          }

          const rewardCode = generateReferralCode();
          const rewardValidTo = new Date();
          rewardValidTo.setDate(rewardValidTo.getDate() + 90);
          await query(
            `INSERT INTO apartment_offers
               (code, label, discount_percent, apartment_ids, valid_from, valid_to, is_active, referral_owner_guest_id)
             VALUES ($1, 'Premio por referido', 10, NULL, now()::date, $2::date, true, $3)`,
            [
              rewardCode,
              rewardValidTo.toISOString().slice(0, 10),
              appliedOffer!.referral_owner_guest_id,
            ],
          );

          await emailService.sendReferralReward(
            { fullName: referrer.full_name, email: referrer.email, language: referrer.language },
            rewardCode,
          );
          logger.info('Premio de referido enviado', {
            referrerGuestId: appliedOffer!.referral_owner_guest_id,
            rewardCode,
          });
        } catch (error) {
          logger.error('No se pudo enviar el premio de referido', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }

    // ── Foto del documento (obligatoria en el motor del hostel) ──────────────
    // Opcional a nivel de este endpoint compartido -- el motor de apartamentos
    // reusa la misma ruta y todavía no pide esta foto. El motor del hostel la
    // exige del lado del cliente antes de llegar acá.
    if (bookingData.guest.documentPhotoBase64) {
      try {
        const photoBuffer = decodeBase64Image(bookingData.guest.documentPhotoBase64);
        const photo = await uploadDocumentPhoto(photoBuffer);
        await guestRepo.setDocumentPhoto(booking.guest_id, photo);
      } catch (err) {
        logger.error('No se pudo guardar la foto del documento', {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ── Registro de hóspedes declarados (booking_guests) ─────────────────────
    // Fire-and-forget: si falla, la reserva ya quedó guardada correctamente.
    // El admin puede completar el registro en el check-in físico.
    insertBookingGuests(
      booking.id,
      {
        fullName,
        document: bookingData.guest.document ?? '',
        documentType: /[a-zA-Z]/.test(bookingData.guest.document ?? '') ? 'passaporte' : 'CPF',
      },
      bookingData.additionalGuests ?? [],
    ).catch((err) => {
      logger.error('No se pudo insertar booking_guests', {
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    // Envio de confirmacion, no bloqueante -- se resuelve con los datos ya
    // insertados (guest joined via bookingService.getBooking), no con el
    // payload crudo del request.
    bookingService
      .getBooking(booking.id)
      .then((bookingWithGuest) => {
        if (!bookingWithGuest?.guest) {
          logger.error('No se pudo cargar guest para email de confirmación', {
            bookingId: booking.id,
          });
          return;
        }
        const guest = bookingWithGuest as BookingWithGuest;
        // WhatsApp queda deshabilitado hasta que haya credenciales reales de
        // Meta (WHATSAPP_ENABLED=false por defecto, ver whatsapp-notification-service.ts)
        // -- sendBookingNotification() no-opea sola en ese caso, así que es
        // seguro llamarla siempre sin chequear el flag acá.
        if (guest.guest.phone) {
          whatsappNotificationService
            .sendBookingNotification({
              phone: guest.guest.phone,
              bookingId: guest.reservation_number,
              checkIn: String(guest.check_in_date),
              language: (['pt', 'en', 'es'] as string[]).includes(guest.guest.language ?? '')
                ? (guest.guest.language as 'pt' | 'en' | 'es')
                : 'en',
            })
            .catch((error) => {
              logger.error('Failed to send booking confirmation WhatsApp', {
                bookingId: booking.id,
                error: error.message,
              });
            });
        }
        return notificationService.notify('booking_confirmation', guest);
      })
      .catch((error) => {
        logger.error('Failed to send booking confirmation email', {
          bookingId: booking.id,
          error: error.message,
        });
      });

    res.status(201).json(
      ApiResponse.success(
        {
          booking: {
            id: booking.id,
            confirmationNumber: booking.reservation_number,
            status: booking.status,
            checkIn: bookingData.checkIn,
            checkOut: bookingData.checkOut,
            nights,
            rooms: bookingData.rooms,
            guest: {
              name: fullName,
              email: bookingData.guest.email,
            },
            // Programa de referidos (idea #49, roadmap.html) -- null solo si
            // falló la generación, no bloquea el resto de la respuesta.
            referralCode: ownReferralCode,
            pricing: {
              subtotal: pricingDetails.basePrice,
              groupDiscount: pricingDetails.discountAmount,
              seasonalAdjustment:
                pricingDetails.priceAfterSeason - pricingDetails.priceAfterDiscount,
              total: pricingDetails.totalPrice,
              deposit: pricingDetails.depositAmount,
              remaining: pricingDetails.remainingAmount,
              currency: 'BRL',
              ...(appliedOffer
                ? {
                    appliedOffer: {
                      code: appliedOffer.code,
                      label: appliedOffer.label,
                      discount_percent: appliedOffer.discount_percent,
                    },
                  }
                : {}),
            },
            payment: {
              depositRequired: true,
              depositAmount: pricingDetails.depositAmount,
              // Antes hardcodeado a +24h, sin relación con el hold real de la
              // reserva -- ahora usa el mismo pending_expires_at que ya vino
              // en el INSERT (booking-service.ts), la única fuente de verdad.
              depositDueDate: booking.pending_expires_at,
              remainingAmount: pricingDetails.remainingAmount,
              remainingDueDate: new Date(checkIn.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
            // Expiración real del hold (5 min) para que el frontend arme el
            // contador regresivo con el dato correcto, no un valor inventado.
            pendingExpiresAt: booking.pending_expires_at,
          },
        },
        'Booking created successfully',
      ),
    );
  } catch (error) {
    // El pre-chequeo de arriba puede pasar y aun asi bookingService.createBooking()
    // lanzar esto -- otra transaccion tomo las camas entre el pre-chequeo y el
    // INSERT bajo lock. Sin este catch especifico caia al error-handler generico
    // y devolvia 500 en vez de 409 (InsufficientAvailabilityError no tiene
    // `statusCode`, asi que error-handler.ts la trataba como error inesperado).
    if (error instanceof InsufficientAvailabilityError) {
      logger.warn('Insufficient availability detected during createBooking', {
        details: error.details,
      });
      res.status(409).json(ApiResponse.error(error.message, error.details));
      return;
    }

    logger.error('Error creating booking', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  }
};
