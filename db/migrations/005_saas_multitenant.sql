-- Zahav Finance OS — SaaS multiempresa
-- Transforma o sistema interno em produto vendável pela Zahav.
-- Mantém compatibilidade com organizations/profiles já existentes.

alter table if exists public.organizations
  add column if not exists status text not null default 'active',
  add column if not exists billing_email text,
  add column if not exists trial_ends_at timestamptz;

alter table if exists public.profiles
  add column if not exists email text,
  add column if not exists platform_role text not null default 'user';

-- Restrições adicionadas como checks defensivos (somente se ainda não existirem).
do $$ begin
  alter table public.organizations add constraint organizations_status_check
    check (status in ('trial','active','suspended','cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_platform_role_check
    check (platform_role in ('user','super_admin'));
exception when duplicate_object then null; end $$;

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','finance','viewer')),
  status text not null default 'active' check (status in ('active','invited','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  monthly_price numeric(14,2) not null default 0,
  yearly_price numeric(14,2) not null default 0,
  trial_days integer not null default 0,
  max_users integer not null default 1,
  max_clients integer,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  internal_only boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid references public.saas_plans(id) on delete set null,
  status text not null default 'trialing' check (status in ('trialing','active','past_due','suspended','cancelled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly','internal')),
  provider text,
  external_customer_id text,
  external_subscription_id text,
  starts_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admin_bootstrap (
  email text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  event_type text not null,
  amount numeric(14,2),
  currency text not null default 'BRL',
  provider text,
  external_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.organization_memberships(user_id, status);
create index if not exists memberships_org_idx on public.organization_memberships(organization_id, status);
create index if not exists subscriptions_status_idx on public.organization_subscriptions(status);
create index if not exists billing_events_org_created_idx on public.billing_events(organization_id, created_at desc);

-- Planos iniciais. Os comerciais ficam inativos/sem preço até o Super Admin definir a oferta.
insert into public.saas_plans (code,name,description,monthly_price,yearly_price,trial_days,max_users,max_clients,features,active,internal_only,sort_order)
values
 ('internal','Zahav Interno','Plano completo da operação interna Zahav.',0,0,0,20,null,'{"dashboard":true,"pricing":true,"cashflow":true,"dre":true,"goals":true,"ai":true,"audit":true,"exports":true,"super_admin":true}'::jsonb,true,true,0),
 ('trial','Teste','Acesso de avaliação para novas empresas.',0,0,14,2,25,'{"dashboard":true,"pricing":true,"cashflow":true,"dre":true,"goals":true,"ai":false,"audit":false,"exports":true}'::jsonb,true,false,10),
 ('essencial','Essencial','Gestão financeira e precificação para pequenas empresas.',0,0,0,2,100,'{"dashboard":true,"pricing":true,"cashflow":true,"dre":true,"goals":true,"ai":false,"audit":false,"exports":true}'::jsonb,false,false,20),
 ('profissional','Profissional','Operação financeira completa com inteligência e auditoria.',0,0,0,5,500,'{"dashboard":true,"pricing":true,"cashflow":true,"dre":true,"goals":true,"ai":true,"audit":true,"exports":true}'::jsonb,false,false,30),
 ('scale','Scale','Plano para empresas com equipe e maior volume de clientes.',0,0,0,15,null,'{"dashboard":true,"pricing":true,"cashflow":true,"dre":true,"goals":true,"ai":true,"audit":true,"exports":true,"priority_support":true}'::jsonb,false,false,40)
on conflict (code) do nothing;

-- Organização interna da Zahav.
insert into public.organizations (name,slug,status,billing_email)
values ('Zahav Digital','zahav-digital','active','jeferson02oliveira02@gmail.com')
on conflict (slug) do update set
  name=excluded.name,
  status='active',
  billing_email=excluded.billing_email;

-- Marca o e-mail que deve assumir Super Admin no primeiro cadastro/login criado no Auth.
insert into public.platform_admin_bootstrap(email,organization_id)
select 'jeferson02oliveira02@gmail.com', id
from public.organizations where slug='zahav-digital'
on conflict (email) do update set organization_id=excluded.organization_id;

-- Assinatura interna da Zahav.
insert into public.organization_subscriptions (organization_id,plan_id,status,billing_cycle,notes)
select o.id,p.id,'active','internal','Conta interna Zahav — não faturar.'
from public.organizations o cross join public.saas_plans p
where o.slug='zahav-digital' and p.code='internal'
on conflict (organization_id) do update set
  plan_id=excluded.plan_id,status='active',billing_cycle='internal',notes=excluded.notes;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where user_id=auth.uid() and platform_role='super_admin'
  )
$$;

create or replace function public.has_org_access(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_super_admin() or exists(
    select 1 from public.organization_memberships
    where user_id=auth.uid() and organization_id=target_org and status='active'
  ) or exists(
    select 1 from public.profiles
    where user_id=auth.uid() and organization_id=target_org
  )
$$;

create or replace function public.can_manage_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_super_admin() or exists(
    select 1 from public.organization_memberships
    where user_id=auth.uid() and organization_id=target_org and status='active' and role in ('owner','admin')
  ) or exists(
    select 1 from public.profiles
    where user_id=auth.uid() and organization_id=target_org and role in ('owner','admin')
  )
$$;

-- Atualiza o provisionamento automático de usuários.
-- Super Admin recebe a organização Zahav Digital. Novos clientes recebem empresa própria + trial.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  org_id uuid;
  base_name text;
  base_slug text;
  bootstrap_org uuid;
  trial_plan uuid;
begin
  select organization_id into bootstrap_org
  from public.platform_admin_bootstrap
  where lower(email)=lower(new.email)
  limit 1;

  if bootstrap_org is not null then
    org_id := bootstrap_org;
    insert into public.profiles(user_id,organization_id,full_name,email,role,platform_role)
    values(new.id,org_id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email,'owner','super_admin')
    on conflict(user_id) do update set organization_id=excluded.organization_id,full_name=excluded.full_name,email=excluded.email,role='owner',platform_role='super_admin';

    insert into public.organization_memberships(organization_id,user_id,role,status)
    values(org_id,new.id,'owner','active')
    on conflict(organization_id,user_id) do update set role='owner',status='active';

    update public.platform_admin_bootstrap set claimed_by=new.id,claimed_at=now() where lower(email)=lower(new.email);
    return new;
  end if;

  base_name := coalesce(nullif(new.raw_user_meta_data->>'company_name',''), split_part(new.email,'@',1));
  base_slug := lower(regexp_replace(base_name,'[^a-zA-Z0-9]+','-','g')) || '-' || substring(new.id::text,1,8);

  insert into public.organizations(name,slug,created_by,status,billing_email,trial_ends_at)
  values(base_name,base_slug,new.id,'trial',new.email,now()+interval '14 days')
  returning id into org_id;

  insert into public.profiles(user_id,organization_id,full_name,email,role,platform_role)
  values(new.id,org_id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email,'owner','user');

  insert into public.organization_memberships(organization_id,user_id,role,status)
  values(org_id,new.id,'owner','active');

  insert into public.financial_settings(organization_id) values(org_id)
  on conflict(organization_id) do nothing;

  select id into trial_plan from public.saas_plans where code='trial' limit 1;
  insert into public.organization_subscriptions(organization_id,plan_id,status,billing_cycle,trial_ends_at)
  values(org_id,trial_plan,'trialing','monthly',now()+interval '14 days')
  on conflict(organization_id) do nothing;

  return new;
end;
$$;

-- Backfill de membros para usuários já existentes.
insert into public.organization_memberships(organization_id,user_id,role,status)
select organization_id,user_id,role,'active' from public.profiles
where organization_id is not null
on conflict(organization_id,user_id) do nothing;

-- RLS SaaS.
alter table public.organization_memberships enable row level security;
alter table public.saas_plans enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.platform_admin_bootstrap enable row level security;
alter table public.platform_settings enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select
using (public.has_org_access(id));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update
using (public.can_manage_org(id)) with check (public.can_manage_org(id));

create policy memberships_select on public.organization_memberships for select
using (public.has_org_access(organization_id));
create policy memberships_insert on public.organization_memberships for insert
with check (public.can_manage_org(organization_id));
create policy memberships_update on public.organization_memberships for update
using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy memberships_delete on public.organization_memberships for delete
using (public.can_manage_org(organization_id));

create policy saas_plans_select on public.saas_plans for select
using (active=true or public.is_super_admin());
create policy saas_plans_admin_insert on public.saas_plans for insert
with check (public.is_super_admin());
create policy saas_plans_admin_update on public.saas_plans for update
using (public.is_super_admin()) with check (public.is_super_admin());
create policy saas_plans_admin_delete on public.saas_plans for delete
using (public.is_super_admin());

create policy subscriptions_select on public.organization_subscriptions for select
using (public.has_org_access(organization_id));
create policy subscriptions_admin_insert on public.organization_subscriptions for insert
with check (public.is_super_admin());
create policy subscriptions_admin_update on public.organization_subscriptions for update
using (public.is_super_admin()) with check (public.is_super_admin());

create policy billing_events_select on public.billing_events for select
using (public.has_org_access(organization_id));
create policy billing_events_admin_insert on public.billing_events for insert
with check (public.is_super_admin());

create policy platform_settings_admin_select on public.platform_settings for select using (public.is_super_admin());
create policy platform_settings_admin_write on public.platform_settings for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Bootstrap é deliberadamente invisível para usuários comuns.
create policy bootstrap_admin_only on public.platform_admin_bootstrap for select using (public.is_super_admin());

-- Aplica RLS multiempresa às tabelas do domínio principal sem quebrar o Super Admin.
-- As policies existentes continuam válidas; estas adicionam explicitamente o acesso do Super Admin.
do $$
declare t text;
begin
  foreach t in array array['financial_settings','costs','products','pricing_versions','clients','client_products','plans','plan_items','scenarios','monthly_closings','cashflow_entries','goals','alerts','audit_logs','ai_conversations','ai_messages']
  loop
    execute format('drop policy if exists %I on public.%I','saas_super_admin_'||t,t);
    execute format('create policy %I on public.%I for all using (public.is_super_admin()) with check (public.is_super_admin())','saas_super_admin_'||t,t);
  end loop;
end $$;
