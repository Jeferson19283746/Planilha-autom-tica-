-- Zahav Finance OS — controle de acesso SaaS e bootstrap do Super Admin

-- Se o e-mail do Super Admin já existir no Supabase Auth, assume imediatamente a conta.
do $$
declare
  admin_user uuid;
  admin_org uuid;
begin
  select id into admin_user from auth.users
  where lower(email)=lower('jeferson02oliveira02@gmail.com')
  order by created_at asc limit 1;

  select id into admin_org from public.organizations where slug='zahav-digital' limit 1;

  if admin_user is not null and admin_org is not null then
    insert into public.profiles(user_id,organization_id,full_name,email,role,platform_role)
    select admin_user,admin_org,
      coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1)),
      email,'owner','super_admin'
    from auth.users where id=admin_user
    on conflict(user_id) do update set
      organization_id=excluded.organization_id,
      full_name=excluded.full_name,
      email=excluded.email,
      role='owner',
      platform_role='super_admin';

    insert into public.organization_memberships(organization_id,user_id,role,status)
    values(admin_org,admin_user,'owner','active')
    on conflict(organization_id,user_id) do update set role='owner',status='active';

    update public.platform_admin_bootstrap
    set claimed_by=admin_user,claimed_at=coalesce(claimed_at,now())
    where lower(email)=lower('jeferson02oliveira02@gmail.com');
  end if;
end $$;

create or replace function public.has_active_subscription(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_super_admin() or (
    exists(select 1 from public.organizations o where o.id=target_org and o.status in ('trial','active'))
    and exists(
      select 1 from public.organization_subscriptions s
      where s.organization_id=target_org
        and s.status in ('trialing','active')
        and (s.trial_ends_at is null or s.status='active' or s.trial_ends_at >= now())
    )
  )
$$;

-- As policies antigas usam esta função. Ao centralizar a assinatura aqui,
-- uma empresa suspensa perde acesso aos dados financeiros, mas ainda pode
-- consultar organização/assinatura para regularização.
create or replace function public.current_organization_id()
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
