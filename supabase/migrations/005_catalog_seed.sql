-- Seed service_catalog with authentic pricing data
-- Safe to re-run: deletes existing catalog rows before inserting

delete from service_catalog;

-- Przeglądy
insert into service_catalog (category, label, is_package, sort_order) values
  ('Przeglądy', 'Przegląd generalny Full Suspension – 649 zł', false, 1),
  ('Przeglądy', 'Przegląd generalny hardtail – 449 zł',        false, 2),
  ('Przeglądy', 'Przegląd podstawowy – 249 zł',                false, 3);

-- Zawieszenie
insert into service_catalog (category, label, is_package, sort_order) values
  ('Zawieszenie', 'Duży serwis zawieszenia – 400 zł', false, 1),
  ('Zawieszenie', 'Mały serwis zawieszenia – 200 zł', false, 2);

-- Hamulce i diagnostyka
insert into service_catalog (category, label, is_package, sort_order) values
  ('Hamulce i diagnostyka', 'Diagnostyka Bosch – 200 zł',           false, 1),
  ('Hamulce i diagnostyka', 'Serwis hamulca – 50 zł',               false, 2),
  ('Hamulce i diagnostyka', 'Prostowanie haka przerzutki – 30 zł',   false, 3);

-- Napęd
insert into service_catalog (category, label, is_package, sort_order) values
  ('Napęd', 'Założenie łańcucha + regulacja przerzutki – 80 zł', false, 1),
  ('Napęd', 'Mycie napędu – 80 zł',                              false, 2),
  ('Napęd', 'Regulacja przerzutki – 50 zł',                      false, 3);

-- Koła
insert into service_catalog (category, label, is_package, sort_order) values
  ('Koła', 'Montaż systemu tubeless – 150 zł', false, 1),
  ('Koła', 'Zmiana opony tubeless – 50 zł',    false, 2),
  ('Koła', 'Centrowanie koła – 50 zł',         false, 3),
  ('Koła', 'Dolanie uszczelniacza – 40 zł',    false, 4),
  ('Koła', 'Wymiana dętki – 30 zł',            false, 5);
