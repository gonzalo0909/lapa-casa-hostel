// lapa-casa-hostel/backend/src/routes/payments/payments.routes.ts
// ventana3
// 0021: agrega release-deposit y mark-received-at-desk (Stripe Connect + InfinityPay)

import { Router } from 'express';
import express from 'express';
import { createPaymentIntentHandler } from './create-payment-intent';
import { confirmPaymentHandler } from './confirm-payment';
import { processDepositHandler } from './process-deposit';
import { handleWebhookHandler } from './handle-webhook';
import releaseDepositRouter from './release-deposit';
import markReceivedAtDeskRouter from './mark-received-at-desk';
import { paymentService } from '../../services/payment-service';
import { bookingService } from '../../services/booking-service';
import { stripeHandler } from '../../lib/payments/stripe-handler';
import { groupPaymentService } from '../../services/group-payment-service';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/responses';

const router = Router();

// POST /payments/stripe-wa-link — genera una Checkout Session sin reserva previa (flujo WhatsApp)
router.post('/stripe-wa-link', async (req, res, next) => {
  try {
    const { amountBRL, description, guestEmail, frontendUrl } = req.body as {
      amountBRL: number;
      description?: string;
      guestEmail?: string;
      frontendUrl?: string;
    };
    if (!amountBRL || amountBRL <= 0) {
      res.status(400).json(ApiResponse.error('amountBRL es requerido y debe ser mayor a 0'));
      return;
    }
    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'https://lapacasario.com';
    const session = await stripeHandler.createCheckoutSession({
      amount: amountBRL,
      description: description || 'Depósito reserva — Lapa Casa Hostel',
      customerEmail: guestEmail || '',
      reservationId: `wa-${Date.now()}`,
      successUrl: `${baseUrl}/pt/hostel?paid=1`,
      cancelUrl:  `${baseUrl}/pt/hostel`,
      metadata: { source: 'whatsapp' },
    });
    logger.info('Stripe WA link generado', { amount: amountBRL, sessionId: session.sessionId });
    res.status(200).json(ApiResponse.success({ url: session.url }, 'Link de pago generado'));
  } catch (error) {
    logger.error('Error al generar Stripe WA link', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
});

// POST /payments/stripe-checkout — genera una Checkout Session de Stripe (pago con tarjeta)
router.post('/stripe-checkout', async (req, res, next) => {
  try {
    const { reservationId, frontendUrl } = req.body as { reservationId: string; frontendUrl?: string };
    if (!reservationId) {
      res.status(400).json(ApiResponse.error('reservationId es requerido'));
      return;
    }

    const booking = await bookingService.getBooking(reservationId);
    if (!booking) {
      res.status(404).json(ApiResponse.error('Reserva no encontrada', { reservationId }));
      return;
    }
    if (booking.status === 'cancelled') {
      res.status(400).json(ApiResponse.error('No se puede pagar una reserva cancelada'));
      return;
    }

    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'https://lapacasario.com';
    const depositAmount = Number(booking.deposit_amount);
    const displayCode = `LCH-${reservationId.substring(0, 8).toUpperCase()}`;
    const guestEmail = booking.guest?.email ?? '';

    const session = await stripeHandler.createCheckoutSession({
      amount: depositAmount,
      description: `Depósito reserva ${displayCode} — Lapa Casa Hostel`,
      customerEmail: guestEmail,
      reservationId,
      successUrl: `${baseUrl}/pt/hostel?paid=1&booking=${reservationId}`,
      cancelUrl: `${baseUrl}/pt/hostel`,
    });

    logger.info('Stripe Checkout Session creada', { reservationId, sessionId: session.sessionId });
    res.status(200).json(ApiResponse.success({
      url: session.url,
      sessionId: session.sessionId,
      amount: depositAmount,
      currency: 'BRL',
    }, 'Checkout Session creada'));
  } catch (error) {
    logger.error('Error al crear Stripe Checkout Session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
});

// POST /payments/intent
router.post('/intent', createPaymentIntentHandler);

// POST /payments/confirm
router.post('/confirm', confirmPaymentHandler);

// POST /payments/deposit
router.post('/deposit', processDepositHandler);

// ── Pago Grupal (Feature 2) ──────────────────────────────────────────────────

// POST /payments/group-session — el titular crea la sesión grupal
router.post('/group-session', async (req, res, next) => {
  try {
    const {
      checkIn, checkOut, totalBeds, nights, guestGender,
      titular, specialRequests, appBaseUrl
    } = req.body as {
      checkIn: string; checkOut: string; totalBeds: number; nights: number;
      guestGender?: 'mixed' | 'female' | 'male';
      titular: { full_name: string; email: string; phone?: string; country?: string; language?: string };
      specialRequests?: string;
      appBaseUrl?: string;
    };

    if (!checkIn || !checkOut || !totalBeds || !nights || !titular?.full_name || !titular?.email) {
      res.status(400).json(ApiResponse.error('checkIn, checkOut, totalBeds, nights y titular son requeridos'));
      return;
    }
    if (totalBeds < 2) {
      res.status(400).json(ApiResponse.error('El pago grupal requiere al menos 2 camas'));
      return;
    }

    // La página /group-payment/:token la sirve el backend, no el frontend
    const baseUrl = appBaseUrl || process.env.APP_URL || 'https://lapa-casa-hostel-api.onrender.com';
    const result = await groupPaymentService.createGroupSession({
      checkIn, checkOut, totalBeds, nights,
      guestGender: guestGender ?? 'mixed',
      titular, specialRequests, appBaseUrl: baseUrl,
    });

    logger.info('Sesión de pago grupal creada', {
      sessionId: result.sessionId, token: result.token, totalBeds,
    });
    res.status(201).json(ApiResponse.success(result, 'Sesión de pago grupal creada'));
  } catch (error) {
    logger.error('Error al crear sesión de pago grupal', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
});

// GET /payments/group/:token — estado general de la sesión (vista del titular)
router.get('/group/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const status = await groupPaymentService.getSessionStatus(token);
    if (!status.found) {
      res.status(404).json(ApiResponse.error('Sesión de pago no encontrada'));
      return;
    }
    res.status(200).json(ApiResponse.success(status, 'Estado de sesión grupal'));
  } catch (error) {
    next(error);
  }
});

// GET /payments/group-member/:memberToken — estado del slot individual del invitado
router.get('/group-member/:memberToken', async (req, res, next) => {
  try {
    const { memberToken } = req.params;
    const status = await groupPaymentService.getMemberStatus(memberToken);
    if (!status.found) {
      res.status(404).json(ApiResponse.error('Link de pago no encontrado'));
      return;
    }
    res.status(200).json(ApiResponse.success(status, 'Estado del slot de invitado'));
  } catch (error) {
    next(error);
  }
});

// POST /payments/group-member/:memberToken/pay — el invitado inicia su pago
router.post('/group-member/:memberToken/pay', async (req, res, next) => {
  try {
    const { memberToken } = req.params;
    const { guest, paymentMethod } = req.body as {
      guest: { full_name: string; email: string; phone?: string; country?: string; language?: string };
      paymentMethod: 'card' | 'pix';
    };

    if (!guest?.full_name || !guest?.email) {
      res.status(400).json(ApiResponse.error('Nombre y email son requeridos'));
      return;
    }
    if (!['card', 'pix'].includes(paymentMethod)) {
      res.status(400).json(ApiResponse.error('paymentMethod debe ser "card" o "pix"'));
      return;
    }

    const result = await groupPaymentService.initiateMemberPayment({ memberToken, guest, paymentMethod });
    logger.info('Pago de invitado grupal iniciado', { memberToken, memberId: result.memberId, paymentMethod });
    res.status(200).json(ApiResponse.success(result, 'Pago iniciado'));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('expiró') || msg.includes('cerrada') || msg.includes('ya fue pagada') || msg.includes('ya fue reclamada')) {
      res.status(409).json(ApiResponse.error(msg));
      return;
    }
    logger.error('Error al iniciar pago de invitado grupal', { error: msg });
    next(error);
  }
});

// POST /payments/release-deposit — libera el 25% retenido al admin del apt (solo admin)
router.use('/release-deposit', releaseDepositRouter);

// POST /payments/mark-received-at-desk — registra pago físico InfinityPay/efectivo (solo admin)
router.use('/mark-received-at-desk', markReceivedAtDeskRouter);

// POST /payments/webhook/stripe
router.post(
  '/webhook/stripe',
  handleWebhookHandler
);

// POST /payments/webhook/mercadopago
router.post(
  '/webhook/mercadopago',
  async (req, res, next) => {
    try {
      const secret = process.env.MP_WEBHOOK_SECRET;
      if (!secret) {
        logger.error('MP_WEBHOOK_SECRET no configurado — webhook rechazado');
        res.status(500).json({ error: 'Webhook not configured' });
        return;
      }

      const signatureHeader = req.headers['x-signature'] as string | undefined;
      if (!signatureHeader) {
        logger.warn('Webhook MP sin header X-Signature');
        res.status(401).json({ error: 'Missing signature' });
        return;
      }

      const tsMatch = signatureHeader.match(/ts=(\d+)/);
      const v1Match = signatureHeader.match(/v1=([a-f0-9]+)/);
      if (!tsMatch || !v1Match) {
        logger.warn('Webhook MP: formato de X-Signature inválido', { signatureHeader });
        res.status(401).json({ error: 'Invalid signature format' });
        return;
      }

      const ts = tsMatch[1];
      const receivedHmac = v1Match[1];
      const xRequestId = req.headers['x-request-id'] as string | undefined ?? '';

      const dataId = (req.body as any)?.data?.id ?? '';
      const signedPayload = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const expectedHmac = require('crypto')
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      const sigOk = require('crypto').timingSafeEqual(
        Buffer.from(receivedHmac),
        Buffer.from(expectedHmac),
      );

      if (!sigOk) {
        logger.warn('Webhook MP: firma inválida');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      logger.info('Webhook MercadoPago recibido y verificado', { body: req.body });
      await paymentService.handleMercadoPagoWebhook(req.body);
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error en webhook MercadoPago', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(200).json({ received: true, error: 'Processing failed' });
    }
  }
);

// GET /payments/:id/status
router.get('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);
    if (!payment) {
      res.status(404).json(ApiResponse.error('Pago no encontrado', { paymentId: id }));
      return;
    }
    res.status(200).json(ApiResponse.success({
      id: payment.id,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
      paymentType: payment.payment_type,
      providerPaymentId: payment.provider_payment_id,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    }, 'Estado del pago'));
  } catch (error) {
    next(error);
  }
});

// GET /payments/reservation/:reservationId
router.get('/reservation/:reservationId', async (req, res, next) => {
  try {
    const { reservationId } = req.params;
    const booking = await bookingService.getBooking(reservationId);
    if (!booking) {
      res.status(404).json(ApiResponse.error('Reserva no encontrada', { reservationId }));
      return;
    }
    const payments = await paymentService.getPaymentsByReservation(reservationId);
    const totalPaid = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    res.status(200).json(ApiResponse.success({
      reservationId,
      payments,
      totalPaid,
      totalPending,
      remainingBalance: Number(booking.final_price) - totalPaid,
      currency: 'BRL',
    }, 'Historial de pagos'));
  } catch (error) {
    next(error);
  }
});

export const paymentsRouter = router;
