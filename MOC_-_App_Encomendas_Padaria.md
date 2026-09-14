---
title: "MOC - App Gestão de Encomendas, Produção (KDS) & Carrinhas"
type: moc
tags:
  - #Projetos/Padaria
  - #Software/NextJS
  - #Operacoes/KDS
  - #Obsidian/MOC
  - #Solucoes/Versionamento
date_saved: 2026-09-14
updated: 2026-09-14
---

# 🥖 MOC - App Gestão de Encomendas & Produção de Padaria (4 Lojas)

> Plataforma centralizada com operação local para rede de **4 Lojas de Padaria e Pastelaria Interligadas**, integrando receção de encomendas ao balcão, ecrãs KDS de fabrico (padaria/pastelaria), gestão de levantamentos em loja, rotas GPS para carrinhas de entrega ao domicílio e painel executivo de gestão.

---

## 🏛️ 1. Arquitetura da Solução & Stack Tecnológica

| Componente | Tecnologia / Serviço | Descrição |
| :--- | :--- | :--- |
| **Frontend & Backend** | **Next.js 14 (App Router) + React + TypeScript** | Interface reativa, responsiva para tablets/POS e mobile |
| **Estilos & UI** | **Tailwind CSS + Lucide Icons** | Design temático de padaria/pastelaria, tátil e ergonómico |
| **Base de Dados & Realtime** | **Supabase (PostgreSQL Cloud)** | Tabelas relacionais, persistência na nuvem e sync |
| **Hosting & CI/CD** | **Vercel** | Deploys automáticos a cada push na `main`, com Instant Rollback |
| **Impressão** | **Thermal Receipt (CSS Paged Media)** | Suporte a impressoras térmicas ESC/POS de 80mm e 58mm |
| **Internacionalização** | **LanguageProvider (Contexto React)** | Suporte completo bilingue: 🇵🇹 Português (PT-PT) e 🇬🇧 English |

---

## 🖥️ 2. Os 5 Painéis Operacionais

1. **📦 Encomendas (`/encomendas`)**:
   - Criação rápida de pedidos ao balcão com carrinho dinâmico, notas de personalização de bolos e cálculo automático de totais.
   - Gestão integrada de clientes com pesquisa instantânea e edição direta.
2. **👨‍🍳 Produção (`/producao`)**:
   - Ecrã KDS de cozinha dividido por abas setoriais (**Padaria** vs **Pastelaria**).
   - Botões táteis de transição de estado (*Pendente*, *Em Preparo*, *Pronto*).
3. **🏪 Entrega em Loja (`/loja`)**:
   - Gestão de levantamentos ao balcão, reimpressão de talão e conversão rápida para entrega ao domicílio.
4. **🚚 Entregas ao Domicílio (`/entregas`)**:
   - Gestão de rotas da frota de carrinhas de distribuição, integração direta com GPS Google Maps e conversão para recolha em loja.
5. **📊 Gestão (`/admin`)**:
   - Dashboard de métricas consolidadas por período (Ano, Mês, Semana, Dia) e formato de entrega.
   - Configurador de talões térmicos (slogans, NIF, dimensões de bobina).
   - Gestão de lojas e carrinhas.
   - Importação e exportação massiva em Excel/CSV.
   - Gestão granular de acessos e palavras-passe por utilizador.

---

## 🏷️ 3. Histórico de Versões & Tags Git (SemVer)

O projeto adere estritamente à [[solutions_versioning_and_retrofit|Diretiva de Versionamento Contínuo e Retrofit]].  
Consulte o histórico detalhado em `[[CHANGELOG]]`.

| Versão | Tag Git | Commit | Data | Marco Funcional Principal |
| :--- | :--- | :--- | :--- | :--- |
| **v1.3.1** | `v1.3.1` | `9d6f825` | 2026-09-13 | Remoção dos atalhos de teste no login e hardening para produção limpa |
| **v1.3.0** | `v1.3.0` | `ccace91` | 2026-09-13 | Ecrã de login inicial, 3 níveis de acesso (Sem Acesso/Leitura/Edição) e proteção total |
| **v1.2.0** | `v1.2.0` | `2a0f409` | 2026-09-12 | Métricas temporais (Ano/Mês/Semana/Dia), bilingue integral e gestão de acessos in-app |
| **v1.1.0** | `v1.1.0` | `b4e4aaa` | 2026-09-12 | 5 painéis, entrega em loja, alternância de entrega, talão, lojas/carrinhas e Excel |
| **v1.0.2** | `v1.0.2` | `125e479` | 2026-09-12 | Sincronização em tempo real de moradas de clientes nas entregas |
| **v1.0.1** | `v1.0.1` | `3727410` | 2026-09-12 | Conexão real Supabase, eliminação de dados dummy e ajuste de talão |
| **v1.0.0** | `v1.0.0` | `878df99` | 2026-09-12 | Solução base integrada (4 lojas, Balcão, KDS e Carrinhas GPS) |

---

## 🔄 4. Playbook de Retrofit & Rollback

Caso seja necessário reverter uma versão mais recente:

1. **Retrofit Local via Git**:
   ```bash
   git checkout tags/v1.2.0                    # Inspecionar versão estável
   git checkout -b hotfix-v1.2.0 tags/v1.2.0  # Criar branch a partir da tag
   ```
2. **Rollback na Vercel**:
   - Aceder ao painel da Vercel > **Deployments** > selecionar o commit da versão pretendida > **Instant Rollback**.
3. **Reversão de Commits**:
   ```bash
   git revert HEAD --no-edit && git push origin main
   ```

---

## 🔗 Ligações no Cofre (Zero-Orphan Policy)
* [[MOC_-_Índice_Geral_do_Cofre|🗺️ MOC - Índice Geral do Cofre]]
* [[MOC_-_Engenharia_de_Processos,_IA_&_Automação|⚙️ MOC - Engenharia de Processos, IA & Automação]]
* [[solutions_versioning_and_retrofit|🏷️ Diretiva de Governação: Versionamento Semântico, CHANGELOG & Retrofit]]
* [[Modelo de Governação e Operação de IA do Vault|🏛️ Modelo de Governação & Operação de IA do Vault]]
