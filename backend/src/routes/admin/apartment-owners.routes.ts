// lapa-casa-hostel/backend/src/routes/admin/apartment-owners.routes.ts
// Gestión de administradores de apartamentos con Stripe Connect.
//
// Endpoints:
//   GET    /admin/apartment-owners          — lista todos los administradores
//   GET    /admin/apartment-owners/:id      — detalle de uno
//   POST   /admin/apartment-owners          — crea un nuevo administrador
//                                             (genera cuenta Express de Stripe + link de onboarding)
//   PUT    /admin/apartment-owners/:id      — edita datos (nombre, teléfono, comisión, etc.)
//   DELETE /admin/apartment-owners/:id      — desactiva (soft delete)
//
//   POST   /admin/apartment-owners/:id/onboarding-link
//          — regenera el link de onboarding (expira en 24h, puede necesitar renovarse)
//
//   GET    /admin/apartment-owners/:id/status
//          — consulta el estado actual en Stripe (onboarding completo, payouts habilitados, etc.)
//
//   PUT    /admin/apartment-owners/:id/assign-room/:roomId
//          — asigna este administrador a un apartamento (room_type)
//   DELETE /admin/apartment-owners/:id/assign-room/:roomId
//          — quita la asignación
//
// Seguridad: authenticateToken + requireRole(['admin']) aplicados en index.ts
//            para todo /admin — estos endpoints los heredan automáticamente.

import { Router } from 'express';
import { query } from '../../config/database';
import { stripeConnectHandler } from '../../lib/payments/stripe-connect';
import { auditLogService } from '../../services/audit-log-service';
import { ApiResponse } from '../../utils/responses';
import { logger } from '../../utils/logger';

const router = Router();

// ─── GET /apartment-owners ───────────────────────────────────────────────────

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         ao.id,
         ao.full_name,
         ao.email,
         ao.phone,
         ao.stripe_account_id,
         ao.onboarding_status,
         ao.commission_rate,
         ao.payout_fee_rate,
         ao.is_active,
         ao.notes,
         ao.created_at,
         ao.updated_at,
         -- apartamentos asignados
         COALESCE(
           json_agg(
             json_build_object('id', rt.id, 'code', rt.code, 'name', rt.name)
           ) FILTER (WHERE rt.id IS NOT NULL),
           '[]'
         ) AS apartments
       FROM apartment_owners ao
       LEFT JOIN room_types rt ON rt.owner_id = ao.id
       GROUP BY ao.id
       ORDER BY ao.full_name ASC`
    );
    res.status(200).json(ApiResponse.success(rows));
  } catch (error) {
    next(error);
  }
});

// ─── GET /apartment-owners/:id ───────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT
         ao.*,
         COALESCE(
           json_agg(
             json_build_object('id', rt.id, 'code', rt.code, 'name', rt.name)
           ) FILTER (WHERE rt.id IS NOT NULL),
           '[]'
         ) AS apartments
       FROM apartment_owners ao
       LEFT JOIN room_types rt ON rt.owner_id = ao.id
       WHERE ao.id = $1
       GROUP BY ao.id`,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Administrador no encontrado'));
      return;
    }
    res.status(200).json(ApiResponse.success(rows[0]));
  } catch (error) {
    next(error);
  }
});

// ─── POST /apartment-owners — crea admin + cuenta Stripe Express ─────────────

router.post('/', async (req, res, next) => {
  try {
    const { fullName, email, phone, commissionRate, payoutFeeRate, notes } = req.body as {
      fullName: string;
      email: string;
      phone?: string;
      commissionRate?: number;
      payoutFeeRate?: number;
      notes?: string;
    };

    if (!fullName || !email) {
      res.status(400).json(ApiResponse.error('Campos requeridos: fullName, email'));
      return;
    }

    // Validar tasas si se proporcionan
    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 1)) {
      res.status(400).json(ApiResponse.error('commissionRate debe estar entre 0 y 1 (ej: 0.05 = 5%)'));
      return;
    }
    if (payoutFeeRate !== undefined && (payoutFeeRate < 0 || payoutFeeRate > 1)) {
      res.status(400).json(ApiResponse.error('payoutFeeRate debe estar entre 0 y 1 (ej: 0.0099 = 0.99%)'));
      return;
    }

    // 1. Crear cuenta Express en Stripe
    let stripeAccountId: string | null = null;
    let onboardingUrl: string | null = null;
    let onboardingUrlExpiresAt: Date | null = null;

    try {
      stripeAccountId = await stripeConnectHandler.createExpressAccount(email);

      // Generar el primer link de onboarding
      const baseUrl = process.env.FRONTEND_URL ?? 'https://lapacasahostel.com';
      const linkResult = await stripeConnectHandler.createOnboardingLink({
        stripeAccountId,
        refreshUrl: `${baseUrl}/admin/owners/${stripeAccountId}/onboarding/refresh`,
        returnUrl: `${baseUrl}/admin/owners/${stripeAccountId}/onboarding/complete`,
      });
      onboardingUrl = linkResult.url;
      onboardingUrlExpiresAt = linkResult.expiresAt;
    } catch (stripeError: any) {
      // Si Stripe falla (ej: no hay STRIPE_SECRET_KEY en dev), el admin se
      // crea igual en la DB con status 'pending'. El link se genera después
      // desde el endpoint /onboarding-link.
      logger.warn('No se pudo crear cuenta Stripe Express automáticamente', {
        email,
        error: stripeError.message,
      });
    }

    // 2. Guardar en la DB
    const { rows } = await query(
      `INSERT INTO apartment_owners
         (full_name, email, phone, stripe_account_id, onboarding_status,
          onboarding_url, onboarding_url_expires_at, commission_rate, payout_fee_rate, notes)
       VALUES ($1, $2, $3, $4,
               CASE WHEN $4 IS NOT NULL THEN 'pending'::connect_onboarding_status
                    ELSE 'pending'::connect_onboarding_status END,
               $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        fullName.trim(),
        email.trim().toLowerCase(),
        phone ?? null,
        stripeAccountId,
        onboardingUrl,
        onboardingUrlExpiresAt,
        commissionRate ?? 0.0500,
        payoutFeeRate ?? 0.0099,
        notes ?? null,
      ]
    );

    const owner = rows[0];

    await auditLogService.log({
      entity_type: 'apartment_owner',
      entity_id: owner.id,
      operation: 'ADMIN_CREATE_OWNER',
      new_data: { fullName, email, stripeAccountId },
    });

    logger.info('Administrador de apartamento creado', { ownerId: owner.id, email, stripeAccountId });

    res.status(201).json(ApiResponse.success(owner, 'Administrador creado. ' +
      (onboardingUrl
        ? 'Se generó el link de onboarding de Stripe. Compártelo con el administrador para que registre su cuenta bancaria.'
        : 'Aún no se pudo generar el link de Stripe. Use el endpoint /onboarding-link cuando Stripe esté disponible.')));
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json(ApiResponse.error('Ya existe un administrador con ese email'));
      return;
    }
    next(error);
  }
});

// ─── PUT /apartment-owners/:id — actualiza datos ─────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, phone, commissionRate, payoutFeeRate, isActive, notes } = req.body as {
      fullName?: string;
      phone?: string;
      commissionRate?: number;
      payoutFeeRate?: number;
      isActive?: boolean;
      notes?: string;
    };

    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 1)) {
      res.status(400).json(ApiResponse.error('commissionRate debe estar entre 0 y 1'));
      return;
    }
    if (payoutFeeRate !== undefined && (payoutFeeRate < 0 || payoutFeeRate > 1)) {
      res.status(400).json(ApiResponse.error('payoutFeeRate debe estar entre 0 y 1'));
      return;
    }

    const sets: string[] = [];
    const params: any[] = [];

    if (fullName !== undefined) { params.push(fullName.trim()); sets.push(`full_name = $${params.length}`); }
    if (phone !== undefined) { params.push(phone); sets.push(`phone = $${params.length}`); }
    if (commissionRate !== undefined) { params.push(commissionRate); sets.push(`commission_rate = $${params.length}`); }
    if (payoutFeeRate !== undefined) { params.push(payoutFeeRate); sets.push(`payout_fee_rate = $${params.length}`); }
    if (isActive !== undefined) { params.push(isActive); sets.push(`is_active = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); sets.push(`notes = $${params.length}`); }

    if (sets.length === 0) {
      res.status(400).json(ApiResponse.error('Nada para actualizar'));
      return;
    }

    params.push(id);
    const { rows } = await query(
      `UPDATE apartment_owners SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Administrador no encontrado'));
      return;
    }

    await auditLogService.log({
      entity_type: 'apartment_owner',
      entity_id: id,
      operation: 'ADMIN_UPDATE_OWNER',
      new_data: req.body,
    });

    res.status(200).json(ApiResponse.success(rows[0], 'Administrador actualizado'));
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /apartment-owners/:id — desactiva (soft delete) ──────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE apartment_owners SET is_active = false, updated_at = now()
       WHERE id = $1 RETURNING id, full_name, email`,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Administrador no encontrado'));
      return;
    }
    await auditLogService.log({
      entity_type: 'apartment_owner',
      entity_id: id,
      operation: 'ADMIN_DEACTIVATE_OWNER',
      old_data: rows[0],
    });
    res.status(200).json(ApiResponse.success({ deactivated: rows[0] }, 'Administrador desactivado'));
  } catch (error) {
    next(error);
  }
});

// ─── POST /apartment-owners/:id/onboarding-link ──────────────────────────────
// Regenera el link de onboarding. Se usa cuando:
//   - El link anterior expiró (24h)
//   - El admin no completó el onboarding y necesita un nuevo link

router.post('/:id/onboarding-link', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT id, stripe_account_id, email, onboarding_status FROM apartment_owners WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Administrador no encontrado'));
      return;
    }

    const owner = rows[0];

    if (owner.onboarding_status === 'active') {
      res.status(400).json(ApiResponse.error('Este administrador ya completó el onboarding de Stripe'));
      return;
    }

    // Si no tiene stripe_account_id todavía (Stripe no estaba disponible al crear),
    // lo generamos ahora
    let stripeAccountId = owner.stripe_account_id;
    if (!stripeAccountId) {
      stripeAccountId = await stripeConnectHandler.createExpressAccount(owner.email);
      await query(
        `UPDATE apartment_owners SET stripe_account_id = $1, updated_at = now() WHERE id = $2`,
        [stripeAccountId, id]
      );
    }

    const baseUrl = process.env.FRONTEND_URL ?? 'https://lapacasahostel.com';
    const linkResult = await stripeConnectHandler.createOnboardingLink({
      stripeAccountId,
      refreshUrl: `${baseUrl}/admin/owners/${stripeAccountId}/onboarding/refresh`,
      returnUrl: `${baseUrl}/admin/owners/${stripeAccountId}/onboarding/complete`,
    });

    // Actualizar link en DB
    await query(
      `UPDATE apartment_owners
       SET onboarding_url = $1,
           onboarding_url_expires_at = $2,
           onboarding_status = 'in_progress',
           updated_at = now()
       WHERE id = $3`,
      [linkResult.url, linkResult.expiresAt, id]
    );

    await auditLogService.log({
      entity_type: 'apartment_owner',
      entity_id: id,
      operation: 'ADMIN_GENERATE_ONBOARDING_LINK',
      new_data: { stripeAccountId, expiresAt: linkResult.expiresAt },
    });

    res.status(200).json(ApiResponse.success({
      onboardingUrl: linkResult.url,
      expiresAt: linkResult.expiresAt,
      stripeAccountId,
    }, 'Link de onboarding generado. Válido por 24 horas.'));
  } catch (error) {
    next(error);
  }
});

// ─── GET /apartment-owners/:id/status ────────────────────────────────────────
// Consulta el estado real en Stripe y actualiza el campo en la DB si cambió

router.get('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT id, stripe_account_id, onboarding_status FROM apartment_owners WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Administrador no encontrado'));
      return;
    }

    const owner = rows[0];

    if (!owner.stripe_account_id) {
      res.status(200).json(ApiResponse.success({
        onboardingStatus: owner.onboarding_status,
        stripeStatus: null,
        message: 'Aún no tiene cuenta Stripe asociada',
      }));
      return;
    }

    const stripeStatus = await stripeConnectHandler.getAccountStatus(owner.stripe_account_id);

    // Sincronizar el estado en la DB si cambió
    let newStatus = owner.onboarding_status;
    if (stripeStatus.detailsSubmitted && stripeStatus.payoutsEnabled) {
      newStatus = 'active';
    } else if (stripeStatus.detailsSubmitted && !stripeStatus.payoutsEnabled) {
      newStatus = 'restricted';
    }

    if (newStatus !== owner.onboarding_status) {
      await query(
        `UPDATE apartment_owners SET onboarding_status = $1::connect_onboarding_status, updated_at = now() WHERE id = $2`,
        [newStatus, id]
      );
      logger.info('Estado Stripe Connect actualizado', { ownerId: id, from: owner.onboarding_status, to: newStatus });
    }

    res.status(200).json(ApiResponse.success({
      onboardingStatus: newStatus,
      stripeStatus,
    }));
  } catch (error) {
    next(error);
  }
});

// ─── PUT /apartment-owners/:id/assign-room/:roomId ───────────────────────────

router.put('/:id/assign-room/:roomId', async (req, res, next) => {
  try {
    const { id, roomId } = req.params;

    // Verificar que el owner existe y está activo
    const ownerCheck = await query(
      `SELECT id, is_active FROM apartment_owners WHERE id = $1`,
      [id]
    );
    if (ownerCheck.rows.length === 0) {
      res.status(404).json(ApiResponse.error('Administrador no encontrado'));
      return;
    }
    if (!ownerCheck.rows[0].is_active) {
      res.status(400).json(ApiResponse.error('No se puede asignar un administrador desactivado'));
      return;
    }

    const { rows } = await query(
      `UPDATE room_types SET owner_id = $1, updated_at = now()
       WHERE id = $2 AND property_type = 'apartment'
       RETURNING id, code, name, property_type, owner_id`,
      [id, roomId]
    );

    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Apartamento no encontrado (solo aplica a room_types de tipo apartment)'));
      return;
    }

    await auditLogService.log({
      entity_type: 'room_type',
      entity_id: roomId,
      operation: 'ADMIN_ASSIGN_OWNER',
      new_data: { ownerId: id },
    });

    res.status(200).json(ApiResponse.success(rows[0], 'Administrador asignado al apartamento'));
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /apartment-owners/:id/assign-room/:roomId ────────────────────────

router.delete('/:id/assign-room/:roomId', async (req, res, next) => {
  try {
    const { id, roomId } = req.params;

    const { rows } = await query(
      `UPDATE room_types SET owner_id = NULL, updated_at = now()
       WHERE id = $1 AND owner_id = $2
       RETURNING id, code, name`,
      [roomId, id]
    );

    if (rows.length === 0) {
      res.status(404).json(ApiResponse.error('Apartamento no encontrado o no está asignado a este administrador'));
      return;
    }

    await auditLogService.log({
      entity_type: 'room_type',
      entity_id: roomId,
      operation: 'ADMIN_UNASSIGN_OWNER',
      new_data: { removedOwnerId: id },
    });

    res.status(200).json(ApiResponse.success(rows[0], 'Asignación removida'));
  } catch (error) {
    next(error);
  }
});

export const apartmentOwnersRouter = router;
