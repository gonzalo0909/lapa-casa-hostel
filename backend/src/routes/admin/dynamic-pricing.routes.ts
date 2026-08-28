// lapa-casa-hostel/backend/src/routes/admin/dynamic-pricing.routes.ts
// Rutas admin para el bot de precios dinámicos.
// Montadas bajo /admin/dynamic-pricing (requiere authenticateToken).

import { Router } from 'express';
import { dynamicPricingService } from '../../services/dynamic-pricing-service';
import { ApiResponse } from '../../utils/responses';
import { logger } from '../../utils/logger';

const router = Router();

// ── Config global ─────────────────────────────────────────────────────────

router.get('/config', async (_req, res, next) => {
  try {
    const cfg = await dynamicPricingService.getConfig();
    res.json(ApiResponse.success(cfg));
  } catch (err) { next(err); }
});

router.put('/config', async (req, res, next) => {
  try {
    const updated = await dynamicPricingService.updateConfig(req.body);
    logger.info('DynamicPricing: config actualizada', { fields: Object.keys(req.body) });
    res.json(ApiResponse.success(updated, 'Configuración actualizada'));
  } catch (err) { next(err); }
});

// ── Config por unidad ─────────────────────────────────────────────────────

// GET  /admin/dynamic-pricing/unit-configs — todas las unidades con su config
router.get('/unit-configs', async (_req, res, next) => {
  try {
    const units = await dynamicPricingService.getUnitConfigs();
    res.json(ApiResponse.success(units));
  } catch (err) { next(err); }
});

// PUT  /admin/dynamic-pricing/unit-configs/:roomTypeId — guardar override
router.put('/unit-configs/:roomTypeId', async (req, res, next) => {
  try {
    const { min_price_brl, max_price_brl, bot_enabled, notes } = req.body;
    const updated = await dynamicPricingService.upsertUnitConfig(req.params.roomTypeId, {
      min_price_brl: min_price_brl != null ? Number(min_price_brl) : null,
      max_price_brl: max_price_brl != null ? Number(max_price_brl) : null,
      bot_enabled:   bot_enabled ?? true,
      notes,
    });
    res.json(ApiResponse.success(updated, 'Config de unidad actualizada'));
  } catch (err) { next(err); }
});

// ── Eventos ───────────────────────────────────────────────────────────────

router.get('/events', async (_req, res, next) => {
  try {
    res.json(ApiResponse.success(await dynamicPricingService.getEvents()));
  } catch (err) { next(err); }
});

router.post('/events', async (req, res, next) => {
  try {
    const { name, date_from, date_to, adjustment_pct, applies_to, is_active, notes } = req.body;
    if (!name || !date_from || !date_to || adjustment_pct == null) {
      res.status(400).json(ApiResponse.error('name, date_from, date_to y adjustment_pct son requeridos'));
      return;
    }
    const event = await dynamicPricingService.createEvent({
      name, date_from, date_to,
      adjustment_pct: Number(adjustment_pct),
      applies_to: applies_to ?? 'all',
      is_active: is_active ?? true,
      notes,
    });
    res.status(201).json(ApiResponse.success(event, 'Evento creado'));
  } catch (err) { next(err); }
});

router.put('/events/:id', async (req, res, next) => {
  try {
    res.json(ApiResponse.success(await dynamicPricingService.updateEvent(req.params.id, req.body)));
  } catch (err) { next(err); }
});

router.delete('/events/:id', async (req, res, next) => {
  try {
    await dynamicPricingService.deleteEvent(req.params.id);
    res.json(ApiResponse.success(null, 'Evento eliminado'));
  } catch (err) { next(err); }
});

// ── Bot ───────────────────────────────────────────────────────────────────

router.post('/run', async (_req, res, next) => {
  try {
    logger.info('DynamicPricing: ejecución manual');
    const result = await dynamicPricingService.run();
    res.json(ApiResponse.success(result, `Bot ejecutado: ${result.processed} precios calculados`));
  } catch (err) { next(err); }
});

router.get('/calendar', async (req, res, next) => {
  try {
    const days       = Number(req.query.days ?? 90);
    const roomTypeId = req.query.roomTypeId as string | undefined;
    const calendar   = await dynamicPricingService.getCalendar(days, roomTypeId);
    res.json(ApiResponse.success(calendar));
  } catch (err) { next(err); }
});

router.get('/rio-events', async (_req, res, next) => {
  try {
    res.json(ApiResponse.success(await dynamicPricingService.getRioEvents()));
  } catch (err) { next(err); }
});

export const dynamicPricingRouter = router;
