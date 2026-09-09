# Zahav Finance OS

Sistema interno da Zahav Digital para custos, precificação, cenários e análise financeira.

## Módulos
- Dashboard executivo
- Custos fixos e variáveis
- Produtos e precificação automatizada
- Estimativa de Simples (Anexos III/V) e Fator R
- Cenários e ponto de equilíbrio
- CFO IA com fallback local
- Backup/restore em JSON

## Executar
```bash
npm start
```
Abra `http://localhost:3000`.

## IA opcional
Defina `OPENAI_API_KEY` no ambiente do servidor. Opcionalmente, `OPENAI_MODEL`.
Sem chave, o sistema continua funcional com o motor de análise local.

## Observação fiscal
As rotinas são estimativas gerenciais e não substituem PGDAS-D, contador ou validação de CNAE/código de serviço.
