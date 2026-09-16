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

## [v1.6.0] - 2026-09-16
### 🖨️ Impressão Térmica de Talão sem Páginas Fantasma
- **Zero Páginas em Branco**: Resolução definitiva do bug de 4 páginas na pré-visualização de impressão (3 páginas em branco e recibo na página 4). O componente `ThermalReceipt` passa a ser renderizado via `createPortal` diretamente em `#receipt-print-root` e a regra CSS `@media print` oculta todos os nós irmãos (`body > *:not(#receipt-print-root)`), garantindo uma impressão de exatamente 1 página contínua em rolo de 80mm.

### 🗑️ Gestão de Clientes e Encomendas
- **Eliminação Permanente de Clientes**: Possibilidade de apagar qualquer cliente no modal de edição de clientes.
- **Edição e Eliminação no Histórico de Encomendas**: Modal de edição completa da encomenda e cancelamento/eliminação definitiva na base de dados Supabase.
- **Agrupamento Hierárquico no Histórico**: Organização estruturada em Árvore: Formato de Entrega (Levantamento em Loja vs Entrega ao Domicílio) ➔ Loja / Destino ➔ ordenação cronológica crescente por data e hora. Inclui filtro de calendário por período.

### 🥖 Produção & Fabrico Reestruturados
- **Remoção de Referências a KDS**: Substituição por terminologia tradicional de confeção e fabrico.
- **Visualização Kanban do Dia**: Quadro de 3 colunas (*Por Preparar*, *Em Preparação*, *Pronto / Expedição*) com botões táteis para avançar rapidamente o estado dos pedidos do dia.
- **Visualização Hierárquica por Loja e Horário**: Agrupamento por Formato e Loja com seletor de período por calendário.

### 🚚 Logística de Entregas & Rota Inteligente
- **Pool de Encomendas por Atribuir**: Encomendas do dia sem carrinha alocada ficam reunidas num pool operacional visível e expansível.
- **Drag & Drop Nativo (HTML5)**: Atribuição de encomendas arrastando entre o Pool e as Carrinhas (e vice-versa), com botões rápidos de 1 clique para dispositivos móveis e tablets.
- **Otimizador Automático de Rota**: Botão para reordenar instantaneamente as paragens pela hora combinada e menor percurso.
- **Reordenação Manual pelo Motorista**: O motorista pode arrastar as paragens para redefinir a sequência da rota se necessário.
- **Registo de Timestamp Real de Entrega**: Ao concluir uma entrega, é registada a hora exata da paragem (`hora_entrega_real`).

### ⚙️ Painel de Gestão & Métricas Avançadas
- **Correção dos Botões de Acesso**: Resolvido o erro de precedência de operadores ternários que deixava os seletores de permissão bloqueados em 'Edição'.
- **Predefinições de Padeiro/Pasteleiro**: Ajuste automático para Produção = Edição e restantes painéis = Sem Acesso.
- **Eliminação de Colaboradores, Lojas e Carrinhas**: Botões dedicados com confirmação de segurança nos respetivos modais.
- **Inserção de Registos Avulsos**: Novo assistente com abas (*Cliente*, *Produto*, *Loja*, *Carrinha*) para criar entidades avulsas na base de dados sem necessidade de ficheiro Excel.
- **Métricas & KPIs Operacionais**:
  - Cartão de **Taxa On-Time (%)**: Comparação entre hora planeada e hora real (tolerância de +10 min).
  - Ranking de **Top Clientes** com mais encomendas.
  - Ranking de **Top Artigos** com maiores volumes pedidos.
  - Tabela detalhada de **Detalhe Consolidado de Planeamento vs Real** com seletor de data por calendário.

## [v1.5.0] - 2026-09-14
### 🎨 Identidade Visual & Cabeçalho Desimpedido
- **Branding Atualizado**: Substituição do logótipo e imagem de fundo do login pelos novos ativos de alta qualidade da Inbox do Vault.
- **Header Limpo sem Barras de Scroll**: Removido texto excessivo e eliminado o scroll horizontal na navegação superior. Todas as 5 abas (`Encomendas`, `Produção`, `Balcão`, `Entregas`, `Gestão`) mantêm-se visíveis e diretamente clicáveis em qualquer resolução.

### 📊 Suporte Nativo a Excel (.xlsx / .xls)
- **Importação & Exportação em Formato Excel**: Substituição total de ficheiros CSV por folhas de cálculo Excel nativas.
- **Importação Multi-folha**: Suporte automático para processar ficheiros com várias abas (ex: `Padaria` e `Pastelaria`).
- **Download de Modelos em .xlsx**: Templates de clientes e produtos descarregados diretamente em Excel pronto a editar.

### 🥖 Catálogo Oficial da Padaria da Vila (98 Artigos)
- **Carga Massiva**: Purga das tabelas antigas e inserção dos 98 artigos reais da Padaria da Vila a partir da `Lista Artigos.xls` (41 artigos de Padaria e 57 de Pastelaria), refletidos na base de dados Supabase e nos dados de contingência (`PRODUTOS_MOCK`).

### 📍 Encomendas de Simulação no Concelho de Arouca
- **Cenários Reais de Teste**: 9 encomendas distribuídas entre Hoje (5 encomendas para testar Produção, Balcão e Carrinhas em tempo real), Histórico (3 encomendas em datas anteriores para testar métricas e histórico) e Futuro (1 encomenda para amanhã).
- **Clientes e Moradas em Arouca**: Moradas reais do concelho (Arouca Centro, Santa Eulália, Alvarenga, Mansores, Escariz, Serra da Freita).
- **Pesquisa Rápida de Histórico**: Pesquisa flexível por data, código, cliente ou produto no separador de Histórico de Encomendas.

### 👨‍🍳 Restauração dos Botões Táteis de Produção
- **Fluxo Tátil Restaurado**: Recuperados os botões progressivos de estado de fabrico (`Iniciar Preparo` ➔ `Marcar Pronto` ➔ `✓ Pronto na Bancada` com opção de reversão).

### 🗄️ Organização do Vault
- Ficheiros da Inbox (`Logo_Padaria_da_Vila.jpg`, `Imagem_Padaria_da_Vila.jpg`, `Lista Artigos.xls`) arquivados na pasta `documentos/` do projeto no Vault.

## [v1.4.0] - 2026-09-14
### 🥖 Identidade Visual & Rede Padaria da Vila (Arouca)
- **Branding Oficial**: Integração do logótipo oficial da Padaria da Vila no cabeçalho e imagem de fundo da padaria no ecrã de login (`/login`).
- **4 Lojas em Arouca**: Configuração das lojas Padaria da Vila I (Praça), II (25 de Abril), III (Arouca) e Unidade Central de Fabrico & Sede (Lavandeira).
- **Frota de 3 Carrinhas de Entrega**: Configuração das 3 viaturas com ponto de carga na Unidade Central de Fabrico.

### 🚫 Remoção Total de Preços e Pagamentos (Foco Operacional)
- A aplicação foi convertida para operação logística e de cumprimento: entrega da quantidade certa, no local certo e à hora certa.
- Preços unitários, totais em euros, métodos de pagamento e estados de cobrança foram totalmente removidos de todos os ecrãs operacionais, talões térmicos e métricas de gestão.

### 📱 Integração de Pedidos via WhatsApp
- **Gerador de Modelo Estruturado para Clientes**: Botão para copiar modelo guiado de pedido estruturado.
- **Processador Automático de Mensagens WhatsApp**: Modal no ecrã de encomendas que interpreta texto colado do WhatsApp e auto-preenche o formulário e carrinho.
- **Envio de Confirmação 1-Clique ao Cliente**: Ligação direta `wa.me` com mensagem estruturada de confirmação de encomenda.

### 🚚 Ciclo de Vida da Rota & Navegação Sequencial GPS
- **Ciclo da Rota (`Iniciar Rota` / `Concluir Rota`)**: Registo com carimbo temporal da saída e regresso da viatura à central.
- **Bloqueio Sequencial de Entregas**: Desbloqueio sequencial das paragens (paragem N+1 bloqueada até conclusão da paragem N).
- **Navegação Google Maps Embutida**: Visualizador de mapa integrado diretamente na app sem necessidade de alternar para o GPS externo.

### 📅 Separação Operacional do Turno vs Histórico Global
- **Filtro Estrito do Dia**: Ecrãs operacionais de Produção (`/producao`), Balcão de Loja (`/loja`) e Entregas (`/entregas`) apresentam exclusivamente encomendas do próprio dia.
- **Histórico Completo**: O separador de Histórico em `/encomendas` e o painel de `/admin` permitem consultar e pesquisar pedidos de qualquer data.

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
