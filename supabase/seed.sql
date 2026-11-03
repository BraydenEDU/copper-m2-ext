-- Today's stock, from the Product Bible, Section 10. These are the same six
-- rows as lib/copper/data/inventory.json. Safe to run more than once.
insert into inventory (sku, product, color, units_in_stock, next_shipment) values
  ('CH-POL', 'Copper Home', 'Polished Copper', 240, '2026-11-20'),
  ('CH-TEA', 'Copper Home', 'Patina Teal', 6, '2026-11-06'),
  ('CH-NSK', 'Copper Home', 'Night Sky', 185, '2026-11-20'),
  ('CN-BRC', 'Copper Notes', 'Brushed Copper', 310, '2026-11-13'),
  ('CN-DSA', 'Copper Notes', 'Desert Sand', 92, '2026-11-13'),
  ('CN-NSK', 'Copper Notes', 'Night Sky', 0, '2026-11-14')
on conflict (sku) do nothing;
