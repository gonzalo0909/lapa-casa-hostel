// lapa-casa-hostel/backend/src/services/group-payment-service.ts
// Feature 2: Pago grupal con link compartible.
//
// Opción D de precios por overflow:
//   baja     → todos pagan el precio de la habitación más barata del grupo
//   media    → precio promedio ponderado entre habitaciones
//   alta     → cada cama paga el precio real de su habitación
//   carnaval → cada cama paga el precio real de su habitación
//
// Anti-overbooking: se respeta pg_advisory_xact_lock + EXCLUDE constraint,
// igual que en booking-service.ts. Las camas se bloquean en la misma
// transacción que crea la reserva (pending_group).

import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool, withTransaction, query } from '../config/database';
import { GuestRepository } from '../database/repositories/guest-repository';
import { acquireLock } from '../database/lock-middleware';
import { enqueueSheetsExport } from '../queues/sheets-export.queue';
import redisClient from '../cache/redis-client';
import { logger } from '../utils/logger';

const guestRepo = new GuestRepository();

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface GroupSessionInput {
  checkIn: string;
  checkOut: string;
  totalBeds: number;
  nights: number;
  guestGender: 'mixed' | 'female' | 'male';
  /** Datos del titular (llena el formulario al crear la sesión) */
  titular: {
    full_name: string;
    email: string;
    phone?: string;
    country?: string;
    document?: string;
    language?: string;
  };
  specialRequests?: string;
  /** URL base del frontend para armar el link compartible */
  appBaseUrl: string;
}

export interface RoomAllocation {
  roomTypeId: string;
  roomCode: string;
  basePricePerBed: number;      // precio base × noches (sin surcharge)
  amountPerBed: number;         // precio final aplicando estrategia D
  bedsCount: number;
  bedIds: string[];
}

export interface GroupSessionResult {
  sessionId: string;
  token: string;
  reservationId: string;
  reservationNumber: string;
  totalBeds: number;
  paidBeds: number;
  pricingStrategy: string;
  seasonType: string;
  amountPerBed: number;         // monto base que paga cada miembro (sin recargo tarjeta)
  roomAllocations: RoomAllocation[];
  expiresAt: string;
  waShareUrl: string;
  groupPaymentUrl: string;
}

export interface MemberPaymentInput {
  token: string;
  guest: {
    full_name: string;
    email: string;
    phone?: string;
    country?: string;
    document?: string;
    language?: string;
  };
  paymentMethod: 'card' | 'pix';
}

export interface MemberPaymentResult {
  memberId: string;
  paymentMethod: 'card' | 'pix';
  amountCharged: number;
  cardSurcharge: number;
  /** Stripe: URL de checkout. PIX: null (el QR viene en pixData) */
  checkoutUrl?: string;
  /** Solo para PIX */
  pixData?: { qrCode: string; qrCodeBase64: string; expiresAt: string };
  providerPaymentId: string;
}

// ── Helpers internos ─────────────────────────────────────────────────────────

const generateToken = (): string => crypto.randomBytes(32).toString('hex');

const generateReservationNumber = (): string =>
  `LCH-G-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/** Lee card_surcharge_percent desde system_config (igual que process-deposit.ts). */
async function getCardSurchargePercent(): Promise<number> {
  const { rows } = await query<{ value: number }>(
    `SELECT value FROM system_config WHERE key = 'card_surcharge_percent'`
  );
  return rows[0]?.value ?? 0;
}

async function getSeasonType(checkIn: string): Promise<string> {
  const { rows } = await query<{ get_season_type: string }>(
    `SELECT get_season_type($1::date) AS get_season_type`, [checkIn]
  );
  return rows[0].get_season_type;
}

/** Opción D: determina estrategia de precio según temporada. */
function resolvePricingStrategy(seasonType: string): 'min' | 'weighted_avg' | 'per_room' {
  if (seasonType === 'baja') return 'min';
  if (seasonType === 'media') return 'weighted_avg';
  return 'per_room'; // alta, carnaval
}

/**
 * Asigna beds del grupo a habitaciones en orden de prioridad:
 * rooms ordenados por capacidad DESC (cuartos grandes primero, minimiza splits).
 * Retorna la asignación por cuarto con los bed IDs ya seleccionados.
 */
async function allocateGroupBeds(
  client: PoolClient,
  checkIn: string,
  checkOut: string,
  totalBeds: number,
  gender: 'mixed' | 'female' | 'male'
): Promise<RoomAllocation[]> {
  // Traer habitaciones elegibles ordenadas: capacity DESC, flexible al final
  const { rows: rooms } = await client.query<{
    id: string; code: string; capacity: number; base_price: string; is_flexible: boolean;
  }>(
    `SELECT id, code, capacity, base_price, is_flexible
     FROM room_types
     WHERE is_active = true
       AND (
         default_gender = 'mixed'
         OR default_gender = $1::bed_gender
         OR is_flexible = true
       )
     ORDER BY is_flexible ASC, capacity DESC, code ASC`,
    [gender]
  );

  const allocations: RoomAllocation[] = [];
  let remaining = totalBeds;

  for (const room of rooms) {
    if (remaining <= 0) break;

    // Para el cuarto flexible: verificar el gender efectivo en la fecha
    if (room.is_flexible && gender !== 'female') {
      const { rows: statusRows } = await client.query<{ effective_gender: string }>(
        `SELECT effective_gender FROM availability_cache
         WHERE room_type_id = $1 AND date = $2::date LIMIT 1`,
        [room.id, checkIn]
      );
      const effectiveGender = statusRows[0]?.effective_gender ?? 'female';
      if (effectiveGender === 'female' && gender !== 'female') continue;
    }

    // Seleccionar camas disponibles en este cuarto
    const { rows: beds } = await client.query<{ bed_id: string }>(
      `SELECT bed_id FROM check_availability($1::date, $2::date, $3::bed_gender)
       WHERE room_type_id = $4::uuid
         AND is_gender_eligible = true
         AND is_available = true
       ORDER BY regexp_replace(bed_code, '[0-9]+$', ''),
                NULLIF(regexp_replace(bed_code, '^[^0-9]*', ''), '')::INT
       LIMIT $5`,
      [checkIn, checkOut, gender, room.id, remaining]
    );

    if (beds.length === 0) continue;

    const bedIds = beds.map((b) => b.bed_id);
    const basePricePerBed = parseFloat(room.base_price);

    allocations.push({
      roomTypeId: room.id,
      roomCode: room.code,
      basePricePerBed,
      amountPerBed: 0,              // se calcula después con la estrategia D
      bedsCount: bedIds.length,
      bedIds,
    });

    remaining -= bedIds.length;
  }

  if (remaining > 0) {
    throw new Error(
      `No hay suficientes camas disponibles. Faltan ${remaining} de ${totalBeds} solicitadas.`
    );
  }

  return allocations;
}

/**
 * Aplica la estrategia D al amountPerBed de cada asignación.
 * nights: cantidad de noches de la reserva.
 */
function applyPricingStrategy(
  allocations: RoomAllocation[],
  strategy: 'min' | 'weighted_avg' | 'per_room',
  nights: number,
  seasonMultiplier: number
): { allocations: RoomAllocation[]; defaultAmountPerBed: number } {
  const pricePerBed = (a: RoomAllocation) =>
    parseFloat((a.basePricePerBed * nights * seasonMultiplier).toFixed(2));

  if (strategy === 'min') {
    const minPrice = Math.min(...allocations.map(pricePerBed));
    const updated = allocations.map((a) => ({ ...a, amountPerBed: minPrice }));
    return { allocations: updated, defaultAmountPerBed: minPrice };
  }

  if (strategy === 'weighted_avg') {
    const totalBeds = allocations.reduce((s, a) => s + a.bedsCount, 0);
    const weightedSum = allocations.reduce((s, a) => s + pricePerBed(a) * a.bedsCount, 0);
    const avg = parseFloat((weightedSum / totalBeds).toFixed(2));
    const updated = allocations.map((a) => ({ ...a, amountPerBed: avg }));
    return { allocations: updated, defaultAmountPerBed: avg };
  }

  // per_room: cada cama paga el precio real de su cuarto
  const updated = allocations.map((a) => ({ ...a, amountPerBed: pricePerBed(a) }));
  const defaultAmt = pricePerBed(allocations[0]);
  return { allocations: updated, defaultAmountPerBed: defaultAmt };
}

// ── Clase principal ───────────────────────────────────────────────────────────

export class GroupPaymentService {

  /**
   * Crea la sesión de pago grupal:
   * 1. Asigna camas (overflow automático entre cuartos)
   * 2. Determina precio por cama según temporada (Opción D)
   * 3. Crea reserva en pending_group con beds bloqueados
   * 4. Genera token + wa.me URL
   */
  async createGroupSession(input: GroupSessionInput): Promise<GroupSessionResult> {
    const seasonType = await getSeasonType(input.checkIn);
    const strategy = resolvePricingStrategy(seasonType);

    // Multiplier de temporada para el precio
    const { rows: multRows } = await query<{ calculate_season_multiplier: string }>(
      `SELECT calculate_season_multiplier($1::date) AS calculate_season_multiplier`,
      [input.checkIn]
    );
    const seasonMultiplier = parseFloat(multRows[0].calculate_season_multiplier);

    const result = await withTransaction(async (client) => {
      // 1. Asignación de camas con overflow automático
      let rawAllocations = await allocateGroupBeds(
        client, input.checkIn, input.checkOut, input.totalBeds, input.guestGender
      );

      // 2. Pricing estrategia D
      const { allocations, defaultAmountPerBed } = applyPricingStrategy(
        rawAllocations, strategy, input.nights, seasonMultiplier
      );

      const allBedIds = allocations.flatMap((a) => a.bedIds);

      // 3. Advisory lock sobre todas las camas
      await acquireLock(client, allBedIds);

      // 4. Re-verificar bajo lock
      const { rows: occupied } = await client.query(
        `SELECT bed_id FROM reservation_beds
         WHERE bed_id = ANY($1::uuid[])
           AND daterange(check_in, check_out, '[)') && daterange($2::date, $3::date, '[)')`,
        [allBedIds, input.checkIn, input.checkOut]
      );
      if (occupied.length > 0) {
        throw new Error('Algunas camas ya no están disponibles. Por favor intentá de nuevo.');
      }

      // 5. Upsert del titular como guest
      const titular = await guestRepo.upsert({
        full_name: input.titular.full_name,
        email: input.titular.email,
        phone: input.titular.phone ?? null,
        country: input.titular.country ?? null,
        language: input.titular.language ?? null
      });

      // 6. Canal "direct"
      const { rows: chRows } = await client.query(`SELECT id FROM channels WHERE code = 'direct'`);
      if (chRows.length === 0) throw new Error('Canal direct no encontrado');
      const channelId = chRows[0].id;

      const reservationNumber = generateReservationNumber();
      const totalBeds = input.totalBeds;

      // Precio total grupal: suma por cuarto
      const totalPrice = parseFloat(
        allocations.reduce((s, a) => s + a.amountPerBed * a.bedsCount, 0).toFixed(2)
      );

      // Depósito: 30% estándar (sin lógica de 50% para grupos aquí — la
      // sesión grupal tiene su propio flujo de confirmación por miembro)
      const depositPercent = 0.30;
      const depositAmount = parseFloat((totalPrice * depositPercent).toFixed(2));
      const remainingAmount = parseFloat((totalPrice - depositAmount).toFixed(2));

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // 7. Crear reserva en pending_group
      const { rows: resRows } = await client.query(
        `INSERT INTO reservations (
           reservation_number, guest_id, channel_id, guest_gender,
           check_in_date, check_out_date, nights_count, beds_count,
           base_price, season_multiplier, group_discount, early_bird_discount, final_price,
           deposit_percent, deposit_amount, remaining_amount,
           status, pending_expires_at, special_requests, source
         ) VALUES (
           $1, $2, $3, $4::bed_gender,
           $5::date, $6::date, $7, $8,
           $9, $10, 0, 0, $11,
           $12, $13, $14,
           'pending_group'::booking_status, $15, $16, 'direct'
         ) RETURNING id, reservation_number`,
        [
          reservationNumber, titular.id, channelId, input.guestGender,
          input.checkIn, input.checkOut, input.nights, totalBeds,
          defaultAmountPerBed, seasonMultiplier, totalPrice,
          depositPercent, depositAmount, remainingAmount,
          expiresAt.toISOString(), input.specialRequests ?? null
        ]
      );
      const reservation = resRows[0];

      // 8. Insertar reservation_beds (anti-overbooking)
      for (const bedId of allBedIds) {
        await client.query(
          `INSERT INTO reservation_beds (reservation_id, bed_id, check_in, check_out)
           VALUES ($1, $2, $3::date, $4::date)`,
          [reservation.id, bedId, input.checkIn, input.checkOut]
        );
      }

      // 9. Crear sesión grupal
      const token = generateToken();
      const groupPaymentUrl = `${input.appBaseUrl}/group-payment/${token}`;
      const waText = encodeURIComponent(
        `Hola! Te comparto el link para pagar tu cama en Lapa Casa Hostel:\n${groupPaymentUrl}`
      );
      const waShareUrl = `https://wa.me/?text=${waText}`;

      const { rows: sessionRows } = await client.query(
        `INSERT INTO group_payment_sessions
           (reservation_id, token, total_beds, paid_beds,
            pricing_strategy, season_type, wa_share_url, expires_at)
         VALUES ($1, $2, $3, 0, $4, $5, $6, $7)
         RETURNING id`,
        [reservation.id, token, totalBeds, strategy, seasonType, waShareUrl, expiresAt.toISOString()]
      );
      const sessionId = sessionRows[0].id;

      return {
        sessionId,
        token,
        reservationId: reservation.id,
        reservationNumber: reservation.reservation_number,
        totalBeds,
        paidBeds: 0,
        pricingStrategy: strategy,
        seasonType,
        amountPerBed: defaultAmountPerBed,
        roomAllocations: allocations,
        expiresAt: expiresAt.toISOString(),
        waShareUrl,
        groupPaymentUrl,
      };
    });

    // Fire-and-forget fuera de la transacción
    redisClient.delPattern('availability:*').catch(() => {});

    return result;
  }

  /** Estado actual de la sesión (polling del link compartido). */
  async getSessionStatus(token: string): Promise<{
    found: boolean;
    expired: boolean;
    completed: boolean;
    totalBeds: number;
    paidBeds: number;
    amountPerBed: number;
    seasonType: string;
    pricingStrategy: string;
    expiresAt: string;
    members: Array<{ guestName: string; paymentMethod: string; paidAt: string }>;
  }> {
    const { rows } = await query<{
      id: string; status: string; total_beds: number; paid_beds: number;
      pricing_strategy: string; season_type: string; expires_at: string;
      reservation_id: string;
    }>(
      `SELECT id, status, total_beds, paid_beds, pricing_strategy, season_type, expires_at, reservation_id
       FROM group_payment_sessions WHERE token = $1`,
      [token]
    );

    if (rows.length === 0) return {
      found: false, expired: false, completed: false,
      totalBeds: 0, paidBeds: 0, amountPerBed: 0,
      seasonType: '', pricingStrategy: '', expiresAt: '',
      members: []
    };

    const session = rows[0];

    // Precio por cama: del titular (base_price de la reserva)
    const { rows: resRows } = await query<{ base_price: string; season_multiplier: string; nights_count: number }>(
      `SELECT base_price, season_multiplier, nights_count FROM reservations WHERE id = $1`,
      [session.reservation_id]
    );
    const res = resRows[0];
    const amountPerBed = res
      ? parseFloat((parseFloat(res.base_price) * parseFloat(res.season_multiplier) * res.nights_count).toFixed(2))
      : 0;

    const { rows: memberRows } = await query<{
      guest_name: string; payment_method: string; paid_at: string;
    }>(
      `SELECT g.full_name AS guest_name, m.payment_method, m.paid_at
       FROM group_payment_members m
       LEFT JOIN guests g ON g.id = m.guest_id
       WHERE m.session_id = $1 AND m.status = 'paid'
       ORDER BY m.paid_at ASC`,
      [session.id]
    );

    return {
      found: true,
      expired: session.status === 'expired',
      completed: session.status === 'completed',
      totalBeds: session.total_beds,
      paidBeds: session.paid_beds,
      amountPerBed,
      seasonType: session.season_type,
      pricingStrategy: session.pricing_strategy,
      expiresAt: session.expires_at,
      members: memberRows.map((m) => ({
        guestName: m.guest_name,
        paymentMethod: m.payment_method,
        paidAt: m.paid_at,
      })),
    };
  }

  /**
   * Inicia el pago de un miembro del grupo.
   * Crea el guest, reserva un slot (group_payment_members en pending),
   * y genera el checkout de Stripe o el QR PIX de MercadoPago.
   */
  async initiateMemberPayment(input: MemberPaymentInput): Promise<MemberPaymentResult> {
    // Validar sesión
    const { rows: sessionRows } = await query<{
      id: string; status: string; total_beds: number; paid_beds: number;
      expires_at: string; reservation_id: string; pricing_strategy: string; season_type: string;
    }>(
      `SELECT id, status, total_beds, paid_beds, expires_at, reservation_id, pricing_strategy, season_type
       FROM group_payment_sessions WHERE token = $1`,
      [input.token]
    );

    if (sessionRows.length === 0) throw new Error('Sesión de pago no encontrada');
    const session = sessionRows[0];

    if (session.status !== 'open') throw new Error('Esta sesión ya está cerrada o expirada');
    if (new Date(session.expires_at) < new Date()) throw new Error('El tiempo para completar el pago grupal expiró');

    // Contar slots pending + paid para no exceder total_beds
    const { rows: slotRows } = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM group_payment_members
       WHERE session_id = $1 AND status IN ('pending', 'paid')`,
      [session.id]
    );
    const usedSlots = parseInt(slotRows[0].count, 10);
    if (usedSlots >= session.total_beds) throw new Error('Todas las camas ya fueron reservadas');

    // Precio base de la reserva
    const { rows: resRows } = await query<{
      base_price: string; season_multiplier: string; nights_count: number; guest_gender: string;
    }>(
      `SELECT base_price, season_multiplier, nights_count, guest_gender FROM reservations WHERE id = $1`,
      [session.reservation_id]
    );
    const res = resRows[0];
    const nights = res.nights_count;
    const seasonMultiplier = parseFloat(res.season_multiplier);

    // Precio por cama según estrategia D (base_price ya tiene el precio mínimo o avg guardado)
    const basePricePerBed = parseFloat(res.base_price);
    const amountPerBed = parseFloat((basePricePerBed * nights * seasonMultiplier).toFixed(2));

    // Surcharge de tarjeta
    const cardSurchargePct = input.paymentMethod === 'card' ? await getCardSurchargePercent() : 0;
    const cardSurcharge = parseFloat((amountPerBed * cardSurchargePct / 100).toFixed(2));
    const amountCharged = parseFloat((amountPerBed + cardSurcharge).toFixed(2));

    // Crear/buscar guest
    const guest = await guestRepo.upsert({
      full_name: input.guest.full_name,
      email: input.guest.email,
      phone: input.guest.phone ?? null,
      country: input.guest.country ?? null,
      language: input.guest.language ?? null
    });

    // Crear registro de miembro en pending
    const { rows: memberRows } = await query<{ id: string }>(
      `INSERT INTO group_payment_members
         (session_id, guest_id, amount_charged, payment_method, card_surcharge, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id`,
      [session.id, guest.id, amountCharged, input.paymentMethod, cardSurcharge]
    );
    const memberId = memberRows[0].id;

    // URL base del frontend (para success/cancel de Stripe Checkout)
    const appBaseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const successUrl = `${appBaseUrl}/group-payment/${input.token}?status=success&member=${memberId}`;
    const cancelUrl  = `${appBaseUrl}/group-payment/${input.token}?status=cancel`;

    // Crear pago en el proveedor
    if (input.paymentMethod === 'card') {
      const { stripeHandler } = await import('../lib/payments/stripe-handler');
      const checkoutSession = await stripeHandler.createCheckoutSession({
        amount: amountCharged,
        description: `Pago grupal — cama Lapa Casa Hostel`,
        customerEmail: input.guest.email,
        reservationId: session.reservation_id,
        successUrl,
        cancelUrl,
        metadata: {
          group_session_id: session.id,
          member_id: memberId,
        },
      });

      logger.info('Group payment Stripe checkout creado', { memberId, sessionId: session.id });

      return {
        memberId,
        paymentMethod: 'card',
        amountCharged,
        cardSurcharge,
        checkoutUrl: checkoutSession.url,
        providerPaymentId: checkoutSession.sessionId,
      };
    } else {
      // PIX via MercadoPago
      const { mercadoPagoHandler } = await import('../lib/payments/mercado-pago-handler');
      const pixResult = await mercadoPagoHandler.createPaymentIntent({
        amount: amountCharged,
        currency: 'BRL',
        description: `Pago grupal — cama Lapa Casa Hostel`,
        payerEmail: input.guest.email,
        paymentMethod: 'pix',
        metadata: {
          group_session_id: session.id,
          member_id: memberId,
          reservation_id: session.reservation_id,
        },
      });

      logger.info('Group payment PIX creado', { memberId, sessionId: session.id });

      return {
        memberId,
        paymentMethod: 'pix',
        amountCharged,
        cardSurcharge: 0,
        pixData: {
          qrCode: pixResult.qrCode ?? '',
          qrCodeBase64: pixResult.qrCodeBase64 ?? '',
          expiresAt: pixResult.expiresAt?.toISOString() ?? '',
        },
        providerPaymentId: pixResult.paymentIntentId,
      };
    }
  }

  /**
   * Confirma el pago de un miembro (llamado desde el webhook de Stripe
   * o desde la confirmación de MercadoPago).
   * Si es el último miembro → auto-confirma la reserva.
   */
  async confirmMemberPayment(params: {
    memberId: string;
    providerPaymentId: string;
    bedId?: string;
  }): Promise<{ reservationConfirmed: boolean }> {
    const { rows: memberRows } = await query<{
      id: string; session_id: string; status: string;
    }>(
      `SELECT id, session_id, status FROM group_payment_members WHERE id = $1`,
      [params.memberId]
    );

    if (memberRows.length === 0) throw new Error('Miembro no encontrado');
    const member = memberRows[0];
    if (member.status === 'paid') return { reservationConfirmed: false };

    // Marcar miembro como pagado, guardar provider_payment_id y (opcionalmente) bed_id
    await query(
      `UPDATE group_payment_members
       SET status = 'paid', paid_at = now(),
           provider_payment_id = $2,
           ${params.bedId ? 'bed_id = $3::uuid,' : ''}
           updated_at = now()
       WHERE id = $1`,
      params.bedId
        ? [params.memberId, params.providerPaymentId, params.bedId]
        : [params.memberId, params.providerPaymentId]
    );

    // Incrementar paid_beds y leer estado
    const { rows: sessionRows } = await query<{
      id: string; total_beds: number; paid_beds: number; reservation_id: string;
    }>(
      `UPDATE group_payment_sessions
       SET paid_beds = paid_beds + 1, updated_at = now()
       WHERE id = $1
       RETURNING id, total_beds, paid_beds, reservation_id`,
      [member.session_id]
    );

    const session = sessionRows[0];
    if (session.paid_beds >= session.total_beds) {
      await this.autoConfirmGroup(session.id, session.reservation_id);
      return { reservationConfirmed: true };
    }

    return { reservationConfirmed: false };
  }

  /** Confirma la reserva grupal cuando todos los miembros pagaron. */
  private async autoConfirmGroup(sessionId: string, reservationId: string): Promise<void> {
    await query(
      `UPDATE reservations SET status = 'confirmed', updated_at = now() WHERE id = $1`,
      [reservationId]
    );
    await query(
      `UPDATE group_payment_sessions SET status = 'completed', updated_at = now() WHERE id = $1`,
      [sessionId]
    );
    enqueueSheetsExport(reservationId, 'upsert').catch(() => {});
    redisClient.delPattern('availability:*').catch(() => {});
    logger.info('Reserva grupal confirmada', { reservationId, sessionId });
  }

  /**
   * Cancela sesiones expiradas y reembolsa pagos parciales.
   * Llamado por BullMQ (grupo-pago-expirado job).
   */
  async cancelExpiredSessions(): Promise<number> {
    const { rows: expiredSessions } = await query<{
      id: string; reservation_id: string;
    }>(
      `UPDATE group_payment_sessions
       SET status = 'expired', updated_at = now()
       WHERE status = 'open' AND expires_at < now()
       RETURNING id, reservation_id`
    );

    let cancelled = 0;
    for (const session of expiredSessions) {
      try {
        // Reembolsar miembros que pagaron
        const { rows: paidMembers } = await query<{
          payment_method: string; provider_payment_id: string; amount_charged: string;
        }>(
          `SELECT payment_method, provider_payment_id, amount_charged
           FROM group_payment_members
           WHERE session_id = $1 AND status = 'paid'`,
          [session.id]
        );

        for (const member of paidMembers) {
          try {
            if (member.payment_method === 'card' && member.provider_payment_id) {
              const { stripeHandler } = await import('../lib/payments/stripe-handler');
              await stripeHandler.createRefund({
                paymentIntentId: member.provider_payment_id,
                amount: parseFloat(member.amount_charged),
              });
            } else if (member.payment_method === 'pix' && member.provider_payment_id) {
              const { mercadoPagoHandler } = await import('../lib/payments/mercado-pago-handler');
              await mercadoPagoHandler.refundPayment({
                paymentId: member.provider_payment_id,
                amount: parseFloat(member.amount_charged),
              });
            }
          } catch (refundErr) {
            logger.error('Error al reembolsar miembro de sesión expirada', {
              sessionId: session.id, error: refundErr
            });
          }
        }

        // Cancelar reserva (el trigger trg_release_beds libera las camas)
        await query(
          `UPDATE reservations
           SET status = 'cancelled', cancelled_at = now(),
               cancellation_reason = 'Sesión de pago grupal expirada'
           WHERE id = $1 AND status = 'pending_group'`,
          [session.reservation_id]
        );

        await query(
          `UPDATE group_payment_members
           SET status = 'refunded', updated_at = now()
           WHERE session_id = $1 AND status = 'paid'`,
          [session.id]
        );

        redisClient.delPattern('availability:*').catch(() => {});
        cancelled++;
        logger.info('Sesión grupal expirada cancelada', { sessionId: session.id });
      } catch (err) {
        logger.error('Error al cancelar sesión grupal expirada', { sessionId: session.id, err });
      }
    }

    return cancelled;
  }
}

export const groupPaymentService = new GroupPaymentService();
