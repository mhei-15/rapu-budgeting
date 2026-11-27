-- Rapu budgeting: first schema. Money is stored as whole cents.
-- Run in the Supabase SQL editor (EU region, Frankfurt). Every table is private to its owner.

create table categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#257de0',
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  store_name text not null,
  chain text,
  purchased_on date not null,
  purchased_time time,
  total_cents int not null,
  photo_paths text[] not null default '{}',
  status text not null default 'saved' check (status in ('draft', 'saved')),
  model text,
  created_at timestamptz not null default now()
);
create index receipts_owner_date on receipts (owner_id, purchased_on desc);

create table items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  position int not null,
  raw_text text not null,
  name text not null,
  quantity numeric,
  unit_price_cents int,
  amount_cents int not null,
  kind text not null check (kind in ('product', 'discount', 'deposit')),
  category_id uuid references categories on delete set null,
  confidence real,
  note text
);
create index items_receipt on items (receipt_id);
create index items_owner_category on items (owner_id, category_id);

create table vat_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  rate_percent numeric not null,
  net_cents int,
  tax_cents int not null
);

-- "Always use this category for …": applied before Claude's guess.
create table item_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  match_text text not null,
  category_id uuid not null references categories on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, match_text)
);

-- Row level security: each person sees and changes only their own rows.
do $$
declare t text;
begin
  foreach t in array array['categories', 'receipts', 'items', 'vat_lines', 'item_rules'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t || '_owner', t
    );
  end loop;
end $$;

-- Private bucket for receipt photos, one folder per person: <user id>/<receipt id>/<n>.jpg
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false);
create policy "receipt photos owner" on storage.objects for all
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
