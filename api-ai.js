// Exemplo de função serverless. Em produção, adapte ao provedor escolhido.
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'OPENAI_API_KEY não configurada'});
  const {question,state}=req.body||{};
  const prompt=`Você é o CFO IA da Zahav Digital, microempresa brasileira de serviços digitais em fase inicial, sem funcionários. Faça análise gerencial objetiva e ressalve validação contábil. Dados: ${JSON.stringify(state)}. Pergunta: ${question}`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt})});
  if(!r.ok) return res.status(502).json({error:'Falha no provedor de IA'});
  const data=await r.json(); const answer=data.output_text||(data.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||'').filter(Boolean).join('\n');
  res.status(200).json({answer});
}
