function exportData(){const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`zahav-finance-os-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)}

function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=migrate(JSON.parse(r.result));audit('Importar backup','Sistema');render();toast('Backup importado.')}catch{alert('Arquivo inválido.')}};r.readAsText(f)}

function csvCell(v){const s=String(v??'');return /[",\n;]/.test(s)?`"${s.replaceAll('"','""')}"`:s}

function downloadCsv(filename,rows){const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href)}

function exportEntityCsv(type){
 if(type==='costs')downloadCsv('zahav-custos.csv',[['category','name','type','period','value','qty','supplier','center','notes','active'],...state.costs.map(x=>[x.category,x.name,x.type,x.period,x.value,x.qty,x.supplier,x.center,x.notes,x.active])]);
 if(type==='products')downloadCsv('zahav-produtos.csv',[['name','model','price','hours','tech','variable','taxMode','notes','active'],...state.products.map(x=>[x.name,x.model,x.price,x.hours,x.tech,x.variable,x.taxMode,x.notes,x.active])]);
 if(type==='clients')downloadCsv('zahav-clientes.csv',[['name','legalName','document','status','implementationFee','monthlyRevenue','directCost','startDate','endDate','notes'],...state.clients.map(x=>[x.name,x.legalName,x.document,x.status,x.implementationFee,x.monthlyRevenue,x.directCost,x.startDate,x.endDate,x.notes])]);
 if(type==='cash')downloadCsv('zahav-fluxo-caixa.csv',[['type','category','description','amount','competenceDate','dueDate','paidDate','status','recurrence','notes'],...state.cashflow.map(x=>[x.type,x.category,x.description,x.amount,x.competenceDate,x.dueDate,x.paidDate,x.status,x.recurrence,x.notes])]);
 if(type==='audit')downloadCsv('zahav-auditoria.csv',[['date','action','entity'],...state.audit.map(x=>[x.at,x.action,x.entity])]);
}

function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;continue}if(ch==='"'){quoted=!quoted;continue}if((ch===';'||ch===',')&&!quoted){row.push(cell.trim());cell='';continue}if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[];continue}cell+=ch}row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}

function importCsvFile(e){
 const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const rows=parseCsv(String(r.result).replace(/^\ufeff/,''));if(rows.length<2)throw new Error('CSV sem dados');const headers=rows[0].map(h=>h.trim()),idx=h=>headers.indexOf(h),get=(row,h)=>idx(h)>=0?row[idx(h)]:'';let type='';if(headers.includes('description')&&headers.includes('dueDate'))type='cash';else if(headers.includes('monthlyRevenue'))type='clients';else if(headers.includes('model')&&headers.includes('price'))type='products';else if(headers.includes('period')&&headers.includes('category'))type='costs';else throw new Error('Cabeçalhos não reconhecidos');
  if(type==='costs')state.costs.push(...rows.slice(1).map(row=>({id:uid(),category:get(row,'category')||'Outros',name:get(row,'name')||'Custo importado',type:get(row,'type')||'Fixo',period:get(row,'period')||'Mensal',value:num(get(row,'value')),qty:num(get(row,'qty'))||1,supplier:get(row,'supplier'),center:get(row,'center'),notes:get(row,'notes'),active:get(row,'active')!=='false'})));
  if(type==='products')state.products.push(...rows.slice(1).map(row=>({id:uid(),name:get(row,'name')||'Produto importado',model:get(row,'model')||'Mensal',price:num(get(row,'price')),hours:num(get(row,'hours')),tech:num(get(row,'tech')),variable:num(get(row,'variable')),taxMode:get(row,'taxMode')||'Padrão',notes:get(row,'notes'),active:get(row,'active')!=='false'})));
  if(type==='clients')state.clients.push(...rows.slice(1).map(row=>({id:uid(),name:get(row,'name')||'Cliente importado',legalName:get(row,'legalName'),document:get(row,'document'),status:get(row,'status')||'prospect',implementationFee:num(get(row,'implementationFee')),monthlyRevenue:num(get(row,'monthlyRevenue')),directCost:num(get(row,'directCost')),startDate:get(row,'startDate')||today(),endDate:get(row,'endDate'),planId:'',productIds:[],notes:get(row,'notes')})));
  if(type==='cash')state.cashflow.push(...rows.slice(1).map(row=>({id:uid(),type:get(row,'type')||'Entrada',category:get(row,'category')||'Outros',description:get(row,'description')||'Lançamento importado',amount:num(get(row,'amount')),competenceDate:get(row,'competenceDate')||get(row,'dueDate')||today(),dueDate:get(row,'dueDate')||today(),paidDate:get(row,'paidDate'),status:get(row,'status')||'Pendente',recurrence:get(row,'recurrence')||'Não recorrente',clientId:'',notes:get(row,'notes')})));
  audit('Importar CSV',type,null,{rows:rows.length-1});render();toast(`${rows.length-1} registros importados.`);
 }catch(err){alert(err.message||'Não foi possível importar o CSV.')}};r.readAsText(f,'utf-8');
}
