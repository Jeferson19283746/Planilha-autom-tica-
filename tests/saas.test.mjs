import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../db/migrations/005_saas_multitenant.sql',import.meta.url),'utf8');
const gate=fs.readFileSync(new URL('../db/migrations/006_saas_access_gate.sql',import.meta.url),'utf8');
const saas=fs.readFileSync(new URL('../js/saas.js',import.meta.url),'utf8');
const pages=fs.readFileSync(new URL('../js/pages-saas.js',import.meta.url),'utf8');

test('bootstrap reserva Super Admin para Jeferson e Zahav Digital',()=>{
  assert.match(migration,/jeferson02oliveira02@gmail\.com/i);
  assert.match(migration,/Zahav Digital/);
  assert.match(migration,/super_admin/);
  assert.match(gate,/claimed_by/);
});

test('modelo SaaS possui planos, assinaturas e memberships',()=>{
  assert.match(migration,/create table if not exists public\.saas_plans/i);
  assert.match(migration,/create table if not exists public\.organization_subscriptions/i);
  assert.match(migration,/create table if not exists public\.organization_memberships/i);
  assert.match(migration,/trialing/);
});

test('acesso financeiro é condicionado a assinatura ativa',()=>{
  assert.match(gate,/has_active_subscription/);
  assert.match(gate,/trialing/);
  assert.match(gate,/suspended/);
});

test('frontend contém conta e painel de super admin',()=>{
  assert.match(pages,/Conta & Plano/);
  assert.match(pages,/Super Admin/);
  assert.match(pages,/MRR SaaS/);
  assert.match(saas,/updateSubscription/);
  assert.match(saas,/updatePlan/);
});
