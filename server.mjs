import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
async function openAI(question,state){
  if(!process.env.OPENAI_API_KEY) return null;
  const prompt=`Você é o CFO IA da Zahav Digital, uma microempresa brasileira de serviços digitais em fase inicial, sem funcionários. Faça análise gerencial objetiva, sem substituir contador. Responda em português. Dados: ${JSON.stringify(state)}. Pergunta: ${question}`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt})});
  if(!r.ok) return null; const data=await r.json();
  if(data.output_text) return data.output_text;
  return (data.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||'').filter(Boolean).join('\n')||null;
}
const server=http.createServer(async(req,res)=>{
  if(req.url==='/api/ai'&&req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;
    try{const {question,state}=JSON.parse(body||'{}');const answer=await openAI(question,state);res.writeHead(answer?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({answer}));}catch{res.writeHead(400);res.end('{}')}return;
  }
  const requested=req.url==='/'?'/index.html':req.url.split('?')[0]; const safe=path.normalize(requested).replace(/^\.\.(\/|\\|$)/,''); const file=path.join(__dirname,safe);
  try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}
});
const port=process.env.PORT||3000;server.listen(port,()=>console.log(`Zahav Finance OS em http://localhost:${port}`));
