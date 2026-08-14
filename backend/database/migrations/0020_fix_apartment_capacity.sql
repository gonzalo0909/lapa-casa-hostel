-- 0020_fix_apartment_capacity.sql
--
-- Los 10 apartamentos fueron cargados a mano en Supabase antes de que
-- existiera 0002_seed_apartments.sql, con capacidades inconsistentes
-- (confirmado contra la base real: la mayoria en 2, mixto_7/mixto_12
-- aparte, pero "Quarto do Samba" en 4 y "Apartamento Centro" en 5).
-- Todos los apartamentos son para 2 huespedes -- se corrige acá una vez;
-- de ahora en mas es editable desde /admin (PUT /admin/rooms/:id/settings).

UPDATE room_types
SET capacity = 2
WHERE code IN ('apt-01','apt-02','apt-03','apt-04','apt-05','apt-06','apt-07','apt-08','apt-09','apt-10')
  AND capacity <> 2;
