// lapa-casa-hostel/backend/src/lib/payments/stripe-handler.ts
// ventana3

import Stripe from 'stripe';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error-handler';

interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  customerEmail: string;
  description: string;
  metadata?: Record<string, string>;
  /**
   * Para pagos de apartamentos con Stripe Connect:
   * ID de la cuenta Express del administrador (acct_xxx).
   * Si se provee, el pago se enruta como "separate charges and transfers"
   * y Stripe cobra application_fee_amount por la plataforma.
   */
  connectedAccountId?: string;
  /**
   * Monto de la tarifa de la plataforma en centavos (para Stripe Connect).
   * Stripe lo retiene en la cuenta de la plataforma y transfiere el resto al admin.
   */
  applicationFeeAmountCents?: number;
}

interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  url?: string;
}

interface RefundInput {
  paymentIntentId: string;
  amount: number;
  reason?: string;
}

export class StripeHandler {
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? null;
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2023-10-16' });
    } else {
      logger.warn('STRIPE_SECRET_KEY no configurada — pagos Stripe deshabilitados');
    }
  }

  async createPaymentIntent(data: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    if (!this.stripe) {
      // En producción sin STRIPE_SECRET_KEY, esto antes devolvía un
      // clientSecret falso (pi_test_..._secret_test): el checkout parecía
      // funcionar pero Stripe Elements nunca podía montar con un secret
      // inventado -- el huésped veía el botón de tarjeta "trabado" sin
      // ningún mensaje de error. En producción es mejor fallar acá con un
      // mensaje claro. Fuera de producción (tests, dev local sin keys)
      // se mantiene el stub para no requerir credenciales reales.
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('Pago con tarjeta no disponible en este momento', 503);
      }
      return { paymentIntentId: `pi_test_${Date.now()}`, clientSecret: `pi_test_${Date.now()}_secret_test` };
    }
    const amountCents = Math.round(data.amount * 100);

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: data.currency.toLowerCase(),
      receipt_email: data.customerEmail,
      description: data.description,
      metadata: data.metadata ?? {},
    };

    // Stripe Connect: cuando hay un administrador de apartamento con cuenta Express,
    // se agrega transfer_data para que la plataforma pueda crear Transfers después.
    // El modelo es "separate charges and transfers" — la plataforma cobra el PI
    // y luego transfiere manualmente con stripeConnectHandler.createTransfer().
    // application_fee_amount retiene la comisión de Lapa Casa en la plataforma.
    if (data.connectedAccountId) {
      intentParams.transfer_data = { destination: data.connectedAccountId };
      if (data.applicationFeeAmountCents !== undefined) {
        intentParams.application_fee_amount = data.applicationFeeAmountCents;
      }
    }

    const intent = await this.stripe.paymentIntents.create(intentParams);
    return { paymentIntentId: intent.id, clientSecret: intent.client_secret! };
  }

  async createRefund(data: RefundInput): Promise<void> {
    if (!this.stripe) {
      logger.warn('Stripe não configurado — reembolso simulado', { paymentIntentId: data.paymentIntentId });
      return;
    }
    const amountCents = Math.round(data.amount * 100);
    await this.stripe.refunds.create({
      payment_intent: data.paymentIntentId,
      amount: amountCents,
      reason: 'requested_by_customer',
    });
  }

  // Verifica que el PaymentIntent exista y esté completado en Stripe
  async verifyPayment(paymentIntentId: string): Promise<boolean> {
    if (!this.stripe) return true; // modo test: acepta todo
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return intent.status === 'succeeded';
    } catch {
      return false;
    }
  }

  constructWebhookEvent(payload: Buffer | string, signature: string): Stripe.Event {
    if (!this.stripe || !this.webhookSecret) {
      throw new Error('Stripe webhook no configurado');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}

export const stripeHandler = new StripeHandler();
