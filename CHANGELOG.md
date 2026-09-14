# Changelog - App Gestão de Encomendas & Produção de Padaria (4 Lojas)

Todas as alterações notáveis nesta solução são documentadas e versionadas de forma contínua neste ficheiro.  
O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adere ao [Semantic Versioning (SemVer 2.0.0)](https://semver.org/lang/pt-BR/).

---

## 🧭 Guia Rápido de Retrofit & Rollback

Se qualquer nova versão apresentar instabilidade, quebra de comportamento ou regressão de experiência, utilize este guia para recuar de imediato para uma versão anterior estável:

### 1. Retrofit Local via Git (Inspecionar ou Trabalhar)
```bash
# Inspecionar qualquer versão anterior (ex: v1.2.0):
git checkout tags/v1.2.0

# Criar uma branch de trabalho/hotfix a partir dessa versão anterior:
git checkout -b hotfix-retrofit-v1.2.0 tags/v1.2.0

# Regressar à versão mais recente de produção:
git checkout main
```

### 2. Rollback Instantâneo em Produção (Vercel)
Como o projeto está ligado à Vercel com CI/CD contínuo:
1. Aceda ao dashboard do projeto na **Vercel** > separador **Deployments**.
2. Localize o deployment correspondente à tag/commit pretendido (ex: commit `2a0f409` para a `v1.2.0`).
3. Clique nos três pontos `...` e selecione **Instant Rollback**.
4. Em menos de 5 segundos, a produção volta a servir a versão estável sem necessidade de novo build.

### 3. Reversão Limpa de Commits no Repositório
```bash
# Reverter o último commit mantendo o histórico íntegro:
git revert HEAD --no-edit
git push origin main

# Reverter um commit específico:
git revert <commit_hash> --no-edit
git push origin main
```

### 4. Salvaguardas da Base de Dados (Supabase)
- As tabelas (`encomendas`, `itens_encomenda`, `clientes`, `lojas`, `carrinhas`, `perfis_acesso`) foram estruturadas com compatibilidade retroativa. Campos novos possuem valores `DEFAULT` ou aceitam `NULL`, garantindo que versões anteriores continuem a comunicar com a base de dados sem erros.

---

## [v1.3.1] - 2026-09-13
### 🗑️ Removido (Removed)
- **Remoção de Atalhos de Teste no Login**: Eliminados os botões rápidos de demonstração que constavam no rodapé da página de autenticação, deixando o formulário com um aspeto limpo e seguro para utilização real em produção.

### 🔒 Segurança & Hardening
- Manutenção rigorosa de todos os acessos, credenciais padrão (ex: `admin@padaria.pt` / `admin`, operadores com `123`) e níveis de acesso configurados no painel de administração.

### 🔗 Referência Técnica
- **Commit:** `9d6f825`
- **Tag Git:** `v1.3.1`

---

## [v1.3.0] - 2026-09-13
### 🚀 Adicionado (Added)
- **Ecrã Inicial de Login & Autenticação Obrigatória (`/login`)**: O acesso à raiz ou a qualquer painel operacional exige agora autenticação prévia com identificador (email ou telefone) e palavra-passe.
- **Níveis de Acesso Granulares (3 Estados)**:
  - 🚫 **Sem Acesso** (`sem_acesso`): O menu fica oculto na Navbar e o acesso direto é bloqueado.
  - 👁️ **Apenas Leitura** (`leitura`): O utilizador consulta encomendas, produção, rotas, relatórios e talões, mas todas as ações de gravação e alteração ficam desativadas.
  - ✏️ **Edição Completa** (`edicao`): Permite criar, alterar e concluir tarefas a 100%.
- **Proteção Total de Rotas**:
  - `Navbar` filtra dinamicamente os separadores visíveis consoante as permissões do utilizador autenticado.
  - Apresentação de distintivo `👁️ Leitura` e banner informativo nos ecrãs onde o colaborador tem apenas perfil de consulta.
- **Área de Sessão na Navbar**: Apresentação do nome, função ativa e botão de encerramento de sessão (**Sair / Logout**).

### 🔄 Modificado (Changed)
- Painéis de **Encomendas**, **Produção (KDS)**, **Entrega em Loja**, **Entregas ao Domicílio** e **Gestão** atualizados para desativar botões de submissão, transição de estado e importação quando o perfil é de leitura.

### 🔗 Referência Técnica
- **Commit:** `ccace91`
- **Tag Git:** `v1.3.0`

---

## [v1.2.0] - 2026-09-12
### 🚀 Adicionado (Added)
- **Dashboard de Métricas Temporais Consolidadas**:
  - Filtros temporais: Acumulado ao Ano, Acumulado ao Mês, À Semana e Ao Dia.
  - Filtro combinado por Loja e por Formato de Entrega (Levantamento em Loja vs Entrega ao Domicílio).
- **Gestão de Acessos In-App**:
  - Configuração visual de perfis de utilizador diretamente no painel de Gestão, sem necessidade de aceder ao backoffice do Supabase nem expor URLs técnicos aos colaboradores.
- **Tradução Bilingue Integral**:
  - Cobertura de 100% dos textos da aplicação em Português de Portugal (PT-PT) e Inglês (EN), incluindo cabeçalhos, filtros, botões, modais e mensagens de estado.

### 🔗 Referência Técnica
- **Commit:** `2a0f409`
- **Tag Git:** `v1.2.0`

---

## [v1.1.0] - 2026-09-12
### 🚀 Adicionado (Added)
- **Reestruturação Canónica em 5 Painéis Operacionais**:
  1. `Encomendas` (antigo Balcão e Pedidos).
  2. `Produção` (antigo Cozinha KDS).
  3. `Entrega em Loja` (novo painel para levantamentos ao balcão).
  4. `Entregas ao Domicílio` (antigo Carrinhas e Rotas).
  5. `Gestão` (antigo Gestão e Painel).
- **Alternância Dinâmica de Entrega**: Possibilidade de converter a qualquer momento uma encomenda entre *Levantamento em Loja* e *Entrega ao Domicílio* (e vice-versa).
- **Configurador do Talão Térmico**: Personalização visual e textual do cabeçalho, slogan, NIF, telefone, destaques de bolos e largura de bobina (80mm vs 58mm).
- **Importação e Exportação Massiva Excel/CSV**: Importação com pré-visualização para atualização em lote de clientes e produtos/preços no Supabase.
- **Configuração de Lojas e Carrinhas**: Gestão de dados das 4 lojas e da frota de carrinhas de distribuição no painel de Gestão.

### 🔗 Referência Técnica
- **Commit:** `b4e4aaa`
- **Tag Git:** `v1.1.0`

---

## [v1.0.2] - 2026-09-12
### 🐛 Corrigido (Fixed)
- **Sincronização de Moradas de Entrega**: Resolução de bug em que uma alteração de morada num pedido não atualizava o registo do cliente no Supabase.
- **Edição Direta de Morada na Carrinha**: Adicionado botão de alteração imediata de morada no ecrã de entregas.

### 🔗 Referência Técnica
- **Commit:** `125e479`
- **Tag Git:** `v1.0.2`

---

## [v1.0.1] - 2026-09-12
### 🐛 Corrigido (Fixed)
- **Conexão Real Supabase**: Eliminação de encomendas e clientes dummy; integração exclusiva com os dados reais armazenados na base de dados Supabase.
- **Corte de Talão Térmico**: Ajustes de margens e quebras de linha na impressão térmica de 80mm.

### 🔗 Referência Técnica
- **Commit:** `3727410`
- **Tag Git:** `v1.0.1`

---

## [v1.0.0] - 2026-09-12
### 🚀 Lançamento Inicial (Base Release)
- Plataforma centralizada com operação local interligando 4 lojas de padaria e pastelaria.
- Balcão com registo de pedidos, carrinho tátil e impressão térmica de talões de 80mm.
- Ecrãs KDS de produção com separação de Padaria e Pastelaria e controlo de estados táteis.
- Gestão de rotas de carrinhas com paragens sequenciais e integração GPS Google Maps.

### 🔗 Referência Técnica
- **Commit:** `878df99`
- **Tag Git:** `v1.0.0`
