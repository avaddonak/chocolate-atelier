create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  weight text not null default '',
  image_url text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  product_name text not null,
  desired_date date,
  comment text,
  status text not null default 'new',
  consent_given_at timestamptz,
  consent_version text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;

alter table public.orders add column if not exists consent_given_at timestamptz;
alter table public.orders add column if not exists consent_version text;
alter table public.orders add column if not exists marketing_consent boolean not null default false;

create policy "Public can view active products"
on public.products for select
using (
  is_active = true
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

create policy "Admins can manage products"
on public.products for all
to authenticated
using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

create policy "Visitors can create orders"
on public.orders for insert
to anon, authenticated
with check (true);

create policy "Admins can view and manage orders"
on public.orders for all
to authenticated
using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

insert into public.products (name, description, price, weight, image_url, sort_order)
select *
from (values
  ('Тирамису «Мой хит!»', 'Савоярди, насыщенный кофе и нежный крем из настоящего маскарпоне.', 1200, '600 г', 'images/tiramisu.webp', 10),
  ('Прага с пралине', 'Шоколадные коржи, ганаш и хрустящий слой фундука ручной обжарки.', 1650, '700 г', 'images/praline.webp', 20),
  ('Павлова с ягодами', 'Хрустящая меренга, воздушный крем и свежие сезонные ягоды.', 950, '500 г', 'images/pavlova.webp', 30)
) as seed(name, description, price, weight, image_url, sort_order)
where not exists (select 1 from public.products);
