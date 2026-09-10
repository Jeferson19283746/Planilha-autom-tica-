const ROUTE_BY_PAGE=Object.freeze({
 dashboard:'/dashboard',
 costs:'/custos',
 products:'/produtos',
 clients:'/clientes',
 plans:'/planos',
 cashflow:'/fluxo-caixa',
 dre:'/dre',
 indicators:'/indicadores',
 scenarios:'/cenarios',
 goals:'/metas',
 tax:'/fiscal',
 ai:'/ia',
 audit:'/auditoria',
 subscription:'/conta-plano',
 superadmin:'/super-admin',
 settings:'/configuracao'
});
const PAGE_BY_ROUTE=Object.freeze(Object.fromEntries(Object.entries(ROUTE_BY_PAGE).map(([key,value])=>[value,key])));
const GITHUB_PAGES_MODE=window.location.hostname.endsWith('github.io');

function rawRoute(){
 if(GITHUB_PAGES_MODE)return window.location.hash.slice(1)||'/';
 return window.location.pathname||'/';
}
function normalizedRoute(pathname=rawRoute()){
 let value=String(pathname||'/').split('?')[0].split('#')[0];
 try{value=decodeURIComponent(value)}catch{}
 if(value.length>1)value=value.replace(/\/+$/,'');
 return value||'/';
}
function pageFromRoute(pathname=rawRoute()){
 const route=normalizedRoute(pathname);
 if(route==='/')return 'dashboard';
 return PAGE_BY_ROUTE[route]||null;
}
function routeForPage(nextPage){return ROUTE_BY_PAGE[nextPage]||ROUTE_BY_PAGE.dashboard}
function writeRoute(target,{replace=false}={}){
 const route=routeForPage(target),method=replace?'replaceState':'pushState';
 if(GITHUB_PAGES_MODE){
  const base=`${window.location.pathname}${window.location.search||''}`;
  window.history[method]({page:target},'',`${base}#${route}`);
 }else{
  window.history[method]({page:target},'',route);
 }
}
function syncPageFromRoute({replaceInvalid=true}={}){
 const resolved=pageFromRoute();
 page=resolved||'dashboard';
 if(normalizedRoute()==='/'||(replaceInvalid&&!resolved))writeRoute(page,{replace:true});
 return page;
}
function navigatePage(nextPage,{replace=false}={}){
 const target=ROUTE_BY_PAGE[nextPage]?nextPage:'dashboard';
 page=target;
 writeRoute(target,{replace});
 render();
}

syncPageFromRoute();
window.addEventListener(GITHUB_PAGES_MODE?'hashchange':'popstate',()=>{page=pageFromRoute()||'dashboard';render()});
document.addEventListener('click',event=>{
 const trigger=event.target.closest?.('[data-nav]');
 if(!trigger)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 navigatePage(trigger.dataset.nav);
},true);
