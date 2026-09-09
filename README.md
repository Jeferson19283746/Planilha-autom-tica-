# Zahav Finance OS v4

Sistema interno da **Zahav Digital** para controlar custos, precificar serviços, acompanhar clientes, caixa, DRE, metas e decisões financeiras.

## O que está pronto

- Dashboard executivo e score de saúde financeira
- Custos fixos/variáveis com peso na operação e receita
- Produtos e precificação: piso de caixa, preço mínimo, preço sustentável e margem
- Histórico de versões de preço
- Clientes com plano/produtos, MRR, custo direto e margem individual
- Planos/combos com desconto, custo, horas, lucro e margem
- Fluxo de caixa realizado + projeção de 90 dias e recorrências
- DRE gerencial e fechamentos mensais
- Indicadores: MRR, ticket, CAC, LTV, churn, payback, concentração, break-even e capacidade
- Cenários e metas mensais/anuais
- Simples Nacional: Anexos III/V configuráveis e Fator R
- Alertas automáticos e auditoria
- CFO IA local, com integração OpenAI opcional no backend
- Backup JSON e importação/exportação CSV
- Modo local offline-first
- Sincronização Supabase preparada com autenticação e isolamento por organização

## Executar

```bash
npm start
```

Abra `http://localhost:3000`.

## Validar

```bash
npm run check
npm test
```

O GitHub Actions também executa sintaxe, testes e smoke test a cada push na `main`.

## Nuvem opcional

O sistema funciona integralmente em `localStorage` sem banco. Para ativar login/sincronização configure no ambiente do servidor:

```bash
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Aplique no banco o schema inicial e/ou as migrações em `db/migrations/`. A v4 adiciona campos de CAC, retenção, capacidade, saldo inicial e vínculo de cliente com plano.

## CFO IA opcional

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

Sem chave, o CFO IA continua funcionando com o motor determinístico local.

## Segurança

- Chaves não ficam hardcoded no frontend.
- A sessão Supabase usa token do usuário e RLS por organização.
- A aplicação local continua funcional mesmo sem nuvem.
- Dados críticos registram auditoria.

## Observação fiscal

As rotinas de Simples, Fator R, impostos e precificação são **estimativas gerenciais**. CNAE, código de serviço, anexo, pró-labore e apuração oficial devem ser validados com contador/contabilidade.
