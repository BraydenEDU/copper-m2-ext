-- Module 2, part 2: stock levels for the Ask Copper check_availability tool
-- (Product Bible Section 10, `inventory`). One row per product color, the same
-- shape as the lib/copper/data/inventory.json file it replaces.
create table if not exists inventory (
  sku text primary key,
  product text not null,
  color text not null,
  units_in_stock integer not null check (units_in_stock >= 0),
  next_shipment date not null,
  unique (product, color)
);

-- Shoppers only ever read stock, and the chatbot has no login, so the table is
-- readable by anyone with the publishable key and writable by nobody.
alter table inventory enable row level security;

drop policy if exists "inventory is readable by anyone" on inventory;
create policy "inventory is readable by anyone" on inventory for select using (true);
