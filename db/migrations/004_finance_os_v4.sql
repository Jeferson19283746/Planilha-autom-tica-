-- Zahav Finance OS v4
-- Executar sobre o schema v3 já criado no Supabase do projeto.

alter table if exists public.financial_settings
  add column if not exists cac numeric(14,2) not null default 0,
  add column if not exists avg_retention_months numeric(10,2) not null default 12,
  add column if not exists sales_hours_capacity numeric(10,2) not null default 160,
  add column if not exists cash_opening numeric(14,2) not null default 0;

alter table if exists public.clients
  add column if not exists plan_id uuid references public.plans(id) on delete set null;

create unique index if not exists client_products_client_product_uidx
  on public.client_products(client_id, product_id);

create unique index if not exists plan_items_plan_product_uidx
  on public.plan_items(plan_id, product_id);

create index if not exists clients_org_status_idx
  on public.clients(organization_id, status);

create index if not exists pricing_versions_org_product_created_idx
  on public.pricing_versions(organization_id, product_id, created_at desc);

create index if not exists cashflow_org_status_due_idx
  on public.cashflow_entries(organization_id, status, due_date);

-- Mantém as faixas fiscais atualizáveis por tabela, sem hardcode obrigatório no frontend.
update public.tax_brackets set active=true where active is null;
