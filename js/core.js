const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const pct=v=>`${((Number(v)||0)*100).toFixed(1)}%`;
const num=v=>Number(v)||0;
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const isoDate=d=>new Date(d).toISOString().slice(0,10);
const today=()=>isoDate(new Date());
const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const safeDivide=(a,b)=>b?num(a)/num(b):0;

const DEFAULT_TAX_TABLES={
 III:[[180000,.06,0],[360000,.112,9360],[720000,.135,17640],[1800000,.16,35640],[3600000,.21,125640],[4800000,.33,648000]],
 V:[[180000,.155,0],[360000,.18,4500],[720000,.195,9900],[1800000,.205,17100],[3600000,.23,62100],[4800000,.305,540000]]
};
const baseProducts=[['Google Perfil da Empresa','Implantação'],['Gestão Google','Mensal'],['Site Institucional','Projeto'],['Landing Page','Projeto'],['IA Atendimento','Mensal'],['IA Comercial','Mensal'],['CRM Zahav','Mensal'],['Automação Comercial','Mensal'],['Gestão Meta Ads','Mensal'],['Google Ads','Mensal'],['Panfletagem Digital','Campanha'],['Reativação de Clientes','Campanha / Mensal']];
const baseCosts=[['Administrativo','Contabilidade','Fixo','Mensal'],['Tecnologia','Hostinger / hospedagem','Fixo','Mensal'],['Tecnologia','Lovable / desenvolvimento','Fixo','Mensal'],['Tecnologia','ChatGPT / OpenAI','Fixo','Mensal'],['Tecnologia','WhatsApp / API','Fixo','Mensal'],['Tecnologia','Supabase / servidor / automação','Fixo','Mensal'],['Tecnologia','Domínios','Fixo','Anual'],['Operação','Internet / telefone','Fixo','Mensal'],['Comercial','Deslocamento / combustível','Variável','Mensal'],['Comercial','Marketing da Zahav','Variável','Mensal'],['Financeiro','Taxas bancárias / cobrança','Variável','Mensal'],['Sócios','Pró-labore / INSS','Fixo','Mensal'],['Operação','Ferramentas diversas','Fixo','Mensal'],['Outros','Outros custos','Variável','Mensal']];

const fresh=()=>({
 version:4,
 settings:{company:'Zahav Digital',size:'ME',taxRegime:'Simples Nacional',taxMode:'V',rbt12:0,revenueCurrent:0,revenueProjected:0,clientsPlanned:10,hourValue:50,targetMargin:.10,payroll12:0,manualTax:.10,costAlert:.50,concentrationAlert:.35,cashOpening:0,cac:0,avgRetentionMonths:12,salesHoursCapacity:160,cloudMode:false},
 taxTables:structuredClone(DEFAULT_TAX_TABLES),
 costs:baseCosts.map(x=>({id:uid(),category:x[0],name:x[1],type:x[2],period:x[3],value:0,qty:1,supplier:'',center:'',notes:'',active:true})),
 products:baseProducts.map(x=>({id:uid(),name:x[0],model:x[1],price:0,hours:0,tech:0,variable:0,taxMode:'Padrão',notes:'',active:true})),
 clients:[],plans:[],pricingVersions:[],scenarios:[],cashflow:[],closings:[],goals:[],alertsResolved:[],audit:[],aiHistory:[],cloud:{enabled:false,user:null,organizationId:null,lastSync:null}
});

function migrate(x){
 const d=fresh();
 if(!x||!x.settings)return d;
 return {
  ...d,...x,version:4,
  settings:{...d.settings,...x.settings},
  taxTables:x.taxTables||structuredClone(DEFAULT_TAX_TABLES),
  costs:(x.costs||d.costs).map(c=>({...{supplier:'',center:'',notes:'',active:true},...c})),
  products:(x.products||d.products).map(p=>({...{active:true},...p})),
  clients:(x.clients||[]).map(c=>({...{legalName:'',document:'',endDate:'',planId:'',productIds:[]},...c})),
  plans:(x.plans||[]).map(p=>({...{active:true},...p})),
  pricingVersions:x.pricingVersions||[],
  scenarios:x.scenarios||[],cashflow:(x.cashflow||[]).map(e=>({...{competenceDate:e.dueDate||today(),paidDate:'',recurrence:'Não recorrente',clientId:''},...e})),
  closings:x.closings||[],goals:x.goals||[],alertsResolved:x.alertsResolved||[],audit:x.audit||[],aiHistory:x.aiHistory||[],cloud:{...d.cloud,...(x.cloud||{})}
 };
}
function load(){try{return migrate(JSON.parse(localStorage.getItem('zahavFinanceOS')))}catch{return fresh()}}
let state=load(),page='dashboard';
function persist(){localStorage.setItem('zahavFinanceOS',JSON.stringify(state))}
function audit(action,entity,before=null,after=null){state.audit.unshift({id:uid(),at:new Date().toISOString(),action,entity,before,after});state.audit=state.audit.slice(0,1000);persist()}

function effectiveTax(rbt12,annex){
 rbt12=num(rbt12);
 const table=state.taxTables?.[annex]||DEFAULT_TAX_TABLES[annex];
 if(rbt12<=0)return annex==='III'?.06:.155;
 const row=table.find(r=>rbt12<=num(r[0]))||table.at(-1);
 return Math.max(0,(rbt12*num(row[1])-num(row[2]))/rbt12);
}
function taxRate(mode='Padrão'){
 const m=mode==='Padrão'?state.settings.taxMode:mode;
 if(m==='Manual')return num(state.settings.manualTax);
 return effectiveTax(state.settings.rbt12,m==='III'?'III':'V');
}
const factorR=()=>safeDivide(state.settings.payroll12,state.settings.rbt12);
function factorRRecommendation(){if(state.settings.rbt12<=0)return 'Sem RBT12';return factorR()>=.28?'Anexo III (se atividade estiver sujeita ao Fator R)':'Anexo V (se atividade estiver sujeita ao Fator R)'}

function monthlyCost(c){if(c.active===false)return 0;if(c.period==='Anual')return num(c.value)/12;if(c.period==='Por cliente')return num(c.value)*num(c.qty);return num(c.value)}
const totalCosts=()=>state.costs.reduce((a,c)=>a+monthlyCost(c),0);
const fixedCosts=()=>state.costs.filter(c=>c.type==='Fixo').reduce((a,c)=>a+monthlyCost(c),0);
const variableCosts=()=>totalCosts()-fixedCosts();
const activeClients=()=>state.clients.filter(c=>c.status==='active');
const allocatedFixed=()=>state.settings.clientsPlanned>0?fixedCosts()/state.settings.clientsPlanned:0;
const actualAllocatedFixed=()=>activeClients().length?fixedCosts()/activeClients().length:0;

function priceCalc(p){
 const work=num(p.hours)*num(state.settings.hourValue), tax=taxRate(p.taxMode), taxValue=num(p.price)*tax, fixed=allocatedFixed();
 const base=work+num(p.tech)+num(p.variable)+fixed, total=base+taxValue, profit=num(p.price)-total, margin=p.price>0?profit/p.price:0;
 const den=1-tax-num(state.settings.targetMargin), min=den>0?base/den:0;
 const sustainableDen=1-tax-.25, sustainable=sustainableDen>0?base/sustainableDen:0;
 const cashFloorDen=1-tax-.05, cashFloor=cashFloorDen>0?(num(p.tech)+num(p.variable)+fixed)/cashFloorDen:0;
 return {work,tax,taxValue,fixed,base,total,profit,margin,min,sustainable,cashFloor,status:p.price<=0?'Definir preço':profit<0?'Prejuízo':p.price<min?'Abaixo do alvo':'Saudável'};
}
function clientMetrics(c){
 const revenue=num(c.monthlyRevenue),direct=num(c.directCost),tax=revenue*taxRate(),share=actualAllocatedFixed(),total=direct+tax+share,profit=revenue-total,margin=revenue?profit/revenue:0;
 return {revenue,direct,tax,share,total,profit,margin};
}
function planMetrics(pl){
 const items=pl.items||[];let sum=0,cost=0,hours=0;
 items.forEach(i=>{const p=state.products.find(x=>x.id===i.productId);if(!p)return;const q=num(i.qty)||1,pc=priceCalc(p),unit=i.customPrice!==undefined&&i.customPrice!==null&&i.customPrice!==''?num(i.customPrice):num(p.price);sum+=unit*q;cost+=pc.base*q;hours+=num(p.hours)*q});
 const price=sum*(1-num(pl.discount)),tax=price*taxRate(),profit=price-cost-tax,margin=price?profit/price:0;
 return {sum,price,cost,tax,profit,margin,hours};
}

function recurrenceDates(entry,days=90){
 const start=new Date(entry.dueDate),end=new Date();end.setDate(end.getDate()+days);
 const dates=[];let d=new Date(start),guard=0;
 while(d<=end&&guard++<40){
  if(d>=new Date(today()))dates.push(isoDate(d));
  const r=entry.recurrence||'Não recorrente';
  if(r==='Mensal')d=new Date(d.getFullYear(),d.getMonth()+1,d.getDate());
  else if(r==='Semanal'){d=new Date(d);d.setDate(d.getDate()+7)}
  else if(r==='Anual')d=new Date(d.getFullYear()+1,d.getMonth(),d.getDate());
  else break;
 }
 return dates;
}
function cashForecast(days=90){
 const points=new Map();let running=num(state.settings.cashOpening);
 state.cashflow.filter(x=>x.status==='Pago').forEach(x=>running+=(x.type==='Entrada'?1:-1)*num(x.amount));
 const entries=[];
 state.cashflow.filter(x=>['Pendente','Vencido'].includes(x.status)).forEach(e=>recurrenceDates(e,days).forEach(date=>entries.push({...e,forecastDate:date})));
 entries.sort((a,b)=>a.forecastDate.localeCompare(b.forecastDate));
 entries.forEach(e=>{running+=(e.type==='Entrada'?1:-1)*num(e.amount);points.set(e.forecastDate,running)});
 return {opening:num(state.settings.cashOpening),current:cashMetrics().balance,projected:running,entries,points:[...points.entries()].map(([date,balance])=>({date,balance}))};
}
function cashMetrics(){
 const paidIn=state.cashflow.filter(x=>x.type==='Entrada'&&x.status==='Pago').reduce((a,x)=>a+num(x.amount),0),paidOut=state.cashflow.filter(x=>x.type==='Saída'&&x.status==='Pago').reduce((a,x)=>a+num(x.amount),0),pendingIn=state.cashflow.filter(x=>x.type==='Entrada'&&['Pendente','Vencido'].includes(x.status)).reduce((a,x)=>a+num(x.amount),0),pendingOut=state.cashflow.filter(x=>x.type==='Saída'&&['Pendente','Vencido'].includes(x.status)).reduce((a,x)=>a+num(x.amount),0);
 return {paidIn,paidOut,pendingIn,pendingOut,balance:num(state.settings.cashOpening)+paidIn-paidOut,projected:num(state.settings.cashOpening)+paidIn-paidOut+pendingIn-pendingOut};
}

function dre(period=monthKey()){
 const closing=state.closings.find(x=>x.month===period);if(closing)return closing;
 const gross=num(state.settings.revenueCurrent)||activeClients().reduce((a,c)=>a+num(c.monthlyRevenue),0),tax=gross*taxRate(),net=gross-tax;
 const directClient=activeClients().reduce((a,c)=>a+num(c.directCost),0),v=variableCosts()+directClient,contrib=net-v,f=fixedCosts(),result=contrib-f;
 return {month:period,grossRevenue:gross,taxes:tax,netRevenue:net,variableCosts:v,contribution:contrib,fixedCosts:f,operatingResult:result,margin:gross?result/gross:0};
}
function previousClosing(){return [...state.closings].sort((a,b)=>b.month.localeCompare(a.month))[0]||null}
function dreComparison(){const current=dre(),previous=previousClosing();return {current,previous,revenueDelta:previous?safeDivide(current.grossRevenue-previous.grossRevenue,previous.grossRevenue):0,resultDelta:previous?safeDivide(current.operatingResult-previous.operatingResult,Math.abs(previous.operatingResult)||1):0}}

function indicators(){
 const active=activeClients(),mrr=active.reduce((a,c)=>a+num(c.monthlyRevenue),0),ticket=active.length?mrr/active.length:0;
 const cancelled=state.clients.filter(c=>c.status==='cancelled').length,totalEver=state.clients.filter(c=>['active','cancelled'].includes(c.status)).length,churn=totalEver?cancelled/totalEver:0;
 const avgMargin=active.length?active.reduce((a,c)=>a+clientMetrics(c).margin,0)/active.length:0;
 const contributionPerClient=active.length?active.reduce((a,c)=>a+Math.max(0,clientMetrics(c).profit),0)/active.length:0;
 const ltv=contributionPerClient*num(state.settings.avgRetentionMonths),cac=num(state.settings.cac),payback=contributionPerClient>0?cac/contributionPerClient:0;
 const toolCost=state.costs.filter(c=>c.category==='Tecnologia').reduce((a,c)=>a+monthlyCost(c),0),toolPerClient=active.length?toolCost/active.length:0;
 const soldHours=state.products.filter(p=>p.model==='Mensal').reduce((a,p)=>a+num(p.hours),0)*active.length;
 const capacity=num(state.settings.salesHoursCapacity),utilization=capacity?soldHours/capacity:0;
 const revenueConcentration=active.length&&mrr?Math.max(...active.map(c=>num(c.monthlyRevenue)))/mrr:0;
 const breakEven=(1-taxRate())>0?fixedCosts()/(1-taxRate()):0;
 return {mrr,ticket,churn,avgMargin,ltv,cac,payback,toolCost,toolPerClient,soldHours,capacity,utilization,revenueConcentration,breakEven};
}

function healthScore(){
 let s=45,rev=state.settings.revenueProjected,tc=totalCosts(),ind=indicators();
 if(tc>0)s+=5;
 if(rev>0){const cash=rev-tc-rev*taxRate();s+=cash>0?15:-20;s+=tc/rev<.5?8:-5}
 if(state.products.filter(p=>p.price>0).length>=3)s+=8;
 if(activeClients().length)s+=5;
 if(state.products.some(p=>p.price>0&&priceCalc(p).profit<0))s-=10;
 if(ind.revenueConcentration>state.settings.concentrationAlert)s-=6;
 if(cashForecast(90).projected<0)s-=8;
 return clamp(s,0,100);
}
function alertId(type,entity=''){return `${type}:${entity}`}
function alerts(){
 const a=[],rev=state.settings.revenueProjected,tc=totalCosts();
 const push=(severity,type,title,message,entity='')=>{const id=alertId(type,entity);if(!state.alertsResolved.includes(id))a.push({id,severity,type,title,message,entity})};
 if(rev>0&&tc/rev>state.settings.costAlert)push('critical','cost-ratio','Custos altos',`Custos representam ${pct(tc/rev)} da receita projetada.`);
 state.products.forEach(p=>{const c=priceCalc(p);if(p.price>0&&c.profit<0)push('critical','product-loss','Produto em prejuízo',`${p.name}: ${brl(c.profit)} de resultado estimado.`,p.id);else if(p.price>0&&p.price<c.min)push('warning','product-margin','Margem abaixo do alvo',`${p.name} está abaixo do preço mínimo ${brl(c.min)}.`,p.id)});
 activeClients().forEach(c=>{const m=clientMetrics(c);if(m.profit<0)push('critical','client-loss','Cliente com margem negativa',`${c.name}: ${brl(m.profit)}.`,c.id)});
 const ind=indicators();if(ind.revenueConcentration>state.settings.concentrationAlert){const top=[...activeClients()].sort((a,b)=>b.monthlyRevenue-a.monthlyRevenue)[0];if(top)push('warning','concentration','Concentração de receita',`${top.name} representa ${pct(ind.revenueConcentration)} da receita de clientes.`,top.id)}
 const forecast=cashForecast(90);if(forecast.projected<0)push('critical','cash-90','Caixa projetado negativo',`A projeção de 90 dias termina em ${brl(forecast.projected)}.`);
 if(factorR()>0&&factorR()<.28)push('info','factor-r','Fator R abaixo de 28%',`Fator R estimado em ${pct(factorR())}; valide impacto fiscal para atividades sujeitas à regra.`);
 return a.slice(0,30);
}
