-- Package headers (fixed IDs so children can reference them)
insert into service_catalog (id, category, label, is_package, parent_id, sort_order) values
  ('00000001-0000-0000-0000-000000000000', 'Pakiety', 'Przegląd podstawowy', true, null, 1),
  ('00000002-0000-0000-0000-000000000000', 'Pakiety', 'Przegląd gwarancyjny', true, null, 2),
  ('00000003-0000-0000-0000-000000000000', 'Pakiety', 'Przegląd generalny full suspension', true, null, 3);

-- Zawieszenie
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Zawieszenie', 'Serwis amortyzatora przedniego (podstawowy)', false, null, 1),
  ('Zawieszenie', 'Serwis amortyzatora przedniego (pełny)', false, null, 2),
  ('Zawieszenie', 'Serwis amortyzatora tylnego (podstawowy)', false, null, 3),
  ('Zawieszenie', 'Serwis amortyzatora tylnego (pełny)', false, null, 4),
  ('Zawieszenie', 'Regulacja geometrii zawieszenia', false, null, 5);

-- Opony / Tubeless
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Opony / Tubeless', 'Wymiana dętki — przód', false, null, 1),
  ('Opony / Tubeless', 'Wymiana dętki — tył', false, null, 2),
  ('Opony / Tubeless', 'Montaż systemu tubeless — przód', false, null, 3),
  ('Opony / Tubeless', 'Montaż systemu tubeless — tył', false, null, 4),
  ('Opony / Tubeless', 'Wymiana uszczelniacza (sealant) — przód', false, null, 5),
  ('Opony / Tubeless', 'Wymiana uszczelniacza (sealant) — tył', false, null, 6),
  ('Opony / Tubeless', 'Wymiana opony — przód', false, null, 7),
  ('Opony / Tubeless', 'Wymiana opony — tył', false, null, 8);

-- Hamulce
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Hamulce', 'Regulacja hamulców mechanicznych', false, null, 1),
  ('Hamulce', 'Odpowietrzenie hamulców hydraulicznych', false, null, 2),
  ('Hamulce', 'Wymiana klocków hamulcowych — przód', false, null, 3),
  ('Hamulce', 'Wymiana klocków hamulcowych — tył', false, null, 4),
  ('Hamulce', 'Wymiana okładzin tarczowych — przód', false, null, 5),
  ('Hamulce', 'Wymiana okładzin tarczowych — tył', false, null, 6);

-- Napęd
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Napęd', 'Czyszczenie i smarowanie łańcucha', false, null, 1),
  ('Napęd', 'Wymiana łańcucha', false, null, 2),
  ('Napęd', 'Wymiana kasety', false, null, 3),
  ('Napęd', 'Wymiana suportu', false, null, 4),
  ('Napęd', 'Wymiana przerzutki przedniej', false, null, 5),
  ('Napęd', 'Wymiana przerzutki tylnej', false, null, 6),
  ('Napęd', 'Regulacja przerzutek', false, null, 7);

-- Koła
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Koła', 'Centrowanie koła — przód', false, null, 1),
  ('Koła', 'Centrowanie koła — tył', false, null, 2),
  ('Koła', 'Wymiana szprychy — przód', false, null, 3),
  ('Koła', 'Wymiana szprychy — tył', false, null, 4),
  ('Koła', 'Wymiana piasty — przód', false, null, 5),
  ('Koła', 'Wymiana piasty — tył', false, null, 6);

-- Ogólne
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Ogólne', 'Mycie roweru', false, null, 1),
  ('Ogólne', 'Wymiana linki i pancerza', false, null, 2),
  ('Ogólne', 'Montaż / demontaż akcesoriów', false, null, 3);

-- Przegląd podstawowy children
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Pakiety', 'Regulacja przerzutek', false, '00000001-0000-0000-0000-000000000000', 1),
  ('Pakiety', 'Regulacja hamulców (odpowietrzanie, regulacja zacisków)', false, '00000001-0000-0000-0000-000000000000', 2),
  ('Pakiety', 'Mycie i smarowanie łańcucha', false, '00000001-0000-0000-0000-000000000000', 3),
  ('Pakiety', 'Kasacja luzów (stery, piasty, ramiona korb, pedały)', false, '00000001-0000-0000-0000-000000000000', 4),
  ('Pakiety', 'Pompowanie kół (sprawdzenie czy jest mleko)', false, '00000001-0000-0000-0000-000000000000', 5),
  ('Pakiety', 'Sprawdzenie śrub mostka', false, '00000001-0000-0000-0000-000000000000', 6);

-- Przegląd gwarancyjny children
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Pakiety', 'Regulacja przerzutek', false, '00000002-0000-0000-0000-000000000000', 1),
  ('Pakiety', 'Regulacja hamulców (odpowietrzanie, regulacja zacisków)', false, '00000002-0000-0000-0000-000000000000', 2),
  ('Pakiety', 'Mycie i smarowanie łańcucha', false, '00000002-0000-0000-0000-000000000000', 3),
  ('Pakiety', 'Kasacja luzów (stery, piasty, ramiona korb, pedały)', false, '00000002-0000-0000-0000-000000000000', 4),
  ('Pakiety', 'Pompowanie kół (sprawdzenie czy jest mleko)', false, '00000002-0000-0000-0000-000000000000', 5),
  ('Pakiety', 'Sprawdzenie śrub mostka', false, '00000002-0000-0000-0000-000000000000', 6),
  ('Pakiety', 'Centrowanie kół (dociągnięcie szprych)', false, '00000002-0000-0000-0000-000000000000', 7);

-- Przegląd generalny full suspension children
insert into service_catalog (category, label, is_package, parent_id, sort_order) values
  ('Pakiety', 'Regulacja przerzutek', false, '00000003-0000-0000-0000-000000000000', 1),
  ('Pakiety', 'Regulacja hamulców (odpowietrzanie, regulacja zacisków, mycie zacisków, sprawdzenie stanu klocków, mycie klocków)', false, '00000003-0000-0000-0000-000000000000', 2),
  ('Pakiety', 'Mycie napędu i smarowanie łańcucha', false, '00000003-0000-0000-0000-000000000000', 3),
  ('Pakiety', 'Kasacja luzów (stery, piasty, ramiona korb, pedały)', false, '00000003-0000-0000-0000-000000000000', 4),
  ('Pakiety', 'Sprawdzenie łożysk w piastach kół', false, '00000003-0000-0000-0000-000000000000', 5),
  ('Pakiety', 'Pompowanie kół (sprawdzenie czy jest mleko)', false, '00000003-0000-0000-0000-000000000000', 6),
  ('Pakiety', 'Czyszczenie sterów', false, '00000003-0000-0000-0000-000000000000', 7),
  ('Pakiety', 'Przegląd suportu', false, '00000003-0000-0000-0000-000000000000', 8),
  ('Pakiety', 'Przegląd pancerzy i linek hamulcowych oraz przerzutkowych', false, '00000003-0000-0000-0000-000000000000', 9),
  ('Pakiety', 'Sprawdzenie śrub mostka', false, '00000003-0000-0000-0000-000000000000', 10),
  ('Pakiety', 'Przegląd i czyszczenie ISOSPEED', false, '00000003-0000-0000-0000-000000000000', 11),
  ('Pakiety', 'Przegląd i czyszczenie łożysk wahaczy i dampera', false, '00000003-0000-0000-0000-000000000000', 12);
