-- Supabase schema for environment-suffixed integrations and recommendations tables
-- Copy/paste into the Supabase SQL editor. Adjust RLS to your auth model if needed.

-- Enable required extension (if not already)
create extension if not exists pgcrypto;

-- ========== DEV ==========
create table if not exists integrations_dev (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid null,
  provider text not null,
  connection jsonb not null default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_integrations_dev_tenant on integrations_dev(tenant_id);
create index if not exists idx_integrations_dev_provider on integrations_dev(provider);
create index if not exists idx_integrations_dev_created on integrations_dev(created_at desc);

create table if not exists recommendations_dev (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid null,
  provider text not null,
  keywords text[] not null default '{}',
  recommended_backlinks int not null,
  recommended_interlinks int not null,
  per_keyword jsonb not null default '[]',
  notes text null,
  created_at timestamptz default now()
);

create index if not exists idx_recs_dev_tenant on recommendations_dev(tenant_id);
create index if not exists idx_recs_dev_provider on recommendations_dev(provider);
create index if not exists idx_recs_dev_created on recommendations_dev(created_at desc);

-- Optional: RLS (uncomment if using per-user or per-tenant row security)
-- alter table integrations_dev enable row level security;
-- alter table recommendations_dev enable row level security;
-- create policy "read own integrations dev" on integrations_dev for select using (auth.uid() = tenant_id);
-- create policy "insert own integrations dev" on integrations_dev for insert with check (auth.uid() = tenant_id);
-- create policy "read own recommendations dev" on recommendations_dev for select using (auth.uid() = tenant_id);
-- create policy "insert own recommendations dev" on recommendations_dev for insert with check (auth.uid() = tenant_id);

-- ========== STAGING ==========
create table if not exists integrations_staging (like integrations_dev including all);
create index if not exists idx_integrations_staging_tenant on integrations_staging(tenant_id);
create index if not exists idx_integrations_staging_provider on integrations_staging(provider);
create index if not exists idx_integrations_staging_created on integrations_staging(created_at desc);

create table if not exists recommendations_staging (like recommendations_dev including all);
create index if not exists idx_recs_staging_tenant on recommendations_staging(tenant_id);
create index if not exists idx_recs_staging_provider on recommendations_staging(provider);
create index if not exists idx_recs_staging_created on recommendations_staging(created_at desc);

-- Optional RLS for staging (mirror dev policies if enabled)
-- alter table integrations_staging enable row level security;
-- alter table recommendations_staging enable row level security;
-- create policy "read own integrations staging" on integrations_staging for select using (auth.uid() = tenant_id);
-- create policy "insert own integrations staging" on integrations_staging for insert with check (auth.uid() = tenant_id);
-- create policy "read own recommendations staging" on recommendations_staging for select using (auth.uid() = tenant_id);
-- create policy "insert own recommendations staging" on recommendations_staging for insert with check (auth.uid() = tenant_id);

-- ========== PROD ==========
create table if not exists integrations_prod (like integrations_dev including all);
create index if not exists idx_integrations_prod_tenant on integrations_prod(tenant_id);
create index if not exists idx_integrations_prod_provider on integrations_prod(provider);
create index if not exists idx_integrations_prod_created on integrations_prod(created_at desc);

create table if not exists recommendations_prod (like recommendations_dev including all);
create index if not exists idx_recs_prod_tenant on recommendations_prod(tenant_id);
create index if not exists idx_recs_prod_provider on recommendations_prod(provider);
create index if not exists idx_recs_prod_created on recommendations_prod(created_at desc);

-- Optional RLS for prod (mirror dev policies if enabled)
-- alter table integrations_prod enable row level security;
-- alter table recommendations_prod enable row level security;
-- create policy "read own integrations prod" on integrations_prod for select using (auth.uid() = tenant_id);
-- create policy "insert own integrations prod" on integrations_prod for insert with check (auth.uid() = tenant_id);
-- create policy "read own recommendations prod" on recommendations_prod for select using (auth.uid() = tenant_id);
-- create policy "insert own recommendations prod" on recommendations_prod for insert with check (auth.uid() = tenant_id);


