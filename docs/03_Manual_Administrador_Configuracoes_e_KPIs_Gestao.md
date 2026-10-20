---
title: "03 - Manual do Administrador, Parametrizações e Fórmulas de Indicadores do Cockpit de Gestão"
project: "Padaria da Vila (União Panificadora Central Arouquense, Lda)"
version: "2.4.0"
date_saved: 2026-10-18
updated: 2026-10-20
status: "Em Produção (Live)"
tags:
  - #Inprooval/ManualAdmin
  - #Projetos/PadariaDaVila
  - #Gestao/KPIs
  - #Gestao/Configuracoes
---

# 📊 Manual do Administrador: Configurações & Fórmulas de Indicadores do Cockpit de Gestão

**Entidade Tecnológica:** EyeQ Lda / Inprooval®  
**Cliente:** Padaria da Vila (*União Panificadora Central Arouquense, Lda*)  
**Rota de Acesso:** `/gestao` (Exclusivo para Perfil **Administrador / Gerência**)  
**Versão:** `v2.4.0` (20/10/2026)  

---

## 1. Estrutura do Cockpit de Gestão (`/gestao`)

O utilizador com perfil **Administrador** seleciona no login o Cockpit **`Gestão`** (tendo também acesso livre a todos os restantes painéis operacionais e ao filtro global **«Todas as Lojas»**). O Cockpit de Gestão divide-se em **6 Abas de Controlo**:

```mermaid
flowchart LR
    Admin(["🔐 Administrador (/gestao)"]) --> T1["1. 📊 Indicadores\n(On-Time, Canais, Rankings,\nPlaneado vs Real)"]
    Admin --> T2["2. 🏪 Lojas e Rotas\n(8 Rotas Operacionais, Base Diária\n+ Matriz B2B com Login)"]
    Admin --> T3["3. 🗄️ Base de Dados\n(Catálogo 86 Produtos, Clientes,\nImport Excel & Studio CMS)"]
    Admin --> T4["4. 🛡️ Auditoria\n(Rastreabilidade Total\nde Operadores)"]
    Admin --> T5["5. 🖨️ Talão Térmico\n(Calibração Epson TM-T20\n80mm / 68mm Úteis)"]
    Admin --> T6["6. 🔑 Acessos RBAC\n(Utilizadores, Senhas e\nPermissões por Painel)"]
```

---

## 2. Aba 1: Métricas, Indicadores Operacionais (KPIs) & Fórmulas de Cálculo

Todos os indicadores do Cockpit de Gestão são **reativos em tempo real** aos **3 Filtros Globais de Contexto** situados no topo do painel:

1. **Filtro de Loja (`selectedLojaId`):** `Todas as Lojas`, `Loja 1 — Padaria da Vila`, `Loja 2 — Padaria da Praça`, `Loja 3 — Padaria do Liceu`.
2. **Filtro de Formato de Entrega (`formatoEntrega`):** `Todos os Formatos`, `🏪 Levantamento em Loja` (`levantamento_loja`), `🚚 Entrega ao Domicílio` (`entrega_domicilio`).
3. **Filtro Temporal (`periodoSelecionado`):**
   - **Hoje (`dia`):** $D_{\text{agendamento}} = D_{\text{hoje}}$
   - **Semana (`semana`):** $D_{\text{hoje}} - 7\text{ dias} \le D_{\text{agendamento}} \le D_{\text{hoje}}$
   - **Mês (`mes`):** $D_{\text{agendamento}} \ge \text{Dia 1 do Mês Corrente}$
   - **Ano (`ano`):** $D_{\text{agendamento}} \ge \text{1 de Janeiro do Ano Corrente}$
   - **Histórico Completo (`todos`):** Sem restrição de data.

Seja $\mathcal{E}$ o subconjunto de encomendas que satisfaz simultaneamente os 3 filtros ativos. Abaixo detalham-se todos os indicadores e a respetiva **fórmula matemática de cálculo**:

---

### 2.1. Indicadores de Volume e Capacidade Operacional

| Indicador (KPI) | Fórmula Matemática de Cálculo | Significado Operacional e Regra de Negócio |
| :--- | :--- | :--- |
| **1. Volume Total de Encomendas ($N_{\text{total}}$)** | $$N_{\text{total}} = \|\mathcal{E}\|$$ | Número total de encomendas agendadas para o período, loja e formato selecionados. |
| **2. Total de Artigos Encomendados ($Q_{\text{total}}$)** | $$Q_{\text{total}} = \sum_{e \in \mathcal{E}} \sum_{i \in \text{itens}(e)} q_i$$ | Soma de todas as unidades ($q_i$) de produtos de padaria e pastelaria incluídas nas encomendas filtradas. |
| **3. Total de Levantamentos em Loja ($N_{\text{loja}}$)** | $$N_{\text{loja}} = \|\{e \in \mathcal{E} : e.\text{tipo} = \text{'levantamento\_loja'}\}\|$$<br/>$$\%_{\text{loja}} = \frac{N_{\text{loja}}}{N_{\text{total}}} \times 100$$ | Quantidade e peso percentual de pedidos recolhidos diretamente nos balcões das 3 lojas. |
| **4. Total de Entregas ao Domicílio ($N_{\text{dom}}$)** | $$N_{\text{dom}} = \|\{e \in \mathcal{E} : e.\text{tipo} = \text{'entrega\_domicilio'}\}\|$$<br/>$$\%_{\text{dom}} = \frac{N_{\text{dom}}}{N_{\text{total}}} \times 100$$ | Quantidade e peso percentual de pedidos expedidos através da frota de carrinhas. |

---

### 2.2. Indicador de Nível de Serviço e Pontualidade (`% On-Time Delivery`)

Este é o indicador crítico de qualidade de serviço da *Padaria da Vila*, comparando a **Hora Agendada pelo Cliente ($H_{\text{plan}}, M_{\text{plan}}$)** com a **Hora Real de Entrega/Levantamento ($H_{\text{real}}, M_{\text{real}}$)** registada automaticamente quando o balcão (`/loja`) ou o motorista (`/entregas`) conclui a entrega:

1. **Cálculo do Desvio Temporal em Minutos ($\Delta t_e$):**
   $$\Delta t_e = (H_{\text{real}} \times 60 + M_{\text{real}}) - (H_{\text{plan}} \times 60 + M_{\text{plan}})$$
   - Se $\Delta t_e \le 0$: Entregue **antes ou exatamente na hora agendada** (Ex.: `-5 min`).
   - Se $0 < \Delta t_e \le +10$: Entregue **dentro da tolerância operacional de 10 minutos** (considerado **No Prazo / On-Time**).
   - Se $\Delta t_e > +10$: Entregue **Com Atraso** (Ex.: `+18 min`, sinalizado a vermelho na tabela consolidada).

2. **Fórmula da Taxa de Pontualidade (`% On-Time`):**
   Seja $\mathcal{E}_{\text{entregues}} = \{e \in \mathcal{E} : e.\text{estado} = \text{'entregue'}\}$ o conjunto de encomendas já concluídas:
   $$\%\text{ On-Time} = \text{round}\left( \frac{\|\{e \in \mathcal{E}_{\text{entregues}} : \Delta t_e \le +10\text{ min}\}\|}{\|\mathcal{E}_{\text{entregues}}\|} \times 100 \right)$$
   *(Nota: Caso ainda não existam entregas concluídas no filtro selecionado, $\%\text{ On-Time}$ assume o valor base de $100\%$).*

---

### 2.3. Indicadores de Canais de Origem (`canaisOrigemStats`)

Mede a tração de cada canal de entrada de encomendas no período filtrado:

| Canal de Origem | Código Técnico | Fórmula de Contagem e Quota (%) |
| :--- | :--- | :--- |
| **🏪 Presencial (Balcão)** | `presencial` | $$N_{\text{pres}} = \|\{e \in \mathcal{E} : e.\text{canal\_origem} = \text{'presencial'}\}\|, \quad \%_{\text{pres}} = \frac{N_{\text{pres}}}{N_{\text{total}}} \times 100$$ |
| **📞 Telefone / Chamada** | `telefone` | $$N_{\text{tel}} = \|\{e \in \mathcal{E} : e.\text{canal\_origem} = \text{'telefone'}\}\|, \quad \%_{\text{tel}} = \frac{N_{\text{tel}}}{N_{\text{total}}} \times 100$$ |
| **💬 WhatsApp** | `whatsapp` | $$N_{\text{wa}} = \|\{e \in \mathcal{E} : e.\text{canal\_origem} = \text{'whatsapp'}\}\|, \quad \%_{\text{wa}} = \frac{N_{\text{wa}}}{N_{\text{total}}} \times 100$$ |
| **🌐 App Cliente (Online)** | `site_online` | $$N_{\text{online}} = \|\{e \in \mathcal{E} : e.\text{canal\_origem} = \text{'site\_online'}\}\|, \quad \%_{\text{online}} = \frac{N_{\text{online}}}{N_{\text{total}}} \times 100$$ |

---

### 2.4. Rankings Operacionais e Necessidades Consolidadas de Produção

1. **Top 5 Clientes com Mais Encomendas (`topClientes`):**
   - Agrupa as encomendas filtradas por chave única de cliente ($\text{Telefone} \lor \text{Nome}$), soma o número de encomendas realizadas por cada cliente e ordena de forma decrescente, exibindo os 5 primeiros.
2. **Top 5 Artigos Mais Pedidos (`topArtigos`):**
   - Soma as quantidades ($q_i$) por `produto_nome` em todas as encomendas filtradas e ordena de forma decrescente, destacando os 5 produtos de maior rotação e o respetivo setor (`padaria` vs. `pastelaria`).
3. **Necessidades Consolidadas de Produção & Exportação de Folhas de Fabrico Excel:**
   - Agrega todas as quantidades necessárias por artigo e setor.
   - Inclui botões de exportação direta para Excel (`.xlsx`) separados por **Folha de Fabrico — Padaria** e **Folha de Fabrico — Pastelaria**.
4. **Tabela Consolidada «Planeado vs. Real»:**
   - Grelha auditável linha a linha com pesquisa e ordenação por: `Código`, `Cliente`, `Formato`, `Data Planeada`, `Hora Planeada`, `Data Real`, `Hora Real`, `Desvio / Pontualidade` (`No Prazo`, `Com Atraso`, `Pendente`), `Estado` e ações de **Editar** ou **Eliminar** encomenda.

---

## 3. Aba 2: Lojas e Rotas — 8 Rotas Operacionais, Base Diária e Matriz B2B (`lojas_carrinhas`)

Esta aba centraliza toda a parametrização operacional e logística da *Padaria da Vila*:

### 3.1. Gestão das Lojas Físicas e Rotas de Distribuição (Carros 1 a 8)
- **Salvaguarda Comercial do Modelo de Pricing (`v2.4.0`):** A adição livre de lojas físicas ou rotas está restrita na operação diária, travando as cotas contratadas em **3 Lojas Físicas** e **8 Rotas Operacionais**. A expansão de quota fica reservada exclusivamente ao Backoffice mestre de licenciamento.
- **Lojas Físicas (3 Unidades Licenciadas):** Consulta e Edição de Nome, Código, Morada, Telefone e NIF das lojas (`Padaria da Vila I (Praça)`, `Padaria da Vila II (Av. 25 de Abril)` e `Padaria da Vila III (Loja Carocha)`).
- **Rotas de Distribuição — Carros (8 Rotas Licenciadas):**
  - Rotas ordenadas rigorosamente de **1 a 8** (`Rota 1` a `Rota 8`), cada qual associada ao respetivo carro (`Carro 1` a `Carro 8`), matrícula e condutor atribuído.
  - Edição direta de: **Nome da Rota**, **Nome do Carro**, **Nome do Condutor** e **Matrícula**.
  - Atribuição direta de encomendas por **Rota de Entrega** (1 a 8) no formulário e modal de encomendas (`/encomendas`).

### 3.2. Grelha da Base Diária Consolidada por Rota (Rotas 1 a 8)
- **Todas as 8 Rotas com Base Diária:** Qualquer um dos 8 carros pode transportar tanto a Base Diária de particulares como encomendas B2B.
- **Cabeçalhos Normalizados por Rota:** As colunas exibem claramente o **Nome da Rota** (`Rota 1` a `Rota 8`) e a viatura/matrícula associada.
- **Pesquisa em Tempo Real e Ordenação (`v2.4.0`):**
  - **Filtro em Tempo Real por Artigo:** Caixa de pesquisa para localizar instantaneamente qualquer artigo entre os 86 produtos catalogados (ex: `Pão Normal`, `Broa`, `Lanche`, `Centeio`).
  - **Ordenação Dinâmica:** Permite ordenar a grelha por `Artigo (A → Z)`, `Artigo (Z → A)`, `Maior Quantidade` e `Menor Quantidade`.
- **Edição Total e Normalização:** Edição direta de quantidades para os 7 dias (`Seg` a `Dom`), replicação semanal instantânea, adição/remoção de artigos e exportação/importação Excel (.xlsx).

### 3.3. Matriz dos Clientes Empresariais (B2B) & Integração com Login de Clientes
- **Matriz Semanal Multirota (`v2.4.0`):** Parametriza as quantidades fixas diárias contratadas com entidades empresariais/institucionais (*Hospital, Patronato, Centros Sociais, Escolas, Lares, Cafés e Mercearias*), com cada cliente associado à sua respetiva rota operacional (Rotas 1 a 8).
- **Filtros e Pesquisa Integrada B2B:**
  1. **Filtro por Rota:** Seleção de uma rota específica (ex: `Rota 1`, `Rota 5`) ou `Todas as Rotas`.
  2. **Pesquisa por Cliente / NIF / Contacto:** Localização rápida por nome da entidade, NIF, telemóvel ou email.
  3. **Filtro por Artigo Contratual:** Localiza os clientes que consomem determinado produto num dado dia.
  4. **Ordenação de Clientes:** Por Nome (A-Z, Z-A) ou por Volume Total diário (Maior/Menor Volume).
- **Base de Dados Unificada com Logins de Clientes (`v2.4.0`):**
  - O Cockpit de Gestão permite registar o **Nome**, **NIF**, **Telemóvel**, **Email**, **Password**, **Morada** e **Rota**.
  - Esta ficha alimenta diretamente a base de autenticação do portal de clientes (`/encomendar`).
  - **Qualquer cliente empresarial pode iniciar sessão diretamente na app de clientes** ou **efetuar reset à password** de forma autónoma através do seu telemóvel ou email.

---

## 4. Aba 3: Base de Dados, Catálogo de Produtos & Importação Massiva (`database`)

1. **Catálogo de Artigos com Gestão Integrada (`v2.3.4`):**
   - Eliminação do cabeçalho avulso "+ Inserir Registo na Base de Dados" para um design mais limpo e ergonómico.
   - Botão **«+ Novo Artigo»** posicionado diretamente no cabeçalho do Catálogo de Artigos.
   - Pesquisa em tempo real por nome, filtro por Categoria (`Padaria` / `Pastelaria`), Unidade (`unidade` / `kg`) e Estado (`Ativo` / `Inativo`).
   - **Normalização Automática Title Case (`formatarNomeEntidade`):** Qualquer produto inserido ou importado em maiúsculas é automaticamente formatado com ortografia portuguesa e acentuação correta.
2. **Importação e Exportação Massiva em Excel/CSV:**
   - Suporte a ficheiros `.xlsx`, `.xls` e `.csv` para atualização em lote de **Produtos** ou **Clientes**, com pré-visualização antes da confirmação.
3. **Studio CMS Visual Nativo (`/cms`):**
   - Editor visual integrado da solução (`/cms`) para gestão de conteúdos institucionais e textos de interface sincronizados com o GitHub.

---

## 5. Aba 4: Histórico & Logs de Auditoria de Utilizadores (`logs`)

Garante **rastreabilidade total (Accountability)** de todas as operações realizadas na plataforma:
- **4 Indicadores Rápidos de Auditoria (KPIs de Topo):**
  1. `Ações Auditadas` (total de eventos filtrados),
  2. `Ações de Hoje` (operações realizadas no próprio dia),
  3. `Colaboradores Ativos` (número de operadores distintos com atividade registada),
  4. `Entregas Concluídas` (total de encomendas marcadas como entregues no registo).
- **Campos Registados por Evento:** `Data e Hora Exata`, `Código da Encomenda` (clicável para abrir a pré-visualização e impressão do talão térmico), `Nome do Cliente`, `Utilizador (Nome + Role)`, `Painel de Origem` (`encomendas`, `producao`, `loja`, `entregas`, `gestao`), `Ação Executada` e `Detalhes Completos`.
- **Filtros Avançados:** Pesquisa por código de encomenda, cliente, operador específico, perfil/função, painel, tipo de ação e atalhos rápidos (`Todo o Histórico`, `Hoje`, `Ontem`, `Últimos 7 Dias` ou datas personalizadas), com paginação configurável (`25`, `50`, `100` ou `Todos`).

---

## 6. Aba 5: Configurador do Talão Térmico (`talao`)

Permite personalizar o layout do talão impresso nas lojas sem necessidade de intervenção técnica:
- **Configuração Individual por Loja Física (`v2.3.4`):** Seletor de loja física (`Geral (Todas as Lojas)` ou loja específica), permitindo que cada loja tenha o seu próprio cabeçalho comercial, telefone, morada, NIF e mensagem de rodapé, com fallback transparente para a configuração global.
- **Largura do Papel & Calibração Epson TM-T20 (`v2.3.5`):** Configurado por defeito para **bobinas de 80mm com 68mm de largura útil calibrada** (`max-width: 68mm` e `padding: 1.5mm 3.5mm 8mm 2mm`), eliminando qualquer risco de corte mecânico do cabeçalho, hora, badges ou rodapé na margem direita de impressoras térmicas ESC/POS (Epson M249A TM-T20). Suporte alternativo perfeitamente integrado para bobinas de **58mm (48mm úteis)**.
- **Campos Editáveis:** Nome da Empresa, Slogan / Subtítulo, Morada, Telefone, NIF, Mensagem de Rodapé, Tamanho de Letra (`Compacto`, `Médio`, `Grande`) e interruptores para mostrar/ocultar NIF, Morada, Telefone, Separação Padaria/Pastelaria, Destaque de Notas de Bolo e **QR Code no rodapé (`showQrCode`)**.
- **Suporte Automático a Produção Parcelar:** O talão assinala automaticamente artigos recusados com `[NÃO PROD.]`, exclui-os do somatório de unidades entregues e imprime as `Observações da Produção`.
- **Pré-visualização ao Vivo & Teste de Impressão:** Mostra em tempo real no ecrã como ficará o talão térmico calibrado e permite emitir um talão de teste instantâneo.

---

## 7. Aba 6: Gestão de Acessos & Permissões RBAC (`acessos`)

Permite ao Administrador gerir toda a equipa e controlar o que cada colaborador pode ver ou editar:
- **Gestão Total de Utilizadores (`v2.3.4`):** Desbloqueio integral dos botões **«+ Novo Utilizador»**, **«Editar»** e **«Eliminar»** (`🗑️`), permitindo gerir a lista de colaboradores sem restrições.
- **Campos de Utilizador:** Nome, Email/Username, Palavra-passe, Função (`admin`, `gerente_loja`, `atendente`, `operador_padaria`, `operador_pastelaria`, `motorista`) e estado (`Ativo` / `Inativo`).
- **Matriz de Permissões Granulares por Painel & Route Guard por Cockpit:** Para cada utilizador, define-se individualmente o nível de acesso aos 5 módulos (`Encomendas`, `Produção`, `Loja`, `Entregas`, `Gestão`):
  - **`🚫 Sem Acesso` (`sem_acesso`):** O menu não aparece na barra de navegação e a rota está bloqueada por *Route Guard* automático.
  - **`👁️ Apenas Leitura` (`leitura`):** O utilizador pode consultar o ecrã, mas todos os botões de ação/gravação ficam desativados.
  - **`✏️ Edição Total` (`edicao`):** O utilizador pode executar todas as operações daquele painel.
