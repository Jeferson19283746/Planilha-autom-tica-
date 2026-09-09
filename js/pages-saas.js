function subscriptionPage(){
  const org=state.cloud?.organization,sub=state.cloud?.subscription,plan=sub?.plan;
  if(Cloud.session&&state.cloud?.organizationId&&!Saas.contextLoaded){setTimeout(()=>Saas.refreshSubscriptionPage(),0)}
  const status=sub?.status||'não conectado';
  const trial=sub?.trial_ends_at?new Date(sub.trial_ends_at).toLocaleDateString('pt-BR'):'-';
  const available=(state.cloud?.saasPlans||[]).filter(p=>p.active&&!p.internal_only);
  return layout(`<div class="grid kpis">${kpi('Empresa',org?.name||state.settings.company,org?.status||'Modo local')}${kpi('Plano atual',plan?.name||'-',statusBadge(status))}${kpi('Valor mensal',plan?brl(plan.monthly_price):'-',sub?.billing_cycle==='yearly'?'Cobrança anual':'Cobrança mensal')}${kpi('Teste até',trial,sub?.status==='trialing'?'Período de avaliação':'Sem trial ativo')}</div>
  <div class="grid two"><section class="card"><div class="section-title"><div><h3>Conta & assinatura</h3><div class="sub">Cada empresa possui dados isolados e uma assinatura própria.</div></div><button class="btn" onclick="Saas.refreshSubscriptionPage()">Atualizar</button></div><div class="summary-list"><div><span>Status da empresa</span><b>${esc(org?.status||'-')}</b></div><div><span>Status da assinatura</span><b>${esc(status)}</b></div><div><span>Ciclo</span><b>${esc(sub?.billing_cycle||'-')}</b></div><div><span>Usuários ativos</span><b>${state.cloud?.members?.filter(m=>m.status==='active').length||0}</b></div><div><span>Limite de usuários</span><b>${plan?.max_users??'-'}</b></div><div><span>Limite de clientes</span><b>${plan?.max_clients??'Ilimitado'}</b></div></div><div class="notice mt">A ativação financeira da assinatura é administrada pela Zahav. O gateway de pagamento será plugado depois, sem alterar os dados do cliente.</div></section>
  <section class="card"><h3>Planos disponíveis</h3><div class="sub">Os preços são definidos pelo Super Admin Zahav.</div>${available.length?available.map(p=>`<div class="plan-line"><div><b>${esc(p.name)}</b><small>${esc(p.description||'')}</small></div><div><strong>${brl(p.monthly_price)}</strong><small>/mês</small></div></div>`).join(''):'<div class="empty">Os planos comerciais ainda estão sendo configurados.</div>'}</section></div>`,`Conta & Plano`,`Assinatura da empresa e limites do serviço`);
}

function superAdminPage(){
  if(state.cloud?.user?.platformRole!=='super_admin')return layout(`<section class="card"><div class="empty">Acesso restrito ao Super Admin da Zahav.</div></section>`,`Super Admin`,`Gestão da plataforma SaaS`);
  if(!Saas.adminLoaded){setTimeout(()=>Saas.refreshAdminPage(),0)}
  const orgs=state.cloud?.adminOrganizations||[],plans=(state.cloud?.saasPlans||[]).filter(p=>!p.internal_only),active=orgs.filter(o=>o.status==='active').length,trial=orgs.filter(o=>o.status==='trial').length,suspended=orgs.filter(o=>o.status==='suspended').length,mrr=orgs.reduce((a,o)=>{const p=o.plan;if(!p||o.subscription?.status!=='active'||o.subscription?.billing_cycle==='yearly')return a;return a+num(p.monthly_price)},0);
  return layout(`<div class="grid kpis">${kpi('Empresas',orgs.length,'Contas cadastradas')}${kpi('Ativas',active,`${trial} em teste`)}${kpi('Suspensas',suspended,'Acesso financeiro bloqueado')}${kpi('MRR SaaS',brl(mrr),'Assinaturas mensais ativas')}</div>
  <section class="card"><div class="section-title"><div><h3>Empresas clientes</h3><div class="sub">Controle de acesso, plano e assinatura de todas as empresas.</div></div><button class="btn" onclick="Saas.refreshAdminPage()">Atualizar</button></div><div class="table-wrap"><table><thead><tr><th>Empresa</th><th>Status</th><th>Plano</th><th>Assinatura</th><th>Usuários</th><th>Cobrança</th><th></th></tr></thead><tbody>${orgs.length?orgs.map(o=>`<tr><td><b>${esc(o.name)}</b><small>${esc(o.billing_email||o.slug)}</small></td><td>${statusBadge(o.status)}</td><td>${esc(o.plan?.name||'-')}</td><td>${statusBadge(o.subscription?.status||'-')}</td><td>${o.users||0}</td><td>${o.plan?brl(o.plan.monthly_price):'-'}</td><td><button class="btn" onclick="Saas.openOrganization('${o.id}')">Gerenciar</button></td></tr>`).join(''):emptyRow(7,'Nenhuma empresa carregada.')}</tbody></table></div></section>
  <section class="card"><div class="section-title"><div><h3>Planos comerciais</h3><div class="sub">Defina preço, limites e quais planos podem ser vendidos.</div></div></div><div class="plan-grid">${plans.map(p=>`<article class="plan-card"><div class="plan-head"><div><h3>${esc(p.name)}</h3><small>${p.active?'Disponível para venda':'Inativo'}</small></div><button class="icon-btn" onclick="Saas.openPlan('${p.id}')">✎</button></div><div class="plan-price">${brl(p.monthly_price)}<small>/mês</small></div><div class="summary-list"><div><span>Anual</span><b>${brl(p.yearly_price)}</b></div><div><span>Usuários</span><b>${p.max_users}</b></div><div><span>Clientes</span><b>${p.max_clients??'Ilimitado'}</b></div><div><span>Trial</span><b>${p.trial_days||0} dias</b></div></div></article>`).join('')}</div></section>`,`Super Admin`,`Gestão comercial e operacional do Zahav Finance OS SaaS`);
}

const renderFinanceBase=render;
render=function(){
  if(subscriptionLocked()&&!['subscription','settings','superadmin'].includes(page))page='subscription';
  const saasFn={subscription:subscriptionPage,superadmin:superAdminPage}[page];
  if(!saasFn)return renderFinanceBase();
  $('#app').innerHTML=saasFn();
  bind();
  window.scrollTo(0,0);
};
