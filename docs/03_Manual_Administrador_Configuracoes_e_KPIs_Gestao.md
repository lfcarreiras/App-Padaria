---
title: "03 - Manual do Administrador, Parametrizações e Fórmulas de Indicadores do Cockpit de Gestão"
project: "Padaria da Vila (União Panificadora Central Arouquense, Lda)"
version: "2.1.3"
date_saved: 2026-10-12
updated: 2026-10-12
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
**Versão:** `v2.1.3` (12/10/2026)  

---

## 1. Estrutura do Cockpit de Gestão (`/gestao`)

O utilizador com perfil **Administrador** seleciona no login o Cockpit **`Gestão`** (tendo também acesso livre a todos os restantes painéis operacionais e ao filtro global **«Todas as Lojas»**). O Cockpit de Gestão divide-se em **6 Abas de Controlo**:

```mermaid
flowchart LR
    Admin(["🔐 Administrador (/gestao)"]) --> T1["1. 📊 Métricas & KPIs\n(On-Time, Canais, Rankings,\nPlaneado vs Real)"]
    Admin --> T2["2. 🏪 Lojas & 5 Carrinhas\n(Base Fixa 1º-4º Carro\n+ Matriz B2B 5º Carro)"]
    Admin --> T3["3. 🗄️ Base de Dados\n(Catálogo Produtos, Clientes,\nImport Excel & Studio CMS)"]
    Admin --> T4["4. 🛡️ Logs de Auditoria\n(Rastreabilidade Total\nde Operadores)"]
    Admin --> T5["5. 🖨️ Talão Térmico\n(Calibração Epson TM-T20\n80mm / 72mm)"]
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

## 3. Aba 2: Configuração das 3 Lojas, 5 Carrinhas, Base Fixa & Clientes Empresariais B2B (`lojas_carrinhas`)

Esta aba centraliza toda a parametrização logística da *Padaria da Vila*:

### 3.1. Gestão das 3 Lojas Físicas e 5 Carrinhas
- **Lojas Físicas:** Edição de Nome, Código, Morada, Telefone, NIF e estado Ativo/Inativo das 3 lojas (`Padaria da Vila`, `Padaria da Praça`, `Padaria do Liceu`).
- **Frota de 5 Carrinhas:** Edição do Identificador (`1.º Carro` a `5.º Carro`), Matrícula, Loja Base e estado Ativo/Inativo.

### 3.2. Grelha da Base Fixa Diária de Particulares (`1.º ao 4.º Carro`)
- Permite definir e gerir tanto a **lista de artigos** como as **quantidades globais fixas diárias** que cada uma das 4 primeiras carrinhas leva todos os dias para a venda/entrega porta-a-porta a clientes particulares.
- **Funcionalidades de Gestão de Artigos e Extração de Dados (`v2.1.2`):**
  1. **Editar / Corrigir Nome de Artigos (`✏️ Editar` ou clique direto no nome):** Permite corrigir qualquer gralha ou alterar a designação de um artigo (ex.: `"Boroa"` $\rightarrow$ `"Broa"`, `"Triga Milha"` $\rightarrow$ `"Trigo Milho"`, ou selecionar a partir do autocompletar do catálogo), migrando automaticamente todas as quantidades associadas nas 4 carrinhas e na matriz B2B sem perda de dados.
  2. **Eliminar Artigos (`🗑️ Eliminar`):** Permite remover qualquer linha de artigo que deixe de fazer parte da Base Fixa diária.
  3. **Adicionar Novos Artigos:** Permite adicionar artigos selecionando diretamente do catálogo da padaria ou escrevendo um nome personalizado (`+ Adicionar`).
  4. **Extrair Excel Base Fixa (`.xlsx`) e Importar Excel Base Fixa (`.xlsx`/`.xls`/`.csv`):** Tal como na secção B2B, permite extrair com 1 clique toda a tabela da Base Fixa Diária de Clientes Particulares (`Produto_Artigo`, `1º Carro`, `2º Carro`, `3º Carro`, `4º Carro`, `Total_Particulares`) e reimportar folhas Excel atualizadas.
  5. **Impacto Automático:** Todas as alterações (nomes de artigos, adições, eliminações e quantidades) refletem-se imediatamente na **Pool Consolidada do Dia** em `/producao` e no ficheiro Excel **«MAPA DIÁRIO»** em `/entregas`.

### 3.3. Matriz Semanal dos 13 Clientes Empresariais B2B (`5.º Carro`)
- Permite parametrizar as quantidades fixas frequentes entregues pelo **`5.º Carro`** às 13 entidades empresariais/institucionais de Arouca (*Gamarão, Patronato, P.-Telhe, Lar 3.ª Idade, Hospital, Centro D. Urrô, Lar Infância e Juventude, Centro Social Burgo, Cavadinha, Merc. Ribeiro, Café Praça, Padaria da Vila, Empregados*).
- **Funcionalidades de Configuração:**
  1. **Seleção por Dia da Semana (`Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`, `Dom`):** Cada dia da semana pode ter quantidades distintas por cliente e por artigo.
  2. **Botão «Replicar Dia p/ Toda a Semana»:** Copia com 1 clique as quantidades do dia selecionado para todos os restantes dias da semana (`Seg` a `Dom`).
  3. **Adicionar / Editar / Remover Clientes B2B:** Permite criar novos clientes empresariais no 5.º Carro ou editar morada e contacto.
  4. **Exportar Template Excel B2B e Importar Matriz B2B via Excel (`.xlsx`):** Permite descarregar a grelha completa em Excel, preencher as quantidades no computador e fazer upload massivo para atualizar instantaneamente todos os clientes do 5.º Carro.

---

## 4. Aba 3: Base de Dados, Catálogo de Produtos & Importação Massiva (`database`)

1. **Tabela Réplica de Produtos (Sincronizada com Supabase):**
   - Pesquisa em tempo real por nome, filtro por Categoria (`Padaria` / `Pastelaria`), Unidade (`unidade` / `kg`) e Estado (`Ativo` / `Inativo`).
   - **Normalização Automática Title Case (`formatarNomeEntidade`):** Qualquer produto inserido ou importado em maiúsculas (ex.: `"PAO SALOIO"`, `"MINI BROA C/CHOURISSO"`) é automaticamente formatado com acentuação e ortografia canónica portuguesa (*"Pão Saloio"*, *"Mini Broa c/ Chouriço"*).
   - Criação avulsa de novos produtos ou clientes através do botão **`+ Novo Registo na BD`**.
2. **Importação e Exportação Massiva em Excel/CSV:**
   - Suporte a ficheiros `.xlsx`, `.xls` e `.csv` para atualização em lote de **Produtos** ou **Clientes**, com pré-visualização das primeiras linhas antes de confirmar a gravação na base de dados.
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
- **Largura do Papel:** Configurado por defeito para **80mm (72mm de largura útil — Calibrado para Epson M249A TM-T20)**, com suporte alternativo para bobinas de **58mm**.
- **Campos Editáveis:** Nome da Empresa, Slogan / Subtítulo, Morada, Telefone, NIF, Mensagem de Rodapé, Tamanho de Letra (`Compacto`, `Médio`, `Grande`) e interruptores para mostrar/ocultar NIF, Morada, Telefone, Separação Padaria/Pastelaria, Destaque de Notas de Bolo e **QR Code no rodapé (`showQrCode`)**.
- **Suporte Automático a Produção Parcelar (`v2.1.1`):** O talão assinala automaticamente artigos recusados com `[NÃO PROD.]`, exclui-os do somatório de unidades entregues e imprime as `Observações da Produção`.
- **Pré-visualização ao Vivo:** Mostra em tempo real no ecrã como ficará o talão térmico calibrado.

---

## 7. Aba 6: Gestão de Acessos & Permissões RBAC (`acessos`)

Permite ao Administrador gerir toda a equipa e controlar o que cada colaborador pode ver ou editar:
- **Gestão de Utilizadores:** Criar novo colaborador, definir Nome, Email/Username, Palavra-passe, Função (`admin`, `gerente_loja`, `atendente`, `operador_padaria`, `operador_pastelaria`, `motorista`) e estado (`Ativo` / `Inativo`).
- **Matriz de Permissões Granulares por Painel & Route Guard por Cockpit:** Para cada utilizador, define-se individualmente o nível de acesso aos 5 módulos (`Encomendas`, `Produção`, `Loja`, `Entregas`, `Gestão`):
  - **`🚫 Sem Acesso` (`sem_acesso`):** O menu não aparece na barra de navegação e a rota está bloqueada por *Route Guard* automático.
  - **`👁️ Apenas Leitura` (`leitura`):** O utilizador pode consultar o ecrã, mas todos os botões de ação/gravação ficam desativados.
  - **`✏️ Edição Total` (`edicao`):** O utilizador pode executar todas as operações daquele painel.
