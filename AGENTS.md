# Inprooval Bulletproof Agent Swarm - Diretrizes Contínuas de Workspace

## 1. Regra Mandatória: Disparo Automático Pós-Commit
Sempre que um `git commit` for realizado (quer internamente pelo Antigravity quer externamente no sistema operativo pelo utilizador via terminal/VS Code), o assistente Antigravity tem a obrigação mandatória de acolher o sinal do hook (`PreInvocation` / `.git/bulletproof_pending_swarm.json`) e acionar o **Inprooval Bulletproof Agent Swarm** para executar a varredura contínua de integridade.

## 2. Protocolo de Auditoria Contínua do Swarm (7 Agentes)
1. **Agente 1 - E2E Journey & Chaos Simulator**:
   - Valida o fluxo operacional ponta a ponta: Cockpit de Loja, KDS de Produção, Cockpit de Carrinhas / Entregas.
   - Garante que a Folha de Produção com filtro "encomendas" lista pedidos loja a loja individualmente.
   - Garante que a Folha de Carga segrega Base Diária, B2B e Domicílios com supressão de entidades a 0 unidades.
2. **Agente 2 - Supabase DBA & Data Integrity**:
   - Valida o schema, queries, tipos TypeScript e normalização canónica de artigos.
3. **Agente 3 - Cybersecurity OWASP Red-Team**:
   - Garante isolamento estrito de cockpits, RBAC e headers de segurança HTTP em `next.config.mjs`.
4. **Agente 4 - RGPD & EU AI Act Compliance**:
   - Garante avisos de privacidade (Art. 13 RGPD) e transparência Human-in-the-Loop (Art. 14 EU AI Act).
5. **Agente 5 - Edge, Offline & Hardware POS Resilience**:
   - Testa a resiliência offline (`localStorage`), sincronização em rede instável e conformidade do talão térmico Epson TM-T20.
6. **Agente 6 - FinOps & Commercial Value Challenger**:
   - Monitoriza a bolsa de horas (110h pool @ 50 €/h, 34,50h consumidas, escalonamento a 150 €/h).
7. **Agente 7 - Living Docs & Deprecation Ledger Guardian**:
   - Rastreia retrofits, ficheiros eliminados e simplificações no **Deprecation Ledger**.
   - Sincroniza em tempo real todos os 6 documentos oficiais em `docs/` (`01` a `06`).

## 3. Conclusão da Auditoria
Após a validação e sincronização documental de cada commit, o assistente deve executar:
```bash
npm run swarm:done
```
Isto arquiva o commit no histórico contínuo de integridade e limpa o sinalizador de auditoria pendente.
