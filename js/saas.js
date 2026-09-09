const Saas={
  contextLoaded:false,
  adminLoaded:false,
  async loadContext(force=false){
    if(!Cloud.session||!state.cloud?.organizationId)return null;
    if(this.contextLoaded&&!force)return state.cloud.subscription||null;
    const org=state.cloud.organizationId;
    const [subs,plans,orgs,members]=await Promise.all([
      Cloud.api('organization_subscriptions',`organization_id=eq.${org}&select=*`),
      Cloud.api('saas_plans','select=*&order=sort_order.asc'),
      Cloud.api('organizations',`id=eq.${org}&select=id,name,slug,status,billing_email,trial_ends_at,created_at`),
      Cloud.api('organization_memberships',`organization_id=eq.${org}&select=id,user_id,role,status,created_at`)
    ]);
    const sub=subs?.[0]||null,plan=sub?plans?.find(p=>p.id===sub.plan_id)||null:null;
    state.cloud.subscription=sub?{...sub,plan}:null;
    state.cloud.saasPlans=plans||[];
    state.cloud.organization=orgs?.[0]||null;
    state.cloud.members=members||[];
    this.contextLoaded=true;persist();return state.cloud.subscription;
  },
  async loadAdmin(force=false){
    if(state.cloud?.user?.platformRole!=='super_admin')throw new Error('Acesso restrito ao Super Admin.');
    if(this.adminLoaded&&!force)return state.cloud.adminOrganizations||[];
    const [orgs,subs,plans,members]=await Promise.all([
      Cloud.api('organizations','select=id,name,slug,status,billing_email,trial_ends_at,created_at&order=created_at.desc'),
      Cloud.api('organization_subscriptions','select=*'),
      Cloud.api('saas_plans','select=*&order=sort_order.asc'),
      Cloud.api('organization_memberships','select=organization_id,user_id,role,status')
    ]);
    const rows=(orgs||[]).map(o=>{
      const sub=(subs||[]).find(s=>s.organization_id===o.id)||null;
      const plan=sub?(plans||[]).find(p=>p.id===sub.plan_id)||null:null;
      const users=(members||[]).filter(m=>m.organization_id===o.id&&m.status==='active').length;
      return {...o,subscription:sub,plan,users};
    });
    state.cloud.adminOrganizations=rows;
    state.cloud.saasPlans=plans||[];
    this.adminLoaded=true;persist();return rows;
  },
  async updateOrganization(id,patch){
    await Cloud.api('organizations',`id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:patch});
    this.adminLoaded=false;await this.loadAdmin(true);render();toast('Empresa atualizada.');
  },
  async updateSubscription(orgId,patch){
    const rows=await Cloud.api('organization_subscriptions',`organization_id=eq.${encodeURIComponent(orgId)}&select=id`);
    if(rows?.length){
      await Cloud.api('organization_subscriptions',`organization_id=eq.${encodeURIComponent(orgId)}`,{method:'PATCH',prefer:'return=minimal',body:patch});
    }else{
      await Cloud.api('organization_subscriptions','',{method:'POST',prefer:'return=minimal',body:{organization_id:orgId,...patch}});
    }
    this.adminLoaded=false;await this.loadAdmin(true);render();toast('Assinatura atualizada.');
  },
  async updatePlan(id,patch){
    await Cloud.api('saas_plans',`id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:patch});
    this.adminLoaded=false;this.contextLoaded=false;await this.loadAdmin(true);render();toast('Plano comercial atualizado.');
  },
  openOrganization(id){
    const o=(state.cloud.adminOrganizations||[]).find(x=>x.id===id);if(!o)return;
    const plans=(state.cloud.saasPlans||[]).filter(p=>!p.internal_only);
    const bg=modal(`<div class="modal-head"><div><h3>${esc(o.name)}</h3><div class="sub">Gerencie acesso e assinatura sem alterar os dados financeiros do cliente.</div></div><button class="x">×</button></div><div class="form-grid">${selectField('Status da empresa','saOrgStatus',['trial','active','suspended','cancelled'],o.status)}${selectField('Plano','saOrgPlan',plans.map(p=>p.id),o.subscription?.plan_id||'')} ${selectField('Status assinatura','saSubStatus',['trialing','active','past_due','suspended','cancelled'],o.subscription?.status||'trialing')}${selectField('Ciclo','saCycle',['monthly','yearly'],o.subscription?.billing_cycle==='yearly'?'yearly':'monthly')}<div class="field span4"><label>E-mail de cobrança</label><input id="saBillingEmail" type="email" value="${esc(o.billing_email||'')}"></div><div class="span4 modal-actions"><button class="btn primary" id="saSaveOrg">Salvar</button></div></div>`);
    const planSelect=$('#saOrgPlan',bg);if(planSelect){planSelect.innerHTML=plans.map(p=>`<option value="${p.id}" ${p.id===o.subscription?.plan_id?'selected':''}>${esc(p.name)} — ${brl(p.monthly_price)}/mês</option>`).join('')}
    $('#saSaveOrg',bg).onclick=async()=>{try{await this.updateOrganization(o.id,{status:$('#saOrgStatus',bg).value,billing_email:$('#saBillingEmail',bg).value.trim()||null});await this.updateSubscription(o.id,{plan_id:$('#saOrgPlan',bg).value||null,status:$('#saSubStatus',bg).value,billing_cycle:$('#saCycle',bg).value,starts_at:o.subscription?.starts_at||new Date().toISOString()});bg.remove()}catch(e){alert(e.message)}};
  },
  openPlan(id){
    const p=(state.cloud.saasPlans||[]).find(x=>x.id===id);if(!p)return;
    const bg=modal(`<div class="modal-head"><div><h3>${esc(p.name)}</h3><div class="sub">Defina o preço e os limites deste plano.</div></div><button class="x">×</button></div><div class="form-grid">${field('Preço mensal','saPlanMonth',p.monthly_price,'number')}${field('Preço anual','saPlanYear',p.yearly_price,'number')}${field('Dias de teste','saPlanTrial',p.trial_days,'number')}${field('Máx. usuários','saPlanUsers',p.max_users,'number')}${field('Máx. clientes (vazio = ilimitado)','saPlanClients',p.max_clients??'','number')}<div class="field"><label>Disponível para venda</label><select id="saPlanActive"><option value="true" ${p.active?'selected':''}>Sim</option><option value="false" ${!p.active?'selected':''}>Não</option></select></div><div class="span4 modal-actions"><button class="btn primary" id="saSavePlan">Salvar plano</button></div></div>`);
    $('#saSavePlan',bg).onclick=async()=>{try{const raw=$('#saPlanClients',bg).value;await this.updatePlan(p.id,{monthly_price:Math.max(0,num($('#saPlanMonth',bg).value)),yearly_price:Math.max(0,num($('#saPlanYear',bg).value)),trial_days:Math.max(0,num($('#saPlanTrial',bg).value)),max_users:Math.max(1,num($('#saPlanUsers',bg).value)),max_clients:raw===''?null:Math.max(1,num(raw)),active:$('#saPlanActive',bg).value==='true'});bg.remove()}catch(e){alert(e.message)}};
  },
  async refreshSubscriptionPage(){try{await this.loadContext(true);render()}catch(e){console.warn(e)}},
  async refreshAdminPage(){try{await this.loadAdmin(true);render()}catch(e){alert(e.message)}}
};

const originalLoadProfile=Cloud.loadProfile.bind(Cloud);
Cloud.loadProfile=async function(){
  if(!this.session?.user?.id)return null;
  const p=await this.api('profiles',`user_id=eq.${encodeURIComponent(this.session.user.id)}&select=organization_id,full_name,email,role,platform_role`),profile=p?.[0];
  if(profile){
    state.cloud.user={id:this.session.user.id,email:profile.email||this.session.user.email,fullName:profile.full_name,role:profile.role,platformRole:profile.platform_role||'user'};
    state.cloud.organizationId=profile.organization_id;persist();
    try{await Saas.loadContext(true)}catch{}
  }
  return profile||originalLoadProfile();
};
