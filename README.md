# Zahav Finance OS

Sistema interno da Zahav Digital para gestão financeira, custos, precificação, clientes, planos, fluxo de caixa, DRE, metas, cenários, auditoria e CFO IA.

## Estado atual
- Operação local funcional com persistência no navegador e backup JSON.
- Banco Supabase do projeto Lovable preparado com isolamento por organização e RLS.
- CI valida sintaxe e smoke test do servidor.
- Hospedagem final prevista no Lovable; GitHub é a fonte principal do desenvolvimento.

## Módulos
- Dashboard executivo e alertas
- Custos fixos/variáveis e peso percentual
- Produtos e precificação automatizada
- Estimativa Simples / Fator R
- Clientes e margem por cliente
- Planos/combos e margem do pacote
- Fluxo de caixa previsto e realizado
- DRE e fechamento mensal
- Cenários salvos
- Metas mensais
- Auditoria local
- CFO IA com fallback determinístico e endpoint OpenAI opcional
- Backup/importação JSON

## Executar
```bash
npm start
```
Abra `http://localhost:3000`.

## IA opcional
Defina `OPENAI_API_KEY` no servidor. Sem chave, o CFO continua funcionando com o motor local.

## Fiscal
Os cálculos tributários são gerenciais. CNAE, código de serviço, Anexo e Fator R devem ser validados pela contabilidade.
