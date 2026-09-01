-- 0030_luggage_storage_config.sql
--
-- Precio y horario del guarda-equipaje: el dueño necesita poder ajustar
-- el valor y la franja horaria sin depender de un deploy (el precio en
-- R$ 30 y el horario 8h-22h son datos operativos, no codigo). Mismo
-- patron que card_surcharge_percent (0012) y pix_discount_percent
-- (0017): una clave en system_config, editable desde /admin/pricing.html.

INSERT INTO system_config (key, value, description) VALUES
  (
    'luggage_storage',
    '{"price": 30, "currency": "BRL", "start_time": "08:00", "end_time": "22:00"}',
    'Guarda-equipaje del hostel: precio de la diaria (BRL) y franja horaria en que se recibe/entrega equipaje. Se muestra en el home y en el FAQ del sitio. Editable desde /admin/pricing.html.'
  );
