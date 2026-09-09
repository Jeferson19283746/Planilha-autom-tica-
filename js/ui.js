const icons={dashboard:'▦',costs:'◫',products:'◇',clients:'◉',plans:'▤',cashflow:'↕',dre:'≋',indicators:'◈',scenarios:'◎',goals:'⌖',tax:'%',ai:'✦',audit:'☰',settings:'⚙'};
function nav(){
 const items=[['dashboard','Dashboard'],['costs','Custos'],['products','Produtos'],['clients','Clientes'],['plans','Planos'],['cashflow','Fluxo de caixa'],['dre','DRE'],['indicators','Indicadores'],['scenarios','Cenários'],['goals','Metas'],['tax','Fiscal'],['ai','CFO IA'],['audit','Auditoria'],['settings','Configuração']];
 const cloud=state.cloud?.user?'<b>Nuvem conectada</b><br>Dados sincronizados por organização.':state.cloud?.enabled?'<b>Nuvem disponível</b><br>Faça login em Configuração para sincronizar.':'<b>Modo local ativo</b><br>Nuvem preparada para ativação no deploy.';
 return `<aside class="sidebar"><div class="brand"><div class="brand-badge">Z</div><div><h1>Zahav Finance OS</h1><small>Financeiro & Precificação</small></div></div><div class="nav">${items.map(([k,l])=>`<button data-nav="${k}" class="${page===k?'active':''}"><span class="ico">${icons[k]}</span><span class="label">${l}</span></button>`).join('')}</div><div class="sidebar-foot">${cloud}</div></aside>`;
}
function layout(content,title,sub=''){
 const cloudTag=state.cloud?.user?'<span class="pill success">● Nuvem</span>':state.cloud?.enabled?'<span class="pill">Nuvem disponível</span>':'<span class="pill">Local</span>';
 return `<div class="app">${nav()}<main class="main"><header class="topbar"><div><div class="eyebrow">Zahav Digital</div><h2>${title}</h2>${sub?`<div class="muted top-sub">${sub}</div>`:''}</div><div class="actions">${cloudTag}<span class="pill">${state.settings.size} • ${state.settings.taxMode==='V'?'Anexo V':state.settings.taxMode==='III'?'Anexo III':'Manual'}</span><button class="btn" id="exportBtn">Backup</button></div></header>${content}</main></div>`;
}
function kpi(label,value,hint='',cls=''){return `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`}
function btn(id,label,cls='primary'){return `<button class="btn ${cls}" id="${id}">${label}</button>`}
function modal(html){const bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML=`<div class="modal">${html}</div>`;document.body.append(bg);bg.onclick=e=>{if(e.target===bg)bg.remove()};$('.x',bg)?.addEventListener('click',()=>bg.remove());return bg}
const field=(l,id,v='',type='text',cls='')=>`<div class="field ${cls}"><label>${l}</label><input id="${id}" type="${type}" value="${esc(v)}"></div>`;
function selectField(label,id,values,current,cls=''){return `<div class="field ${cls}"><label>${label}</label><select id="${id}">${values.map(v=>`<option value="${esc(v)}" ${String(current)===String(v)?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`}
function toast(msg){const e=document.createElement('div');e.className='toast';e.textContent=msg;document.body.append(e);setTimeout(()=>e.remove(),2300)}
function statusBadge(v){const cls=String(v).toLowerCase().replaceAll(' ','-').replaceAll('í','i').replaceAll('á','a').replaceAll('ã','a');return `<span class="status ${cls}">${esc(v)}</span>`}
function emptyRow(cols,msg){return `<tr><td colspan="${cols}"><div class="empty">${esc(msg)}</div></td></tr>`}
function confirmAction(message){return window.confirm(message)}
function authModal(){
 const bg=modal(`<div class="modal-head"><div><h3>Conectar à nuvem</h3><div class="sub">Use o login quando o Supabase estiver configurado no ambiente.</div></div><button class="x">×</button></div><div class="form-grid">${field('E-mail','authEmail','','email','span2')}${field('Senha','authPassword','','password','span2')}<div class="span4 modal-actions"><button class="btn primary" id="loginCloud">Entrar</button><button class="btn" id="signupCloud">Criar conta</button></div><div class="span4"><div class="notice" id="authMessage">A chave pública do Supabase nunca fica hardcoded no repositório; ela é fornecida pelo ambiente de hospedagem.</div></div></div>`);
 return bg;
}
