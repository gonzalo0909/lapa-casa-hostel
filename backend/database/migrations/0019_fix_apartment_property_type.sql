-- 0019_fix_apartment_property_type.sql
--
-- 0018_room_type_property_type.sql asumio que las unicas room_types
-- existentes en produccion eran las 5 del hostel ("DEFAULT 'hostel' es
-- seguro sin backfill"), pero los 10 apartamentos (apt-01..apt-10) ya
-- habian sido cargados a mano en Supabase ANTES de que 0018 corriera --
-- el DEFAULT 'hostel' de la nueva columna los marco mal a todos, y como
-- 0002_seed_apartments.sql usa ON CONFLICT (code) DO NOTHING, la siembra
-- nunca los toco (ya existian con esos codigos). Resultado: los 10
-- apartamentos quedaron invisibles para GET /availability/apartments
-- (que filtra por property_type = 'apartment') de forma permanente, sin
-- que ningun deploy lo corrigiera solo.
--
-- Este fix es idempotente: solo corrige los codigos apt-01..apt-10 que
-- hoy esten mal etiquetados como 'hostel'.

UPDATE room_types
SET property_type = 'apartment'
WHERE code IN ('apt-01','apt-02','apt-03','apt-04','apt-05','apt-06','apt-07','apt-08','apt-09','apt-10')
  AND property_type = 'hostel';
