-- Compatibilidade do SaaS com o schema real do Zahav Insights.
-- Garante que cada nova empresa nasça com configurações, faixas fiscais,
-- produtos e custos iniciais, além de aplicar o gate de assinatura na função
-- app.current_org_id() usada pelas policies existentes.

create or replace function public.seed_finance_org(target_org uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.financial_settings(organization_id)
  values(target_org)
  on conflict(organization_id) do nothing;

  if not exists(select 1 from public.tax_brackets where organization_id=target_org) then
    insert into public.tax_brackets(organization_id,annex,bracket_order,revenue_from,revenue_to,nominal_rate,deduction) values
    (target_org,'III',1,0,180000,0.06,0),
    (target_org,'III',2,180000.01,360000,0.112,9360),
    (target_org,'III',3,360000.01,720000,0.135,17640),
    (target_org,'III',4,720000.01,1800000,0.16,35640),
    (target_org,'III',5,1800000.01,3600000,0.21,125640),
    (target_org,'III',6,3600000.01,4800000,0.33,648000),
    (target_org,'V',1,0,180000,0.155,0),
    (target_org,'V',2,180000.01,360000,0.18,4500),
    (target_org,'V',3,360000.01,720000,0.195,9900),
    (target_org,'V',4,720000.01,1800000,0.205,17100),
    (target_org,'V',5,1800000.01,3600000,0.23,62100),
    (target_org,'V',6,3600000.01,4800000,0.305,540000)
    on conflict(organization_id,annex,bracket_order,valid_from) do nothing;
  end if;

  if not exists(select 1 from public.products where organization_id=target_org) then
    insert into public.products(organization_id,name,category,model) values
    (target_org,'Google Perfil da Empresa','Presença','Implantação'),
    (target_org,'Gestão Google','Presença','Mensal'),
    (target_org,'Site Institucional','Presença','Projeto'),
    (target_org,'Landing Page','Presença','Projeto'),
    (target_org,'IA Atendimento','Atendimento','Mensal'),
    (target_org,'IA Comercial','Vendas','Mensal'),
    (target_org,'CRM Zahav','Vendas','Mensal'),
    (target_org,'Automação Comercial','Vendas','Mensal'),
    (target_org,'Gestão Meta Ads','Aquisição','Mensal'),
    (target_org,'Google Ads','Aquisição','Mensal'),
    (target_org,'Panfletagem Digital','Aquisição','Campanha'),
    (target_org,'Reativação de Clientes','Relacionamento','Campanha');
  end if;

  if not exists(select 1 from public.costs where organization_id=target_org) then
    insert into public.costs(organization_id,category,name,cost_type,period,value,quantity,shared) values
    (target_org,'Administrativo','Contabilidade','Fixo','Mensal',0,1,true),
    (target_org,'Tecnologia','Hostinger / hospedagem','Fixo','Mensal',0,1,true),
    (target_org,'Tecnologia','Lovable / desenvolvimento','Fixo','Mensal',0,1,true),
    (target_org,'Tecnologia','ChatGPT / OpenAI','Fixo','Mensal',0,1,true),
    (target_org,'Tecnologia','WhatsApp / API','Variável','Por cliente',0,0,true),
    (target_org,'Tecnologia','Supabase / servidor / automação','Fixo','Mensal',0,1,true),
    (target_org,'Tecnologia','Domínios','Fixo','Anual',0,1,true),
    (target_org,'Operação','Internet / telefone','Fixo','Mensal',0,1,true),
    (target_org,'Operação','Deslocamento / combustível','Variável','Mensal',0,1,true),
    (target_org,'Comercial','Marketing próprio','Variável','Mensal',0,1,true),
    (target_org,'Financeiro','Taxas bancárias / cobrança','Variável','Mensal',0,1,true),
    (target_org,'Sócios','Pró-labore / INSS','Fixo','Mensal',0,1,true),
    (target_org,'Tecnologia','Ferramentas diversas','Fixo','Mensal',0,1,true),
    (target_org,'Outros','Outros custos','Variável','Mensal',0,1,true);
  end if;
end;
$$;

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
    values(
      new.id,
      org_id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),
      new.email,
      'owner',
      'super_admin'
    )
    on conflict(user_id) do update set
      organization_id=excluded.organization_id,
      full_name=excluded.full_name,
      email=excluded.email,
      role='owner',
      platform_role='super_admin';

    insert into public.organization_memberships(organization_id,user_id,role,status)
    values(org_id,new.id,'owner','active')
    on conflict(organization_id,user_id) do update set role='owner',status='active';

    perform public.seed_finance_org(org_id);

    update public.platform_admin_bootstrap
    set claimed_by=new.id,claimed_at=now()
    where lower(email)=lower(new.email);

    return new;
  end if;

  base_name := coalesce(
    nullif(new.raw_user_meta_data->>'company_name',''),
    nullif(new.raw_user_meta_data->>'organization_name',''),
    split_part(new.email,'@',1)
  );
  base_slug := lower(trim(both '-' from regexp_replace(base_name,'[^a-zA-Z0-9]+','-','g')))
    || '-' || substring(new.id::text,1,8);

  insert into public.organizations(name,slug,created_by,status,billing_email,trial_ends_at)
  values(base_name,base_slug,new.id,'trial',new.email,now()+interval '14 days')
  returning id into org_id;

  insert into public.profiles(user_id,organization_id,full_name,email,role,platform_role)
  values(
    new.id,
    org_id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),
    new.email,
    'owner',
    'user'
  );

  insert into public.organization_memberships(organization_id,user_id,role,status)
  values(org_id,new.id,'owner','active');

  perform public.seed_finance_org(org_id);

  select id into trial_plan from public.saas_plans where code='trial' limit 1;
  insert into public.organization_subscriptions(organization_id,plan_id,status,billing_cycle,trial_ends_at)
  values(org_id,trial_plan,'trialing','monthly',now()+interval '14 days')
  on conflict(organization_id) do nothing;

  return new;
end;
$$;

-- As policies do Zahav Insights usam app.current_org_id().
-- Esta versão incorpora o gate da assinatura sem impedir o Super Admin.
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select p.organization_id
  from public.profiles p
  where p.user_id=auth.uid()
    and (public.is_super_admin() or public.has_active_subscription(p.organization_id))
  limit 1
$$;

-- Se a organização Zahav já existir quando esta migration rodar, garante seu seed.
do $$
declare zahav_org uuid;
begin
  select id into zahav_org from public.organizations where slug='zahav-digital' limit 1;
  if zahav_org is not null then
    perform public.seed_finance_org(zahav_org);
  end if;
end $$;
