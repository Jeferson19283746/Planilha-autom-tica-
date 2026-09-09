import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};

function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload))}

async function openAI(question,state){
  if(!process.env.OPENAI_API_KEY)return null;
  const prompt=`Você é o CFO IA da Zahav Digital, uma microempresa brasileira de serviços digitais em fase inicial, sem funcionários. Faça análise gerencial objetiva, sem substituir contador. Responda em português. Dados: ${JSON.stringify(state)}. Pergunta: ${question}`;
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt})});
    if(!r.ok)return null;
    const data=await r.json();
    if(data.output_text)return data.output_text;
    return (data.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||'').filter(Boolean).join('\n')||null;
  }catch{return null}
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,service:'zahav-finance-os',version:'0.4.0'});
  if(url.pathname==='/api/config'&&req.method==='GET')return json(res,200,{supabaseUrl:process.env.SUPABASE_URL||'',supabaseAnonKey:process.env.SUPABASE_ANON_KEY||'',cloudEnabled:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY)});
  if(url.pathname==='/api/ai'&&req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;if(body.length>2_000_000)return json(res,413,{error:'Payload too large'});
    try{const {question,state}=JSON.parse(body||'{}');if(!question||typeof question!=='string')return json(res,400,{error:'Pergunta inválida'});const answer=await openAI(question,state);return json(res,answer?200:503,{answer})}catch{return json(res,400,{error:'JSON inválido'})}
  }
  if(url.pathname.startsWith('/api/'))return json(res,404,{error:'Not found'});
  let requested=url.pathname==='/'?'/index.html':url.pathname;
  try{requested=decodeURIComponent(requested)}catch{return json(res,400,{error:'Bad request'})}
  const safe=path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/,'');
  const file=path.join(__dirname,safe);
  if(!file.startsWith(__dirname))return json(res,403,{error:'Forbidden'});
  try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data)}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found')}
});

const port=Number(process.env.PORT)||3000;
server.listen(port,'0.0.0.0',()=>console.log(`Zahav Finance OS em http://localhost:${port}`));
