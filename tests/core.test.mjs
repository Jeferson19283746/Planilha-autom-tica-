import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

function loadCore(){
  const store=new Map();
  const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const context={console,Intl,Date,Math,JSON,Number,String,Array,Object,Map,Set,Boolean,structuredClone,crypto:{randomUUID:()=>crypto.randomUUID()},localStorage};
  context.globalThis=context;
  vm.createContext(context);
  const src=fs.readFileSync(new URL('../js/core.js',import.meta.url),'utf8')+`\nglobalThis.__zahav={effectiveTax,taxRate,priceCalc,cashForecast,cashMetrics,indicators,fresh,getState:()=>state,setState:v=>{state=v}};`;
  vm.runInContext(src,context,{filename:'core.js'});
  return context.__zahav;
}

test('alíquotas iniciais dos anexos são calculadas corretamente',()=>{
  const z=loadCore();
  assert.equal(z.effectiveTax(0,'III'),0.06);
  assert.equal(z.effectiveTax(0,'V'),0.155);
  assert.equal(Number(z.effectiveTax(240000,'III').toFixed(4)),0.073);
});

test('precificação inclui trabalho, tecnologia, rateio e imposto',()=>{
  const z=loadCore(),s=z.fresh();
  s.settings.taxMode='III';s.settings.rbt12=0;s.settings.hourValue=50;s.settings.clientsPlanned=10;s.settings.targetMargin=.10;
  s.costs=[{id:'c',category:'Administrativo',name:'Contador',type:'Fixo',period:'Mensal',value:1000,qty:1,active:true}];
  const p={id:'p',name:'IA',model:'Mensal',price:700,hours:2,tech:100,variable:50,taxMode:'Padrão',active:true};
  s.products=[p];z.setState(s);
  const c=z.priceCalc(p);
  assert.equal(c.work,100);
  assert.equal(c.fixed,100);
  assert.equal(c.taxValue,42);
  assert.equal(c.total,392);
  assert.equal(c.profit,308);
  assert.ok(c.min>0);
});

test('projeção de caixa replica lançamentos mensais em 90 dias',()=>{
  const z=loadCore(),s=z.fresh();
  const d=new Date();d.setDate(d.getDate()+1);const due=d.toISOString().slice(0,10);
  s.settings.cashOpening=1000;
  s.cashflow=[{id:'1',type:'Saída',category:'Software',description:'Servidor',amount:100,competenceDate:due,dueDate:due,paidDate:'',status:'Pendente',recurrence:'Mensal',clientId:'',notes:''}];
  z.setState(s);
  const f=z.cashForecast(90);
  assert.ok(f.entries.length>=2);
  assert.ok(f.projected<=800);
});

test('indicadores calculam MRR, ticket e concentração',()=>{
  const z=loadCore(),s=z.fresh();
  s.clients=[{id:'a',name:'A',status:'active',monthlyRevenue:700,directCost:100},{id:'b',name:'B',status:'active',monthlyRevenue:300,directCost:50}];
  s.costs=[];z.setState(s);
  const i=z.indicators();
  assert.equal(i.mrr,1000);
  assert.equal(i.ticket,500);
  assert.equal(i.revenueConcentration,0.7);
});
