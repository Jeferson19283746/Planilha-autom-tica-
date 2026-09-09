const Cloud={
 config:null,session:null,
 async loadConfig(){
  try{const r=await fetch('/api/config');if(!r.ok)return null;const c=await r.json();if(!c?.supabaseUrl||!c?.supabaseAnonKey)return null;this.config=c;state.cloud.enabled=true;persist();return c}catch{return null}
 },
 headers(auth=true){const h={'Content-Type':'application/json','apikey':this.config?.supabaseAnonKey||''};if(auth&&this.session?.access_token)h.Authorization=`Bearer ${this.session.access_token}`;return h},
 restoreSession(){try{this.session=JSON.parse(localStorage.getItem('zahavCloudSession'))||null;return this.session}catch{return null}},
 async signIn(email,password){
  if(!this.config)await this.loadConfig();if(!this.config)throw new Error('Nuvem não configurada no ambiente.');
  const r=await fetch(`${this.config.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:this.headers(false),body:JSON.stringify({email,password})}),d=await r.json();
  if(!r.ok)throw new Error(d.error_description||d.msg||'Falha no login');this.session=d;localStorage.setItem('zahavCloudSession',JSON.stringify(d));await this.loadProfile();return d;
 },
 async signUp(email,password){
  if(!this.config)await this.loadConfig();if(!this.config)throw new Error('Nuvem não configurada no ambiente.');
  const r=await fetch(`${this.config.supabaseUrl}/auth/v1/signup`,{method:'POST',headers:this.headers(false),body:JSON.stringify({email,password,data:{company_name:state.settings.company}})}),d=await r.json();
  if(!r.ok)throw new Error(d.error_description||d.msg||'Falha no cadastro');if(d.access_token){this.session=d;localStorage.setItem('zahavCloudSession',JSON.stringify(d));await this.loadProfile()}return d;
 },
 signOut(){this.session=null;localStorage.removeItem('zahavCloudSession');state.cloud={enabled:!!this.config,user:null,organizationId:null,lastSync:null};persist();render()},
 async api(table,query='',options={}){
  if(!this.config||!this.session)throw new Error('Nuvem não autenticada');const method=options.method||'GET',headers={...this.headers(),Prefer:options.prefer||'return=representation'},url=`${this.config.supabaseUrl}/rest/v1/${table}${query?`?${query}`:''}`;
  const r=await fetch(url,{method,headers,body:options.body?JSON.stringify(options.body):undefined}),text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok)throw new Error(data?.message||data?.hint||`Erro ${r.status}`);return data;
 },
 async loadProfile(){
  if(!this.session?.user?.id)return null;const p=await this.api('profiles',`user_id=eq.${encodeURIComponent(this.session.user.id)}&select=organization_id,full_name,role`),profile=p?.[0];
  if(profile){state.cloud.user={id:this.session.user.id,email:this.session.user.email,fullName:profile.full_name,role:profile.role};state.cloud.organizationId=profile.organization_id;persist()}return profile;
 },
 async pull(){
  const org=state.cloud.organizationId;if(!org)throw new Error('Organização não encontrada');
  const [settings,costs,products,pricing,clients,clientProducts,plans,planItems,scenarios,closings,cashflow,goals,auditLogs]=await Promise.all([
   this.api('financial_settings',`organization_id=eq.${org}&select=*`),this.api('costs',`organization_id=eq.${org}&select=*`),this.api('products',`organization_id=eq.${org}&select=*`),this.api('pricing_versions',`organization_id=eq.${org}&select=*&order=created_at.desc&limit=500`),this.api('clients',`organization_id=eq.${org}&select=*`),this.api('client_products',`organization_id=eq.${org}&select=*`),this.api('plans',`organization_id=eq.${org}&select=*`),this.api('plan_items',`organization_id=eq.${org}&select=*`),this.api('scenarios',`organization_id=eq.${org}&select=*`),this.api('monthly_closings',`organization_id=eq.${org}&select=*`),this.api('cashflow_entries',`organization_id=eq.${org}&select=*`),this.api('goals',`organization_id=eq.${org}&select=*`),this.api('audit_logs',`organization_id=eq.${org}&select=*&order=created_at.desc&limit=1000`)
  ]);
  const fs=settings?.[0];if(fs)state.settings={...state.settings,size:fs.company_size||'ME',taxRegime:fs.tax_regime||'Simples Nacional',taxMode:fs.tax_mode||'V',rbt12:num(fs.rbt12),revenueCurrent:num(fs.revenue_current),revenueProjected:num(fs.revenue_projected),clientsPlanned:num(fs.clients_planned)||10,hourValue:num(fs.hour_value)||50,targetMargin:num(fs.target_margin),payroll12:num(fs.payroll12),manualTax:num(fs.manual_tax),costAlert:num(fs.cost_alert_percent)||.5,concentrationAlert:num(fs.concentration_alert_percent)||.35,cac:num(fs.cac),avgRetentionMonths:num(fs.avg_retention_months)||12,salesHoursCapacity:num(fs.sales_hours_capacity)||160,cashOpening:num(fs.cash_opening)};
  state.costs=(costs||[]).map(x=>({id:x.id,category:x.category,name:x.name,type:x.cost_type,period:x.period,value:num(x.value),qty:num(x.quantity),supplier:x.supplier||'',center:x.cost_center||'',notes:x.notes||'',active:x.active!==false}));
  state.products=(products||[]).map(x=>({id:x.id,name:x.name,model:x.model,price:num(x.price),hours:num(x.hours),tech:num(x.technology_cost),variable:num(x.variable_cost),taxMode:x.tax_mode||'Padrão',notes:x.notes||'',active:x.active!==false}));
  state.pricingVersions=(pricing||[]).map(x=>({id:x.id,productId:x.product_id,createdAt:x.created_at,salePrice:num(x.sale_price),targetMargin:num(x.target_margin),taxRate:num(x.estimated_tax_rate),workCost:num(x.work_cost),technologyCost:num(x.technology_cost),variableCost:num(x.variable_cost),allocatedFixed:num(x.allocated_fixed_cost),totalCost:num(x.total_cost),minimumPrice:num(x.minimum_price),calculatedMargin:num(x.calculated_margin),status:x.status}));
  state.clients=(clients||[]).map(x=>({id:x.id,name:x.name,legalName:x.legal_name||'',document:x.document||'',status:x.status,startDate:x.start_date||'',endDate:x.end_date||'',implementationFee:num(x.implementation_fee),monthlyRevenue:num(x.monthly_revenue),directCost:num(x.direct_cost),planId:x.plan_id||'',productIds:(clientProducts||[]).filter(cp=>cp.client_id===x.id&&cp.active!==false).map(cp=>cp.product_id),notes:x.notes||''}));
  state.plans=(plans||[]).map(x=>({id:x.id,name:x.name,description:x.description||'',discount:num(x.discount_percent),active:x.active!==false,items:(planItems||[]).filter(i=>i.plan_id===x.id).map(i=>({productId:i.product_id,qty:num(i.quantity)||1,customPrice:i.custom_price===null?null:num(i.custom_price)}))}));
  state.scenarios=(scenarios||[]).map(x=>({id:x.id,name:x.name,clients:num(x.clients),ticket:num(x.average_ticket),revenue:num(x.revenue),costs:num(x.estimated_costs),taxRate:num(x.tax_rate),proLabore:num(x.pro_labore)}));
  state.closings=(closings||[]).map(x=>({id:x.id,month:x.month,grossRevenue:num(x.gross_revenue),taxes:num(x.taxes),netRevenue:num(x.net_revenue),variableCosts:num(x.variable_costs),fixedCosts:num(x.fixed_costs),contribution:num(x.net_revenue)-num(x.variable_costs),operatingResult:num(x.operating_result),margin:x.gross_revenue?safeDivide(x.operating_result,x.gross_revenue):0,notes:x.notes||''}));
  state.cashflow=(cashflow||[]).map(x=>({id:x.id,type:x.entry_type,category:x.category,description:x.description,amount:num(x.amount),competenceDate:x.competence_date||'',dueDate:x.due_date,paidDate:x.paid_date||'',status:x.status,recurrence:x.recurrence||'Não recorrente',notes:x.notes||'',clientId:x.client_id||''}));
  state.goals=(goals||[]).map(x=>({id:x.id,period:x.period_type,start:x.period_start,revenue:num(x.revenue_goal),mrr:num(x.mrr_goal),clients:num(x.clients_goal),margin:num(x.margin_goal),cash:num(x.cash_goal),proLabore:num(x.pro_labore_goal)}));
  state.audit=(auditLogs||[]).map(x=>({id:x.id,at:x.created_at,action:x.action,entity:x.entity_type,before:x.before_data,after:x.after_data}));
  state.cloud.lastSync=new Date().toISOString();persist();render();return true;
 },
 async upsert(table,rows,conflict='id'){if(!rows.length)return;const query=conflict?`on_conflict=${encodeURIComponent(conflict)}`:'';return this.api(table,query,{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:rows})},
 async pushSnapshot(){
  const org=state.cloud.organizationId;if(!org)throw new Error('Organização não encontrada');
  await this.upsert('financial_settings',[{organization_id:org,company_size:'ME',tax_regime:state.settings.taxRegime,tax_mode:state.settings.taxMode,rbt12:state.settings.rbt12,revenue_current:state.settings.revenueCurrent,revenue_projected:state.settings.revenueProjected,clients_planned:state.settings.clientsPlanned,hour_value:state.settings.hourValue,target_margin:state.settings.targetMargin,payroll12:state.settings.payroll12,manual_tax:state.settings.manualTax,cost_alert_percent:state.settings.costAlert,concentration_alert_percent:state.settings.concentrationAlert,cac:state.settings.cac,avg_retention_months:state.settings.avgRetentionMonths,sales_hours_capacity:state.settings.salesHoursCapacity,cash_opening:state.settings.cashOpening}],'organization_id');
  await this.upsert('costs',state.costs.map(x=>({id:x.id,organization_id:org,category:x.category,name:x.name,cost_type:x.type,period:x.period,value:x.value,quantity:x.qty,supplier:x.supplier||null,cost_center:x.center||null,notes:x.notes||null,active:x.active!==false})));
  await this.upsert('products',state.products.map(x=>({id:x.id,organization_id:org,name:x.name,model:x.model,price:x.price,hours:x.hours,technology_cost:x.tech,variable_cost:x.variable,tax_mode:x.taxMode,notes:x.notes||null,active:x.active!==false})));
  await this.upsert('pricing_versions',state.pricingVersions.map(x=>({id:x.id,organization_id:org,product_id:x.productId,sale_price:x.salePrice,target_margin:x.targetMargin,estimated_tax_rate:x.taxRate,work_cost:x.workCost,technology_cost:x.technologyCost,variable_cost:x.variableCost,allocated_fixed_cost:x.allocatedFixed,total_cost:x.totalCost,minimum_price:x.minimumPrice,calculated_margin:x.calculatedMargin,status:x.status,valid_from:x.createdAt})));
  await this.upsert('plans',state.plans.map(x=>({id:x.id,organization_id:org,name:x.name,description:x.description||null,discount_percent:x.discount,active:x.active!==false})));
  await this.upsert('clients',state.clients.map(x=>({id:x.id,organization_id:org,name:x.name,legal_name:x.legalName||null,document:x.document||null,status:x.status,start_date:x.startDate||null,end_date:x.endDate||null,implementation_fee:x.implementationFee,monthly_revenue:x.monthlyRevenue,direct_cost:x.directCost,plan_id:x.planId||null,notes:x.notes||null})));
  const clientProducts=state.clients.flatMap(c=>(c.productIds||[]).map(pid=>({organization_id:org,client_id:c.id,product_id:pid,price:state.products.find(p=>p.id===pid)?.price||0,monthly_cost:priceCalc(state.products.find(p=>p.id===pid)||{}).base||0,active:true})));if(clientProducts.length)await this.upsert('client_products',clientProducts,'client_id,product_id');
  const items=state.plans.flatMap(pl=>(pl.items||[]).map(i=>({organization_id:org,plan_id:pl.id,product_id:i.productId,quantity:i.qty||1,custom_price:i.customPrice??null})));if(items.length)await this.upsert('plan_items',items,'plan_id,product_id');
  await this.upsert('scenarios',state.scenarios.map(x=>({id:x.id,organization_id:org,name:x.name,scenario_type:'Personalizado',clients:x.clients,average_ticket:x.ticket,revenue:x.revenue,estimated_costs:x.costs,tax_rate:x.taxRate,target_margin:state.settings.targetMargin,pro_labore:x.proLabore})));
  await this.upsert('monthly_closings',state.closings.map(x=>({id:x.id,organization_id:org,month:x.month,gross_revenue:x.grossRevenue,taxes:x.taxes,net_revenue:x.netRevenue,variable_costs:x.variableCosts,fixed_costs:x.fixedCosts,operating_result:x.operatingResult,opening_balance:0,closing_balance:0,notes:x.notes||null})));
  await this.upsert('cashflow_entries',state.cashflow.map(x=>({id:x.id,organization_id:org,entry_type:x.type,category:x.category,description:x.description,amount:x.amount,competence_date:x.competenceDate||null,due_date:x.dueDate,paid_date:x.paidDate||null,status:x.status,recurrence:x.recurrence,notes:x.notes||null,client_id:x.clientId||null})));
  await this.upsert('goals',state.goals.map(x=>({id:x.id,organization_id:org,period_type:x.period,period_start:x.start,revenue_goal:x.revenue,mrr_goal:x.mrr,clients_goal:x.clients,margin_goal:x.margin,cash_goal:x.cash,pro_labore_goal:x.proLabore})),'organization_id,period_type,period_start');
  const auditRows=state.audit.map(x=>({id:x.id,organization_id:org,actor_user_id:state.cloud.user?.id||null,entity_type:x.entity||'Sistema',action:x.action,before_data:x.before||null,after_data:x.after||null,created_at:x.at}));if(auditRows.length)await this.api('audit_logs','on_conflict=id',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:auditRows});
  state.cloud.lastSync=new Date().toISOString();persist();return true;
 }
};
