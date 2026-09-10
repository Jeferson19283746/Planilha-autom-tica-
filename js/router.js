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

function normalizedRoute(pathname=window.location.pathname){
 let value=String(pathname||'/').split('?')[0].split('#')[0];
 try{value=decodeURIComponent(value)}catch{}
 if(value.length>1)value=value.replace(/\/+$/,'');
 return value||'/';
}
function pageFromRoute(pathname=window.location.pathname){
 const route=normalizedRoute(pathname);
 if(route==='/')return 'dashboard';
 return PAGE_BY_ROUTE[route]||null;
}
function routeForPage(nextPage){return ROUTE_BY_PAGE[nextPage]||ROUTE_BY_PAGE.dashboard}
function syncPageFromRoute({replaceInvalid=true}={}){
 const resolved=pageFromRoute();
 page=resolved||'dashboard';
 const canonical=routeForPage(page);
 if(normalizedRoute()==='/'||(replaceInvalid&&!resolved))window.history.replaceState({page},'',canonical);
 return page;
}
function navigatePage(nextPage,{replace=false}={}){
 const target=ROUTE_BY_PAGE[nextPage]?nextPage:'dashboard';
 page=target;
 const method=replace?'replaceState':'pushState';
 window.history[method]({page:target},'',routeForPage(target));
 render();
}

syncPageFromRoute();
window.addEventListener('popstate',()=>{page=pageFromRoute()||'dashboard';render()});
