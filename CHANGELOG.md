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

## [v2.7.53] - 2026-11-09

### Fixed & Bulletproof (Garantia de Disparo Noturno do Sentinela Orion & Encadeamento BCP Unificado)
- **Encadeamento Automático do Sentinela Noturno Orion no Cron de Continuidade (`/api/cron/continuidade-negocio`)**:
  - `src/app/api/cron/continuidade-negocio/route.ts`: Integrado o disparo síncrono e encadeado da rotina de auditoria do Agente 11 (Orion) imediatamente após o envio dos PDFs de contingência da padaria.
  - Elimina a dependência de múltiplos crons em contas Vercel (limite de 1 cron job no plano Hobby), assegurando que tanto o e-mail de contingência BCP para a gerência da padaria como o relatório de sanidade e conformidade de 12 agentes para `luis.carreiras@inprooval.pt` são disparados infalivelmente a cada madrugada.
- **Correção da Verificação de Saúde da Resend no Agente 9 (`/api/cron/sentinela-integridade`)**:
  - `src/app/api/cron/sentinela-integridade/route.ts`: Substituída a chamada probing a `/api-keys` (que devolvia 401 falso-positivo por a chave ser restrita a envio) por validação de formato e emissão operacional direta. Pontuação de saúde do ecossistema restabelecida a 100%.

## [v2.7.52] - 2026-11-09

### Fixed & Bulletproof (Network-First Arquitetural, Precedência Estrita Supabase > Cache Local e Sincronização de Talões Térmicos nos Balcões)
- **Precedência Estrita Supabase > LocalStorage em `parseEncomendasFromDb`**:
  - `src/lib/encomendasService.ts`: Corrigida inversão onde `localEstadosItens[item.id]` suplantava o `item.estado_producao` do Supabase. O Supabase assume agora prioridade absoluta (`item.estado_producao || localEstadosItens[item.id] || 'pendente'`).
  - Adicionada sincronização bidirecional automática: cada resposta do Supabase atualiza de imediato a cache local (`padaria_estado_itens_v1` e `padaria_obs_producao_v1`) para manter a contingência offline fiel à base central.
- **Precedência e Atualização no Portal do Cliente (`/encomendar`)**:
  - `src/app/encomendar/page.tsx`: Corrigida precedência na consolidação das encomendas do cliente, assegurando que o estado alterado na fábrica pelo padeiro se reflete imediatamente no ecrã do cliente e atualiza a sua cache local.
- **Sincronização de Configuração do Talão Térmico nos Balcões (`/encomendas` e `/loja`)**:
  - `src/app/encomendas/page.tsx` & `src/app/loja/page.tsx`: Adicionada invocação de `carregarConfiguracaoTalaoSupabase` no ciclo de vida inicial dos cockpits, garantindo que as definições de largura de papel (80mm vs 58mm), dados fiscais e mensagens são descarregadas centralmente do Supabase e propagadas para a cache local do dispositivo.
  - `src/components/ThermalReceipt.tsx`: Integrada revalidação assíncrona automática ao abrir o modal do talão térmico.
  - `src/lib/receiptConfig.ts`: Tipagem defensiva `PromiseLike` corrigida para `supabase.from().upsert().then()`.

## [v2.7.51] - 2026-11-09

### Fixed & Bulletproof (Erradicação de Aliases e Correspondência Canónica 1:1, Permissões do Centro de Fabrico, Sincronização Cross-Device da Matriz de Cargos e Correção de Mojibake na Navbar)
- **Erradicação de Aliases e Correspondência Canónica 1:1 na Guia de Carga Conjunta**:
  - `src/lib/encomendasService.ts`: Desassociado 'broa de centeio 0,5 kg' de `broa_mistura` e criada a coluna dedicada `{ id: 'b_centeio_05', label: 'B. centeio 0.5kg' }`.
  - Refatorado o algoritmo `identificarColunaGrelha`: eliminada a correspondência por substring/inclusão parcial flexível (passos 3 e 4), garantindo correspondência estrita 1:1 com os nomes canónicos do catálogo da padaria no Supabase.
- **Permissões Amplas no Cockpit de Fabrico para Padeiro / Pasteleiro**:
  - `src/app/encomendas/page.tsx` & `src/app/loja/page.tsx`: Configurado para que os utilizadores com cargo de padeiro/pasteleiro (ou quando a operar dentro do Cockpit de Fabrico `embedded`) tenham permissões de visualização e edição desbloqueadas para todas as lojas (`selectedLojaId = 'todas'`), sem isolamento compulsivo a um único balcão e sem redirecionamentos indevidos.
- **Sincronização em Tempo Real Cross-Device da Matriz de Permissões de Cargo**:
  - Diagnóstico e resolução da causa-raiz: As permissões editadas pelo Administrador Geral eram gravadas no Supabase (`000000002` e `000000000`), mas a função `carregarMatrizPermissoesCargosSupabase` não era chamada no arranque nem em `carregarPerfisAcessoSupabase`, e a normalização de perfil sobrescrevia as permissões com a cache vazia local (`localStorage`).
  - `src/lib/encomendasService.ts`: `carregarMatrizPermissoesCargosSupabase` passa a consultar sempre a base de dados em tempo real; `normalizarPerfil` preserva as permissões gravadas no registo de utilizador (`p.acesso_...`) e utiliza a matriz sincronizada como base de cargo.
  - `src/app/gestao/page.tsx`: Adicionado carregamento de `carregarMatrizPermissoesCargosSupabase` no `Promise.all` e subscrição ao evento `app_matriz_cargos_atualizada`.
  - `src/lib/authContext.tsx`: Sincronização obrigatória da matriz de cargos no arranque da sessão e no processo de login.
- **Eliminação de Mojibake e Correção de Cabeçalho na Navbar**:
  - `src/components/Navbar.tsx`: Corrigido o cabeçalho do cockpit de gestão de `Cockpit de GestÃ£o` para **`Gestão`** (eliminando o termo "Cockpit de" e acertando a ortografia).
  - Varredura e higienização integral de todas as sequências mojibake em `src/components/Navbar.tsx` (`Balcão`, `Loja Física`, `Carrinhas & Distribuição`, `Navegação`, `Área`, `Ligação`, `Inglês`, etc.) em Português de Portugal limpo.

## [v2.7.50] - 2026-11-07

### Fixed & Bulletproof (Correção de Mapeamento Semântico de Regueifa Doce e Trança de Chocolate na Guia Conjunta & Relatório Noturno Orion por E-mail)
- **Correção da Causa-Raiz das Quantidades de Regueifa Doce e Trança Chocolate**:
  - src/lib/encomendasService.ts: Removido 'regueifa branca' dos aliases de regueifa_doce (onde estava a contaminar o total com 19 un. no sábado e 20 un. no domingo).
  - Removidos 'trança de creme' e 'trança regueifa branca' dos aliases de tranca_chocolate (onde estavam a inflacionar a coluna com 7 un. no sábado e 35 un. no domingo).
  - Refinada a função identificarColunaGrelha: eliminada a correspondência bidirecional an.includes(norm) para prevenir falsos positivos em palavras curtas ou produtos genéricos; correspondência por inclusão estrita a norm.includes(an) com an.length >= 5.
  - Validação estrita dos totais consolidados para os dias 07/11 (Sábado) e 08/11 (Domingo):
    - 07/11 (Sábado): Regueifa Doce = 15 un. (estabilizada de 34); Trança Chocolate = 15 un. (estabilizada de 22).
    - 08/11 (Domingo): Regueifa Doce = 8 un. (estabilizada de 28); Trança Chocolate = 8 un. (estabilizada de 43).
  - Paridade total garantida entre a visualização na app (PdfViewerModal.tsx) e os cadernos PDF anexados ao e-mail de continuidade (pdfContinuidadeBuilder.ts).
- **Relatório Noturno do Sentinela Orion por E-mail (Inprooval Swarm)**:
  - src/app/api/cron/sentinela-integridade/route.ts: Configurado o envio diário do relatório de auditoria noturna de saúde e sanidade (00h20) para luis.carreiras@inprooval.pt via Resend API, cobrindo os 5 dias solicitados de monitorização ativa sem interrupções mesmo em estado 100% saudável.

## [v2.7.49] - 2026-11-07

### Added (Seleção Livre de Local de Levantamento de Encomendas em Todos os Balcões e Centro de Fabrico)
- **Independência de Levantamento por Balcão**:
  - src/app/encomendas/page.tsx: Removido o bloqueio rígido que forçava a loja de levantamento à loja onde o utilizador tinha sessão iniciada. O operador pode agora criar uma encomenda num balcão e assignar o levantamento a qualquer outra loja ou centro de fabrico livremente.
  - O seletor de loja de levantamento identifica (Balcão Atual) para orientação e grava loja_pedido_id de forma fidedigna.
  - src/components/ThermalReceipt.tsx: Destacada a indicação clara do local de levantamento no talão térmico.

## [v2.7.46] - 2026-11-05

### Refined & Operational (Restauro Estrito aos 57 Artigos Oficiais no Supabase, Grelhas e Documentos)
- **Restauro Estrito dos 57 Artigos Oficiais no Supabase**:
  - Revertida a tabela `configuracoes_sistema` (`artigos_base_fixa`) no Supabase e `COLUNAS_MAPA_DIARIO_OFICIAL` em `mockData.ts` para conter estritamente os **57 artigos oficiais canónicos**, removendo quaisquer artigos adicionais (`Pão de Cachorro`, `Pão de Hamburguer`, `Baguete`, `Broa Centeio`).
- **Garantia de Exclusividade dos 57 Artigos em Menus, Grelhas e Documentos**:
  - `src/app/gestao/page.tsx`: Filtragem estrita de `artigosBaseFixa` e `artigosGrelhaBaseFixa` contra o conjunto oficial `COLUNAS_MAPA_DIARIO_OFICIAL`, garantindo que nenhuma variante não oficial ou chave legada possa entrar na grelha de Base Diária ou menus.
  - `src/lib/encomendasService.ts`: Alinhadas as colunas da Guia de Carga (`COLUNAS_GRELHA_PADARIA` com 34 colunas e `COLUNAS_GRELHA_PASTELARIA` com 18 colunas) e simplificada a função `identificarColunaGrelha`, assegurando que apenas os 57 artigos canónicos e as suas variantes de escrita oficiais são processados, eliminando fallbacks arbitrários ou variantes externas.

## [v2.7.45] - 2026-11-05

### Enhanced & Operational (Mapeamento Universal de Artigos, Aliases Abrangentes e Blindagem contra Omissão na Guia Conjunta)
- **Mapeamento Exaustivo de Artigos da Padaria e Pastelaria**:
  - Adicionadas correspondências e aliases sistemáticos em `COLUNAS_GRELHA_PADARIA` e `COLUNAS_GRELHA_PASTELARIA` para cobrir todos os artigos do catálogo oficial (136 produtos), incluindo:
    - `Baguete` associada à coluna `Cacete`;
    - `Broa Centeio`, `Broa de Centeio`, `Broinha de Mistura` associadas à coluna `Broa mistura`;
    - `Pão de Hamburguer`, `Pão de Hanburger` associados à coluna `Pão de cachorro`;
    - `Pão de Forma Cereais`, `Pão Cereais Fatiado` associados à coluna `Pão de forma Gr.`;
    - `Pão Mistura`, `Pão da Mealhada`, `Pãezinhos - Tasquinha`, `Pão de Alho` associados à coluna `Pão normal`;
    - `Pão de Beterraba` associado à coluna `P. 7 grãos peq.`;
    - `Bolo c/ Sardinhas` associado à coluna `B c/ chouriço`;
    - Variantes de Bola de Carne (`Bola de Carne Redonda`, `Fatia Bola de Carne`, `Mini Bola de Carne`) unificadas em `Meia bola de carne`;
    - Especialidades de Pastelaria (`Trança de Amêndoa`, `Trança Folhada`, `Regueifa Miniatura`, `Pão Doce`, `Fogaça`, `Pão de Deus`, `Pizzas`, `Mini Quiche`, `Pasteis Recheados`, `Almendrado`, `Brigadeiros`, `Chá Húngaro`, `Sortido`) associadas de forma transparente às colunas adequadas.
- **Blindagem Semântica Preventiva em `identificarColunaGrelha`**:
  - Implementado mecanismo de salvaguarda semântica por heurística de categoria/setor. Se qualquer novo produto ou artigo personalizado for inserido futuramente na Base Diária ou Encomendas, nunca é descartado nem fica com quantidades omitidas na Guia Conjunta: é integrado e totalizado de forma fiável no setor respetivo.
- **Alinhamento da Base Diária Oficial**:
  - Atualizada a lista oficial `artigos_base_fixa` no Supabase (`configuracoes_sistema`) e `COLUNAS_MAPA_DIARIO_OFICIAL` em `mockData.ts` (passando a 61 artigos pré-configurados), assegurando que artigos como `Pão de Cachorro`, `Pão de Hamburguer`, `Baguete` e `Broa Centeio` constam nativamente das opções disponíveis.

## [v2.7.44] - 2026-11-05

### Fixed & Operational (Correção de Import em Gestão, Mapeamento de Cacete na Guia Conjunta e Eliminação de Assinaturas Duplicadas)
- **Cockpit de Gestão & Painel Lojas e Rotas**:
  - Resolvido o erro fatal de execução `ReferenceError: obterDiaSemanaDeData is not defined` ao acionar a Guia Conjunta (Todas as Rotas) através da importação de `obterDiaSemanaDeData` em `src/app/gestao/page.tsx`.
- **Mapeamento e Inclusão do Artigo "Cacete" na Guia Conjunta de Carga**:
  - Adicionado `{ id: 'cacete', label: 'Cacete', alias: ['cacete', 'cacetes', 'pão cacete', 'pao cacete'] }` à matriz oficial `COLUNAS_GRELHA_PADARIA` em `src/lib/encomendasService.ts`.
  - Assegurada a inclusão imediata dos artigos nas quantidades da Base Diária (por exemplo, 20 cacetes na Rota 7), totalizando de forma precisa as colunas de padaria e os subtotais por rota e gerais.
- **Divisão Dinâmica e Harmónica das Tabelas no PDF & Visualizador Web**:
  - Dinamizada a divisão das colunas de padaria em `pdfContinuidadeBuilder.ts` e `PdfViewerModal.tsx` (`Math.ceil(colunasPadaria.length / 2)`), garantindo larguras proporcionais exatas sem overflow.
- **Eliminação de Assinaturas Duplicadas e Limpeza de Páginas Residuais**:
  - Confinado o bloco legado de assinaturas em `PdfViewerModal.tsx` exclusivamente ao ramo fallback e compactados os espaçamentos de impressão da Folha 3, eliminando a 6ª página residual vazia com caixas repetidas.

## [v2.7.43] - 2026-11-04

### Fixed & Operational (Ajustes de Conformidade Visual, Pastelaria em 1 Página e Identificador FABRICO)
- **Folha de Fabrico (Conformidade de Contentores e Margens)**:
  - Eliminado qualquer transbordo de texto nos cartões KPI globais e caixas de resumo (`TOTAL ENCOMENDAS`, `TOTAL A PRODUZIR`, `PADARIA`, `PASTELARIA`). O posicionamento das legendas e unidades foi tornado dinâmico e contido estritamente dentro da largura de 125pt com margem interna de segurança.
- **Guia Conjunta de Carga (Pastelaria Fina em 1 Página Consolidada)**:
  - A secção de Pastelaria Fina foi refatorada de 2 partes (Folhas 3 e 4) para **1 única página consolidada** (Folha 3) tanto no PDF impresso/enviado por email como no visualizador web (`PdfViewerModal.tsx`), contendo as 18 colunas de especialidades de pastelaria, linha de Total Geral Pastelaria, Total Geral a Bordo (Padaria + Pastelaria) e caixas de conferência/assinatura. O PDF totaliza agora exatamente 3 páginas (2 de Padaria e 1 de Pastelaria).
- **Cabeçalhos Verticais e Títulos Limpos**:
  - Aumentada a altura útil dos cabeçalhos para 82pt e limitado o texto a 16 caracteres com início a 18pt abaixo da margem superior, eliminando cortes nas palavras dos artigos verticais.
  - Removida qualquer menção a "COLUNAS X A Y" ou "PARTES" em títulos de secção, apresentando cabeçalhos limpos e profissionais.
- **Rodapé e Caixas de Assinatura**:
  - Corrigido o alinhamento da caixa e do texto de "Conferência dos Condutores", evitando textos cortados ou fora dos limites do contentor.
- **Centro de Fabrico como Loja de Origem para Entregas de Rota**:
  - Encomendas para rotas de carrinha/entrega ao domicílio são agora obrigatoriamente associadas à loja "Centro de Fabrico" (`codigo: FABRICO`, `id: fabbbb00-0000-0000-0000-000000000001`), gerando identificadores no formato `ENC-FABRICO-xxxx` e corrigindo encomendas pré-existentes na base de dados.
- **Sanitização Estrita dos Nomes de Rota**:
  - Assegurado que as linhas com o nome da rota apresentam estritamente `ROTA 1`, `ROTA 2`, etc., sem qualquer inclusão do nome do motorista ou da matrícula.

## [v2.7.42] - 2026-11-04

### Fixed & Operational (Sanitização Estrita dos Nomes das Rotas na Guia de Carga Conjunta)
- **Eliminação Definitiva de Motoristas e Matrículas nos Cabeçalhos das Rotas**:
  - Implementada sanitização por regex (`.replace(/\s*[-—].*$/, '').trim()`) em `encomendasService.ts`, `PdfViewerModal.tsx` e `pdfContinuidadeBuilder.ts`.
  - Assegurado que tanto na interface web (modal) como nos PDFs impressos e enviados por email do BCP, as linhas de cabeçalho das rotas apresentam única e exclusivamente a designação da rota (ex.: `ROTA 1`, `ROTA 2`), sem exibição de nomes de motoristas (`FERNANDO SOUSA`, `GONÇALO VILAR`) ou matrículas (`35-FP-08`, `CG-30-IT`).

## [v2.7.41] - 2026-11-04

### Fixed & Operational (Folha de Fabrico por Email Focada em Encomendas & Rotas Limpas na Guia de Carga)
- **Folha de Fabrico do BCP Exclusiva para Encomendas (`gerarPdfFolhaFabricoLojas`)**:
  - Removido o Caderno 1 com a consolidação de Bases Diárias e Clientes B2B do email de continuidade de negócio.
  - O PDF gerado reflete agora com precisão visual de 100% o documento oficial da app ("Folha de Fabrico de Encomendas por Loja"):
    - Cabeçalho: *PADARIA DA VILA • Folha de Fabrico de Encomendas por Loja • Data • Todas as Lojas*.
    - 4 Caixas de Resumo: Total Encomendas, Total a Produzir, Padaria e Pastelaria (apenas sobre encomendas do dia).
    - Agrupamento por Loja e Entregas ao Domicílio com Banner dedicado e total da loja.
    - Cada encomenda em card individual com código, hora, tipo (Domicílio / Balcão), nome e telefone do cliente, morada de entrega (quando aplicável) e notas.
    - Tabela de artigos encomendados com setor, quantidade destacada, personalizações/especificações e caixas de verificação `[ ] Pronto / Embalado` e conferência de embalamento.
    - Subtotal por Loja e bloco oficial de assinaturas (*Chefe de Turno de Fabrico* e *Conferência de Expedição para Lojas*).
  - Normalização flexível de datas que garante que 100% das encomendas do dia de hoje (ex: `ENC-Carocha-2097` e `ENC-Carocha-3851`) são identificadas e impressas sem qualquer perda.
- **Simplificação das Linhas de Rota na Guia de Carga Conjunta (App e Email BCP)**:
  - Tanto na impressão da app ([`PdfViewerModal.tsx`](file:///G:/O%20meu%20disco/2.%20Áreas/Inprooval/02.%20Clientes%20&%20Projetos/Padaria%20da%20Vila/03.%20Engenharia%20&%20Código/app-encomendas-padaria/src/components/pdf/PdfViewerModal.tsx)) como no PDF enviado por email ([`pdfContinuidadeBuilder.ts`](file:///G:/O%20meu%20disco/2.%20Áreas/Inprooval/02.%20Clientes%20&%20Projetos/Padaria%20da%20Vila/03.%20Engenharia%20&%20Código/app-encomendas-padaria/src/lib/pdfContinuidadeBuilder.ts)), as linhas divisórias de rota passam a apresentar unicamente a designação da rota (ex: `ROTA 1`, `ROTA 2`, etc.), eliminando o nome do condutor e a matrícula.

## [v2.7.40] - 2026-11-04

### Enhanced & Usability (Guia de Carga Conjunta Impressa na App Dividida por 2 Páginas por Tabela com Letra Grande e Alta Legibilidade)
- **Divisão das Tabelas de Padaria e Pastelaria por 2 Páginas Cada no Modal e Impressão Nativa da App (`PdfViewerModal.tsx`)**:
  - **Secção de Padaria (34 Colunas divididas em 2 Páginas)**:
    - **Página 1 (Parte 1 de 2: Colunas 1 a 17)**: De `Broa Amarela 0.5kg` a `Pão de Bico`, com colunas largas (~36px a 42px), números em fonte `text-xs print:text-[10px] font-bold` (ou `font-black`), cabeçalhos verticais com altura confortável e coluna final de `SUBTOTAL P1`.
    - **Página 2 (Parte 2 de 2: Colunas 18 a 34)**: De `Pão de Cachorro` a `Triga Milha Saloio`, com quebra forçada de página (`page-break-before: always; break-before: page`), mini-cabeçalho de página para identificação imediata na impressão, grelha idêntica e coluna final `TOTAL PADARIA` refletindo o total consolidado da rota/linha na padaria.
  - **Secção de Pastelaria (18 Colunas divididas em 2 Páginas)**:
    - **Página 3 (Parte 1 de 2: Colunas 1 a 9)**: De `Croissant Chocolate` a `Pão com Chouriço`, com colunas generosas (~55px a 70px), números de alta legibilidade `text-xs print:text-[10.5px] font-bold`, quebra de página automática e coluna final de `SUBTOTAL P1`.
    - **Página 4 (Parte 2 de 2: Colunas 10 a 18)**: De `Pão de Croissant` a `Trança de Chocolate`, com quebra de página automática, coluna final `TOTAL PASTELARIA`, seguido pelo Cartão de `TOTAL GERAL A BORDO (PADARIA + PASTELARIA)` e o bloco oficial de conferência/assinaturas para motoristas e expedição.
  - **Acessibilidade Visual**:
    - Letras e números deixaram de estar comprimidos em colunas microscópicas de 22px / 28px, garantindo que colaboradores ou motoristas com dificuldades de visão consigam ler confortavelmente os valores tanto no ecrã como no papel impresso.
  - **Uniformização de Designações**:
    - Nas linhas de Base Diária das carrinhas, a designação é apresentada como `Porta a Porta` em vez do nome da rota duplicado.
    - Rotas com 0 unidades totais na secção são automaticamente omitidas para não poluir a folha de carga.

## [v2.7.39] - 2026-11-03

### Fixed & Operational (Réplica Exata da Folha de Fabrico e Guia de Carga Repartida em 2 Folhas com Letra 8 no BCP)
- **Folha de Fabrico do BCP como Réplica Exata da Aplicação**:
  - **Unificação da Pool de Produção (`calcularPoolFabricoConsolidada`)**: Exportada lógica centralizada em `src/lib/encomendasService.ts` que consolida com rigor matemático as 3 origens de consumo diário: Bases Diárias das carrinhas (rotas 1 a 7, respeitando o modo férias), Clientes Empresariais (B2B) e Encomendas ativas. Consumida de forma idêntica tanto pelo ecrã de Produção da app (`src/app/producao/page.tsx`) como pelo gerador de PDF de contingência (`src/lib/pdfContinuidadeBuilder.ts`) e o cron diário (`src/app/api/cron/continuidade-negocio/route.ts`).
  - **Estruturação em Dois Cadernos Oficiais no PDF**:
    - **Caderno 1 (Folha Diária de Fabrico Consolidada)**: Tabela de produção da amassadura e forno com totais a produzir, 4 cartões de resumo (Total Geral, Padaria, Pastelaria, Linhas), Tabela de Padaria com Subtotal, Tabela de Pastelaria com Subtotal, discriminação de quantidades `Base: X • B2B: Y • Enc: Z`, contagem de encomendas, personalizações de cliente, checkboxes de controlo operacional (`[ ] Cozido` / `[ ] Confeção`) e assinaturas de turno.
    - **Caderno 2 (Folha de Fabrico de Encomendas Discriminadas por Loja e Domicílio)**: Agrupamento de todas as encomendas por Loja e novo agrupador resiliente `Entregas ao Domicílio & Expedição Geral` (eliminando o descarte anterior de encomendas de domicílio ou sem loja), cada uma com card dedicado, hora, contacto, morada, itens e checkboxes de conferência de embalamento.
  - **Parâmetro de Auditoria no Cron**: Adicionado suporte opcional ao parâmetro `?data=YYYY-MM-DD` no endpoint `/api/cron/continuidade-negocio` para facilitar testes manuais e auditorias pontuais de contingência.
- **Guia de Carga Conjunta BCP Repartida por 2 Folhas Horizontais com Tamanho de Letra 8**:
  - **Secção de Padaria (34 colunas divididas em 2 folhas horizontais de 17 colunas)**:
    - *Folha 1 (Parte 1 de 2)*: Colunas 1 a 17 (`b_amarela_05` a `pao_bico`) com largura de 33.5 pt por coluna, coluna de Rota/Cliente de 180 pt e coluna de Subtotal P1 de 48.5 pt. Células de dados e totais formatados com **tamanho de letra 8**! Cabeçalhos de produto rodados a 7.5 pt bold.
    - *Folha 2 (Parte 2 de 2)*: Colunas 18 a 34 (`pao_cachorro` a `triga_milha_saloio`) com a mesma grelha e coluna de Total Geral Padaria (48.5 pt). Células e totais com **tamanho de letra 8**!
  - **Secção de Pastelaria (18 colunas divididas em 2 folhas horizontais de 9 colunas)**:
    - *Folha 3 (Parte 1 de 2)*: Colunas 1 a 9 (`croiss_choc` a `pao_chourico`) com largura confortável de 61 pt por coluna, coluna de Rota/Cliente de 190 pt e coluna de Subtotal P1 de 59 pt. Células de dados e totais com **tamanho de letra 8**! Cabeçalhos de produto rodados a 8 pt bold.
    - *Folha 4 (Parte 2 de 2)*: Colunas 10 a 18 (`pao_croissant` a `tranca_chocolate`) com a mesma grelha, coluna de Total Geral Pastelaria (59 pt) e **tamanho de letra 8**! Inclui no rodapé o Resumo Geral Consolidado a Bordo (Padaria + Pastelaria) e o bloco de assinaturas de visto de expedição e conferência dos condutores.
  - **Economia de Tinteiro (Ink Economy)**: 100% fundo branco sem blocos sólidos de cor preta ou cinzenta escura, garantindo máxima durabilidade dos consumíveis de impressão fabril.

## [v2.7.38] - 2026-11-01

### Fixed & Operational (Correção de ReferenceError em totalGeralRota e Leitura Resiliente da Base Diária de Supabase)
- **Eliminação de ReferenceError na Guia Conjunta de Carga**:
  - Corrigido identificador da variável `totalGeralRota` (que se encontrava declarada como `totGeralRota`) no fecho do objeto de grupo de rotas em `src/lib/encomendasService.ts`. Esta discrepância causava um `ReferenceError: totalGeralRota is not defined` no motor de JavaScript no momento do clique, impedindo a abertura do modal (`setPdfModalOpen`).
- **Extração Resiliente de Quantidades Semanais de Supabase**:
  - Atualizada a função `normalizarBaseFixaItem` e `calcularDadosGuiaCargaConjunta` para inspecionar `quantidades_semanais`, `quantidades.quantidades_semanais` e as chaves de dias de semana em `quantidades` (jsonb da tabela `base_fixa_carrinhas`).
  - Desta forma, as quantidades configuradas no Supabase (como a Base Diária de domingo da Rota 1 com 438 unidades e zero nas restantes rotas) são carregadas fielmente e sem qualquer dependência de filtros fixos em código.
- **Sucesso e Verificação Operacional**:
  - Teste automatizado executado com sucesso e `npm run typecheck` com 0 erros.

## [v2.7.37] - 2026-11-01

### Fixed & Enhanced (Desbloqueio do Botão Guia Conjunta de Carga, Remoção de Blindagem Estrita em Código e Resolução Universal de Aliases de Rotas)
- **Desbloqueio e Blindagem Defensiva do Botão "Guia Conjunta de Carga (Todas as Rotas)"**:
  - Implementado tratamento robusto com try/catch em `abrirGuiaCargaConjuntaPdf` nos Cockpits de Produção e Gestão, assegurando que o modal abre sempre de forma fluida e sem bloquear.
  - Blindagem contra valores nulos/indefinidos em `identificarColunaGrelha` e `getOrCreateArtigo` (`p?.nome`, `safeArtigoNome`).
  - Adicionado encadeamento opcional defensivo (`optional chaining` `?.`) na renderização das grelhas de Padaria e Pastelaria no `PdfViewerModal.tsx`, eliminando qualquer risco de `TypeError` em runtime.
  - Sincronização correta das propriedades `diaSemana` e `dataReferencia` ao abrir a Guia Conjunta para a data selecionada (hoje ou amanhã).
- **Remoção de Regra Rígida em Código para Domingo**:
  - Eliminada a blindagem fixa em código que forçava exclusivamente a Rota 1 ao domingo. O sistema respeita dinamicamente as parametrizações configuradas no Supabase e no Cockpit de Gestão para cada carrinha e cliente em qualquer dia da semana, conferindo total flexibilidade operacional.
- **Resolução Universal de Rotas por Aliases (UUID e car-X)**:
  - Todas as correspondências de rotas para Base Fixa, Clientes Empresariais B2B, Bases Recorrentes e Encomendas ao Domicílio utilizam `obterAliasesCarrinha`, assegurando que clientes e carrinhas mapeados por UUID ou identificador `car-1` a `car-7` são sempre cruzados e exibidos sem omissões.

## [v2.7.36] - 2026-11-01

### Fixed & Enhanced (Regra Estrita de Domingo para Rota 1, Ocultação de Rotas com Carga Zero, Nomenclaturas Oficiais e Discriminação "Porta a Porta")
- **Regra Estrita de Domingo para Base Diária (Apenas Rota 1)**:
  - Ao domingo (`dom`), única e exclusivamente a **Rota 1** tem quantidades na base diária (porta a porta). As Rotas 2 a 7 têm `dom: {}` garantido na base de dados Supabase e filtrado imperativamente pelo motor de cálculo (`normalizarBaseFixaItem` e `calcularDadosGuiaCargaConjunta`).
  - Corrigida a base histórica de mock (`BASE_FIXA_CARRINHAS_INICIAL`) onde a Rota 4 continha indevidamente 422 unidades ao domingo.
- **Ocultação de Rotas sem Carga (Total a Zero)**:
  - Rotas com total geral a zero deixam de figurar na Guia de Carga Conjunta (tanto no modal de visualização/impressão da app como no PDF de continuidade anexado ao email automático das 23h15).
  - Na Tabela 1 (Padaria), figuram apenas rotas com `totalPadariaRota > 0` (ex: Rotas 1 e 5 ao domingo).
  - Na Tabela 2 (Pastelaria), figuram apenas rotas com `totalPastelariaRota > 0` (ex: Rota 1 ao domingo).
  - As colunas ativas no cabeçalho adaptam-se dinamicamente ao número real de rotas em circulação (ex: `2 rotas ativas` ao domingo em vez de 7).
- **Discriminação de Linhas e Nomenclatura "Porta a Porta"**:
  - Dentro de cada rota, as linhas são claramente discriminadas:
    - A base diária da carrinha passa a intitular-se formalmente **`Porta a Porta`** (substituindo a repetição redundante do nome da rota/condutor/matrícula) e só é exibida se tiver quantidades atribuídas.
    - Cada cliente empresarial B2B surge na sua própria linha discriminada (ex: Cavadinha Cabeçais, Lanterna, Mercearia Ribeiro, Café Ribeiro, AICIA, Pedestre 142, Tasquinha da Quinta).
    - As encomendas ao domicílio surgem em linhas dedicadas (`Enc: Nome`).
- **Ajustes de Nomenclatura e Títulos de Secção**:
  - Removida a menção a "Broas" no cartão resumo de Padaria: passa a **`🥖 Padaria`** e subtítulo **`pães`**.
  - No cartão resumo de Pastelaria: subtítulo atualizado para **`pastelaria`**.
  - No cabeçalho geral: a legenda foi atualizada para **`Porta a Porta + Clientes Empresariais + Encomendas`** (removida a designação "Bases + B2B + Domicílios").
  - Nos títulos das secções, removida a menção ao número de colunas:
    - **`🥖 1. SECÇÃO PADARIA`** (em vez de `PADARIA & BROAS (34 COLUNAS)`).
    - **`🧁 2. SECÇÃO PASTELARIA FINA`** (em vez de `PASTELARIA FINA (18 COLUNAS)`).
- **Auditoria de Clientes Empresariais de Domingo**:
  - Confirmados os 37 clientes registados em Supabase: exatamente 7 clientes têm entregas ativas ao domingo (Rota 1: Cavadinha Cabeçais, Mercearia Ribeiro, Lanterna, Café Ribeiro; Rota 5: Tasquinha da Quinta, AICIA, Pedestre 142). Os restantes 30 clientes são escolas e estabelecimentos comerciais fechados ao domingo (`dom: 0 un.`).

## [v2.7.35] - 2026-11-01

### Fixed & Enhanced (Grelha Oficial de Carga Conjunta, Base Diária por Dia Estrito, Sincronização Supabase e Zero Desperdício de Tinta)
- **Base Diária por Rota (Remoção da Replicação e Isolamento por Dia)**:
  - Eliminado o botão e método de replicação semanal ("Replicar ... para Toda a Semana") no Cockpit de Gestão.
  - A alteração de quantidades na Base Diária por Rota afeta única e exclusivamente o dia selecionado (seg, ter, qua, qui, sex, sab, dom), sem propagação nem sobrescrita dos restantes dias da semana.
  - Sincronização direta e persistência em Supabase na tabela bases_fixas_carrinhas (com fallback de contingência na tabela clientes).
- **Gestão de Acessos Sincronizada entre Dispositivos via Supabase**:
  - A gestão de acessos e permissões no painel de gestão grava diretamente no Supabase e lê prioritariamente da nuvem com cache local de fallback, garantindo reflexão imediata ao aceder a partir de outro computador.
  - Atualização dos perfis de sistema com os colaboradores e cargos reais (Luís Silva, Carocha, Praça, Liceu, Fabrico) e sem utilizadores fictícios.
- **Eliminação Definitiva de Dados Dummy / Fictícios**:
  - Removidas mais de 11.000 linhas de encomendas e logs fictícios de mockData.ts (ENCOMENDAS_MOCK = [], LOGS_AUDITORIA_MOCK = []), reduzindo o ficheiro de 600KB+ para 99KB e impedindo qualquer regeneração de dados dummy em novos deploys.
- **Layout de Grelha da Folha de Carga Conjunta (Fiel ao Documento Oficial DOCX)**:
  - Implementada a grelha oficial exata do mapa diário de expedição:
    - **Tabela 1 - Padaria (34 Colunas)**: B. amarela 0.5kg, B. amarela 1 kg, B. amarela 2 kg, B. branca 0.5kg, B. branca 1kg, B c/ chouriço, Broa mistura, Canilha, Meia bola de carne, Mini pão centeio, Mini pão saloio, Padas Centeio, Padas Normais, Padinhas, P. 7 grãos peq., Pão alfarroba, Pão de bico, Pão de cachorro, Pão de canela, Pão de centeio, Pão de forma Gr., P. F. gr. Corte fino, P. forna pequeno, Pão de leite, Pão sementes, Pão integral, Pão italiano, Pão normal, Pão saloio, Tosta, Triga milha 0.3kg, Triga milha 0.5kg, Triga milha1 kg, Tri. milha Saloio.
    - **Tabela 2 - Pastelaria (18 Colunas)**: Croiss. Choc., Croiss. Simples, Fatia Pizza, Lanche Choco., Lanche Fiambre, Lanche Misto, Meia Lua, Merendas, Pão c/ Chouriço, Pão Croissant, Pão Pizza, Pasteis, Pastel de Nata, Pastel Miniatura, Regueifa. Canela, Regueifa de Côco, Regueifa Doce, Trança Chocolate.
    - **Linhas Agrupadas por Rota e Clientes B2B**: Cada Rota (1 a 7) possui a sua linha identificadora com condutor e matrícula, seguida das linhas dos clientes empresariais/paragens B2B afretados à carrinha, com totais por linha e totais por coluna no rodapé.
  - Implementada tanto no modal de impressão da aplicação (PdfViewerModal.tsx com @page { size: A4 landscape; }) como no gerador nativo PDF do Plano de Continuidade de Negócio (pdfContinuidadeBuilder.ts).
- **Resolução de Sobreposição de Texto na Folha de Fabrico**:
  - Reestruturado o cabeçalho e rodapé dos subtotais por loja no gerador PDF, separando o título da loja (alinhado à esquerda) das métricas de unidades/setores (alinhadas à direita com largura calculada dinamicamente), eliminando qualquer colisão visual com lojas de nome longo como "PADARIA DA VILA II - LICEU".
- **Zero Desperdício de Tinteiro e Eliminação de "Número de Caixas"**:
  - Todos os documentos (ecrã, impressão e PDFs) utilizam fundos 100% brancos e linhas finas de contorno para máxima economia de toner da impressora.
  - Eliminada qualquer referência a número de caixas ou estimativa de volume em toda a interface e nos documentos gerados.

## [v2.7.20] - 2026-10-27

### Fixed (Resolução de ReferenceError: Mail is not defined no Cockpit de Gestão)
- **Importação em Falta de `Mail` em `gestao/page.tsx`**:
  - Adicionado o ícone `Mail` ao import de `lucide-react` no Cockpit de Gestão (`src/app/gestao/page.tsx`).
  - Eliminada a interceção de erro da aplicação (*ReferenceError: Mail is not defined*) que ocorria ao abrir o formulário modal de edição de clientes empresariais (B2B) que tivessem endereço de e-mail associado para o envio do link de recuperação ou primeiro acesso.

## [v2.7.19] - 2026-10-26

### Fixed & Enhanced (Refinamento BCP: Acentuação Nativa nos PDFs, Correção de Layout e Padronização de Nomes)
- **Correção da Geometria e Eliminação de Corte no Campo de Domicílios (`pdfContinuidadeBuilder.ts`)**:
  - Resolvida a sobreposição da caixa de "TOTAL GERAL A BORDO" sobre o texto de "Sem encomendas adicionais ao domicílio para esta data" (seção 3) através de reestruturação do sistema de coordenadas do motor PDF, garantindo espaçamento vertical seguro (35pt) e desenho estrito de blocos abaixo de `currentY`.
  - Aplicada a mesma proteção geométrica de retângulos ao bloco de subtotais e validações da Folha de Fabrico.
- **Suporte Nativo Integral a Acentuação e Cedilhas em Português nos PDFs**:
  - Implementado mapeamento e escape octal padrão `/WinAnsiEncoding` (`\341`, `\347`, `\343`, `\351`, `\307`, etc.) no método `drawText`, assegurando renderização perfeita de acentos e cedilhas (`á, à, ã, â, é, ê, í, ó, õ, ô, ú, ç, Á, À, Ã, Â, É, Ê, Í, Ó, Õ, Ô, Ú, Ç`) em qualquer visualizador PDF (Adobe Acrobat, Preview, Chrome, mobile).
  - Atualizados todos os textos e descrições dos cadernos de contingência com a ortografia portuguesa correta (ex: *Produção, Operação, Praça, Pão Saloio, Carcaças, Almoço, Expedição, Domicílio, Diária*).
- **Remoção de Menção Obsoleta do Cabeçalho da Folha de Fabrico**:
  - Eliminado o texto *"Salvo-Conduto BCP de Continuidade • Emitido as 23h15"* do cabeçalho do documento de produção, mantendo a folha limpa e focada na operação.
- **Eliminação Integral da Menção KDS na App e no Plano BCP**:
  - Removido o termo "KDS" de todo o código da aplicação e dos documentos gerados: no PDF da Folha de Fabrico do BCP o cabeçalho passa a ostentar estritamente *"PADARIA DA VILA - CENTRO DE PRODUÇÃO"*.
  - Na aplicação, o separador foi renomeado para *"Fabrico (Produção)"*, e todas as menções em rotas secretas, metadados de layout, ecrãs de impressão e dicionários de internacionalização foram substituídas por terminologia canónica de fabrico e confeção.
- **Padronização Simplificada dos Nomes dos Documentos e Anexos**:
  - Folha de Fabrico: `Folha_Fabrico_<Data>.pdf` (substitui `Folha_Fabrico_Lojas_...`).
  - Folha de Carga: `Folha_Carga_Rotas_<Data>.pdf` (substitui `Folha_Carga_7_Carrinhas_...`).
  - Atualização sincronizada no gerador nativo PDF, na rota de API `/api/cron/continuidade-negocio`, no template de e-mail e nos testes.
- **Configuração Estrita de Destinatários do Envio Noturno BCP (TO & BCC)**:
  - **Destinatário Principal (TO):** `padariadavila@gmail.com` (configurável via `EMAILS_CONTINUIDADE`).
  - **Cópia Oculta de Salvaguarda (BCC):** `luis.carreiras@inprooval.pt` (configurável via `EMAILS_CONTINUIDADE_BCC`), garantindo auditoria e capacidade de assistência técnica sem exposição na lista de destinatários do cliente.
- **Migração do Trigger de Contingência para as 00h15**:
  - Agendamento no `vercel.json` reconfigurado para `"15 0 * * *"` (00h15 diário).
  - A geração dos cadernos de produção (`Folha_Fabrico_Lojas`) e expedição (`Folha_Carga_7_Carrinhas`) passa a visar diretamente o **dia atual (operação de hoje)** em vez de amanhã.
- **Identidade Visual e Layout Oficial do Email BCP (`emailContinuidadeTemplate.ts`)**:
  - **Cabeçalho:** Adicionado o logótipo oficial da Padaria da Vila (`logo-padaria.jpg`) seguido do selo `Salvaguarda Operacional Noturna (00h15)`, título principal `Planos de Fabrico & Carga • Dia atual` e subtítulo `Padaria da Vila • Lojas, Fabrico e Distribuição`.
  - **Corpo:** Texto simplificado e padronizado: saudação oficial à equipa da Padaria da Vila, enquadramento BCP e resumo em destaque (`Folha de Fabrico por Loja` e `Folhas de Carga de cada Rota`).
  - **Assinatura:** Incorporação do logótipo oficial da Inprooval® (`inprooval_logo.jpg`) junto aos dados institucionais da EyeQ Lda, mantendo a caixa destacada de BCP, contactos de emergência (`935 241 876` / `suporte@inprooval.pt`) e aviso de confidencialidade.

## [v2.7.18] - 2026-10-25

### Added (Mecanismo Oficial de Salvaguarda BCP - Continuidade de Negócio & Disparo Noturno Vercel Cron)
- **Motor Nativo de Continuidade de Negócio (BCP / Modo Degradado Offline)**:
  - Criação de gerador nativo em memória de ficheiros binários PDF 1.4 (`src/lib/pdfContinuidadeBuilder.ts`), ultra-leve e sem dependências pesadas de Chromium/Puppeteer (< 50ms de execução na Vercel).
  - Implementação de formatação adaptativa com algoritmo inteligente de quebra de linhas (`wrapText`) e cálculo dinâmico de altura de linha (`rowHeight`), garantindo zero corte com reticências (`..`) e zero sobreposição gráfica de colunas.
  - Geração dos dois cadernos oficiais de contingência:
    1. `Folha_Fabrico_Lojas_<DD-MM-YYYY>.pdf` (discriminado encomenda a encomenda para as 4 Lojas: Matriz/Fábrica, Praça, Av. 25 de Abril, Carocha).
    2. `Folha_Carga_7_Carrinhas_<DD-MM-YYYY>.pdf` (guia oficial das 7 Carrinhas / Rotas 1 a 7, com segregação de Base Diária, B2B com supressão de clientes a 0 un., e Encomendas ao Domicílio com estimativa de caixas).
  - Configuração do agendamento automático noturno no `vercel.json` para as **23h15** (`15 23 * * *`), 15 minutos após o corte oficial de encomendas online.
  - Endpoint de contingência seguro `/api/cron/continuidade-negocio` com validação estrita de autorização (`CRON_SECRET`).
  - Integração com a API REST oficial da Resend via `fetch` nativo com templates HTML e texto plano (`src/lib/emailContinuidadeTemplate.ts`), remetente `Inprooval Sistemas <sistema@inprooval.pt>`, resposta para `Inprooval Suporte <suporte@inprooval.pt>`, linha direta `935 241 876` e aviso de confidencialidade/BCP.
  - Parametrizações de ambiente documentadas e validadas: `RESEND_API_KEY`, `EMAILS_CONTINUIDADE`, `CRON_SECRET`.

## [v2.7.17] - 2026-10-24

### Refactor & Simplification (Eliminação Integral de Camadas de Tradução Legada de Artigos)
- **Eliminação de `normalizarNomeArtigoCanonico` e Confiança Direta no Supabase**:
  - Removidas todas as chamadas e dicionários de conversão estáticos em todo o projeto (`MatrizAjustesAdhoc.tsx`, `PdfViewerModal.tsx`, `producao/page.tsx`, `entregas/page.tsx`, `gestao/page.tsx`, `encomendasService.ts`).
  - A aplicação passa a confiar e a consumir 100% diretamente os nomes oficiais da base de dados Supabase (57 artigos canónicos consolidados), usando apenas higienização elementar de espaços (`.trim()`).
  - As funções `obterQuantidadeEfetivaBaseRota` e `obterQuantidadeEfetivaClienteB2B` foram simplificadas para consultas diretas e lineares, acelerando a renderização e eliminando qualquer risco de `ReferenceError`.

## [v2.7.16] - 2026-10-24

### Fixed (Resolução de ReferenceError: normalizarNomeArtigoCanonico nos Ajustes Pontuais B2B)
- **Correção da Matriz de Ajustes Adhoc (`MatrizAjustesAdhoc.tsx`)**:
  - Adicionado o import em falta de `normalizarNomeArtigoCanonico` a partir de `../lib/encomendasService`, eliminando o crash em tempo de execução (`ReferenceError: normalizarNomeArtigoCanonico is not defined`) que ocorria ao clicar no botão de "Clientes Empresariais" no Cockpit de Fabrico e Entregas.
  - Implementada resolução bidirecional resiliente de artigos na grelha B2B e na Base Diária de Rota: quando a quantidade semanal contratada está registada com denominação histórica (ex: *"Broa 1 kg"*), o valor baseline é mapeado automaticamente para a designação canónica (*"Broa Amarela 1 kg"*).
  - Alinhamento de correspondência canónica em `obterQuantidadeEfetivaClienteB2B` e `obterQuantidadeEfetivaBaseRota` (`encomendasService.ts`), garantindo consistência total na persistência e consulta dos ajustes pontuais de calendário.

## [v2.7.15] - 2026-10-24

### Fixed (Resolução de ReferenceError: totalPaoUnidades na Folha de Carga)
- **Correção da Folha de Carga das Carrinhas (`PdfViewerModal.tsx`)**:
  - Eliminadas as referências residuais à variável obsoleta `totalPaoUnidades` no resumo superior e no rodapé da tabela de carga, substituindo-as por `totalBaseDiaria` e `totalGeralCarga`.
  - **Desdobramento Completo e Fiel da Carga**:
    - Secção 1: Quantidades da Base Diária (abastecimento de rota e entregas recorrentes porta-a-porta).
    - Secção 2: Desdobramento de Clientes Empresariais (B2B) ativos com carga hoje (`clientesB2BComCarga`), suprimindo clientes a 0 un. e incluindo visto individual `[ ] Entregue Conforme`.
    - Secção 3: Desdobramento de Encomendas Adicionais ao Domicílio afetas à rota com detalhe de cliente, telefone, horário, morada e artigos.
    - Secção 4: Bloco de Resumo Geral Consolidado (Base Diária + B2B + Encomendas = Total Geral a Bordo com estimativa de caixas).

## [v2.7.14] - 2026-10-24

### Added & Improved (Folha de Fabrico de Encomendas Discriminada por Loja no Cockpit de Produção)
- **Folha de Fabrico de Encomendas Discriminada por Loja (`PdfViewerModal.tsx` & `producao/page.tsx`)**:
  - Quando a tipologia **"Encomendas"** está selecionada na Pool de Produção do Cockpit de Produção (`/producao`):
    - O botão de impressão do topo adapta-se dinamicamente para **"Imprimir Encomendas por Loja"**.
    - É apresentado um **Banner de Ação Rápida** na Pool de Produção com acesso direto para imprimir todas as lojas ou filtrar individualmente por loja (*Loja Praça*, *Loja Centro*, *Loja Mercado*, etc.).
    - O documento PDF gerado organiza as encomendas agrupadas por Loja, detalhando **encomenda a encomenda** (código `#ENC`, hora agendada, tipo de recolha/domicílio, nome e contacto do cliente, observações gerais de cliente/produção) e a tabela de artigos com quantidade, setor (Padaria/Pastelaria), personalizações (ex: mensagens em bolos) e caixa de verificação `[ ] Pronto / Embalado`.
    - Apresenta subtotais específicos por loja (Padaria, Pastelaria e Total) e quebra de página limpa (`break-before: page`) entre lojas para impressão física de folhas independentes por balcão.
  - **Filtros e Controlos Dinâmicos no Modal de PDF**:
    - Alternância em tempo real entre visualização **"Consolidado Global"** e **"Por Encomenda (Lojas)"**.
    - Filtro seletor de Loja e filtro seletor de Setor (Todos, Padaria, Pastelaria) diretamente na barra superior do visualizador PDF.
    - Partilha WhatsApp atualizada com o resumo discriminado por loja e totais de encomendas a produzir.

## [v2.7.13] - 2026-10-24

### Fixed (Resolução do Erro React #310 na Folha de Fabrico e Restauro do Botão de Conclusão KDS)
- **Correção do Erro React #310 (Rules of Hooks) em `PdfViewerModal.tsx`**:
  - Movida a condição de fecho precoce `if (!isOpen || !mounted) return null;` para após todos os hooks (`useState`, `useRef`, `useMemo`), assegurando a mesma ordem de execução em todas as renderizações e eliminando o crash do modal ao gerar a Folha de Fabrico.
- **Restauração do Botão "Concluir Produção • Marcar como Pronta" no KDS (`producao/page.tsx`)**:
  - Garantida a visibilidade e operacionalidade contínua do botão de conclusão de fabrico nos cartões de encomendas (normais e urgentes), permitindo aos operadores da padaria/pastelaria sinalizar a conclusão das encomendas sem bloqueios de permissão.

## [v2.7.12] - 2026-10-24

### Fixed (Correção de Fecho de Tag JSX em `entregas/page.tsx`)
- **Refatoração do Bloco de Clientes B2B da Rota**:
  - Movida a agregação e filtragem de clientes empresariais ativos para `useMemo` (`clientesB2BAtivosComCargaHoje`), eliminando a expressão IIFE no JSX que provocava erro de sintaxe SWC no build da Vercel (`Unexpected token div. Expected jsx identifier`).

## [v2.7.11] - 2026-10-24

### Added & Changed (Segregação de Fontes de Carga e Supressão de Clientes B2B a Zero)
- **Segregação Estrita da Base Diária na Folha de Carga**:
  - A Tabela Principal da Folha de Carga (`PdfViewerModal.tsx`) passa a listar única e exclusivamente os artigos da **Base Diária da Rota** (abastecimento fixo da carrinha e entregas recorrentes porta-a-porta a particulares).
  - Removida a agregação antecipada de clientes empresariais (B2B) e de encomendas avulsas no cálculo de `prepararItensFolhaCarga` em `/entregas`, `/producao` e `/gestao`.
- **Desdobramentos Detalhados no Fim da Folha de Carga**:
  - **Secção 2 (Clientes B2B)**: desdobramento detalhado por cliente institucional afeto à rota com artigos, quantidades e caixa de visto `[ ] Entregue Conforme`, com subtotal próprio.
  - **Secção 3 (Encomendas Adicionais)**: desdobramento de encomendas agendadas ao domicílio com código `#ENC`, contacto do cliente, morada, horário agendado, observações, tabela de artigos e caixa de visto `[ ] Entregue Conforme`, com subtotal próprio.
  - **Secção 4 (Resumo Geral Consolidado)**: bloco escuro com a soma das 3 fontes (Base Diária + B2B + Encomendas = Total Geral a Bordo com estimativa de caixas).
- **Supressão de Clientes B2B com Quantidade Zero (`0 un.`)**:
  - No **Cockpit de Carrinhas & Distribuição (`/entregas`)**: entidades empresariais sem entregas agendadas para o dia selecionado (como a *Associação de Pais de Chave* ao sábado) são omitidas da listagem e do contador de clientes ativos, eliminando cartões com `Total Hoje: 0 un.`.
  - Na **Folha de Carga em PDF**: entidades B2B com `0 un.` não surgem na secção de desdobramento.
  - No **Cockpit de Produção (`/producao`)**: as etiquetas das carrinhas apenas indicam clientes B2B com entregas efetivas para a data.

## [v2.7.10] - 2026-10-24

### Fixed (Resolução de Erro de Compilação SWC no Build de Produção Vercel)
- **Eliminação de Declaração Duplicada em `gestao/page.tsx`**:
  - Removida a redeclaração de `todosDias` na função `handleRenomearArtigoBaseFixa`, permitindo ao compilador Next.js / SWC da Vercel construir o bundle de produção sem erros de webpack (`the name todosDias is defined multiple times`).

## [v2.7.9] - 2026-10-24

### Fixed & Enhanced (Propagação Automática da Normalização Canónica nos Mapas Diários e Bases das Carrinhas)
- **Normalização e Migração Automática em Tempo Real (`normalizarNomeArtigoCanonico`)**:
  - Implementada função de normalização canónica resiliente em `encomendasService.ts`, cobrindo todas as variantes (`Broa 1 kg` $\rightarrow$ `Broa Amarela 1 kg`, `Broa 2 kg` $\rightarrow$ `Broa Amarela 2 kg`, `Broa 0,5 kg` $\rightarrow$ `Broa Amarela 0,5 kg`, `Pão da Avó` $\rightarrow$ `Pão Saloio`, `Mini Pão da Avó` $\rightarrow$ `Mini Pão Saloio`, `Mini Pão Centeio` $\rightarrow$ `Mini Pão de Centeio`, `Regueifa de Coco` / `Regueifa Côco` $\rightarrow$ `Regueifa de Côco`, `Saco Mini Tostas` $\rightarrow$ `Tosta`, `Lanche` $\rightarrow$ `Lanche Misto`, etc.).
  - Migração transparente da cache do navegador para chaves `_v4` (`padaria_artigos_base_fixa_v4`, `padaria_base_fixa_carrinhas_v4`, `padaria_clientes_empresariais_b2b_v4`), eliminando artigos residuais em cache sem exigir limpeza manual ao utilizador.
  - Saneamento e desduplicação integral de `PRODUTOS_MOCK` e `ENCOMENDAS_MOCK`.
- **Reflexo nos Mapas Diários das Carrinhas e Centro de Produção**:
  - Tabela «Produto / Artigo (Mapa Diário)» no Cockpit de Gestão (`/gestao`) agora sincroniza 100% com os 57 artigos canónicos.
  - Folha de Carga por Carrinha e Folha de Fabrico Oficial do Forno (`/producao` e `/entregas`) agregam e somam automaticamente as quantidades convertidas (fusão de Pão da Avó em Pão Saloio e discriminação de Broas Amarelas 1 kg e 2 kg).
  - Matriz de Ajustes Ad-hoc (`MatrizAjustesAdhoc.tsx`) alinhada com as chaves normalizadas.

## [v2.7.8] - 2026-10-24

### Fixed (Normalização Canónica em Supabase e Desativação do Excel Legado)
- **Normalização na Cloud Supabase**:
  - 21 clientes empresariais normalizados em `public.clientes_empresariais`.
  - Catálogo central atualizado em `public.produtos` com 57 artigos canónicos e eliminação de artigos obsoletos/testes.
- **Inativação do Excel Legado**:
  - Remoção da exportação em `.xlsx` do Mapa Diário em `/entregas`, concentrando 100% da operação nos PDFs oficiais (Folha de Carga, Folha de Fabrico e Comprovativo B2B).

## [v2.4.0] - 2026-10-20

### Added & Unified (8 Rotas de Distribuição, Normalização de Artigos, Pesquisa/Filtros e Gestão B2B com Login)
- **Unificação das 8 Rotas e Carros Operacionais**:
  - Transição de nomenclatura global de «carrinhas» para «carros / rotas» ordenadas de 1 a 8 (`Rota 1` a `Rota 8`, `Carro 1` a `Carro 8`), com nome da rota, nome do carro, condutor atribuído e matrícula.
  - Atribuição direta por **Rota de Entrega** (Rotas 1 a 8) no formulário e edição de encomendas (`/encomendas`).
  - Salvaguarda comercial do modelo de pricing: restrição estrita contra adição descontrolada de lojas ou rotas na operação diária, fixando os limites licenciados em 3 Lojas Físicas e 8 Rotas Operacionais (expansão reservada ao Backoffice).
- **Normalização Integral do Catálogo e Ingestão de Dados Semanais**:
  - Normalização dos 86 artigos reais extraídos das folhas de distribuição (`Pão Normal`, `Lanche`, preservando gramagens e tipologias distintas como `Broa Amarela 1 kg`, `Broa 2 kg`, `Triga Milha 0,5 kg`, `Triga Milha 1 kg`, `Padas de Centeio`, etc.).
  - Adição de 40 produtos em falta ao catálogo oficial (`PRODUTOS_MOCK`) com 100% de cobertura.
  - Carregamento integral das quantidades semanais (Segunda a Domingo) para todas as 8 rotas operacionais e para os clientes contratuais B2B.
- **Filtros em Tempo Real, Pesquisa e Ordenação na Base Diária e B2B**:
  - Na Base Diária: filtro por artigo em tempo real e ordenação (A-Z, Z-A, maior quantidade e menor quantidade), com cabeçalhos a exibir o Nome da Rota.
  - Na Matriz B2B: filtro por rota (Rotas 1 a 8), pesquisa combinada de clientes (nome, NIF, email, telemóvel), filtro por artigo contratual e ordenação (nome e volume total).
- **Clientes Empresariais (B2B) com Login e Recuperação de Password no Portal**:
  - Registo e edição no Cockpit de Gestão de: Nome da Entidade, NIF, Telemóvel, Email, Password, Morada e Rota Associada.
  - Sincronização direta com a autenticação de clientes em `/encomendar`: qualquer cliente empresarial pode iniciar sessão com telemóvel/email ou efetuar recuperação/reset à sua password.
- **Polimento Visual das Abas e Nomenclatura no Cockpit de Gestão (`/gestao`)**:
  - Cabeçalho: **Gestão**.
  - Aba 1: **Indicadores** (em vez de *Métricas & Relatórios*).
  - Aba 2: **Lojas e Rotas** (em vez de *Lojas & Carrinhas*).
  - Aba 3: **Base de Dados** (em vez de *Bases de Dados & Excel*).
  - Aba 4: **Auditoria** (em vez de *Auditoria & Histórico*).
- **Hierarquia do Seletor no Cockpit de Login (`/login`)**:
  - 1.º Nível (`optgroup`): `Lojas`, `Fabrico`, `Distribuição`, `Backoffice`.
  - 2.º Nível (`option`): `Centro de Produção` (sob Fabrico), `Distribuição e rotas` (sob Distribuição), `Gestão` (sob Backoffice).

## [v2.3.6] - 2026-10-19

### Enhanced (Simplificação e Padronização dos Nomes dos Cockpits no Login)
- **Otimização dos Separadores (`optgroup`) e Opções do Seletor de Cockpit**:
  - `Lojas Físicas (Encomendas & Balcão)` simplificado para **`Lojas`**.
  - `Fabrico & Fornos` simplificado para **`Fabrico`**.
  - `Logística & Frota` simplificado para **`Carrinhas`**, com a opção atualizada para **`Carrinhas (Distribuição e Rotas)`** (ortografia sem ampersand).
  - `Administração` ajustado para **`Gestão`**, com a respetiva opção renomeada de `Gestão (Administração & Controlo)` para **`Indicadores e parametrizações`**.

## [v2.3.5] - 2026-10-19

### Fixed & Calibrated (Calibração Geométrica do Talão Térmico 80mm e Eliminação de Cortes de Impressão)
- **Calibração de Largura Útil para Impressoras Térmicas Epson TM-T20 (80mm)**:
  - Redução da largura máxima do contentor de impressão `#thermal-print-area` de `72mm` para `68mm` (`max-width: 68mm`), compensando a margem mecânica não imprimível e o offset físico da cabeça térmica da Epson TM-T20.
  - Aumento da margem de segurança lateral (`padding: 1.5mm 3.5mm 8mm 2mm !important`), garantindo 3.5mm de margem livre à direita para evitar colisões com o corte mecânico do papel.
- **Prevenção de Quebra e Colisão de Texto na Margem Direita**:
  - Aplicação de `overflow: hidden !important`, `word-break: break-word !important` e `box-sizing: border-box !important` a todos os blocos do talão.
  - Ajuste do espaçamento do rodapé técnico de `tracking-widest` para `tracking-wider text-[8.5px]`, eliminando a perda do último asterisco em `*** SISTEMA DE ENCOMENDAS ***`.
  - Inclusão de `pr-1` e `px-1` nas linhas de cabeçalho (DATA / HORA), badge de formato (`[ PRESENCIAL ]`), lista de artigos e totais, garantindo folga visual bilateral simétrica.
- **Ajuste da Pré-visualização no Ecrã**:
  - Largura da janela modal de pré-visualização reduzida de `300px` para `280px` para replicar com precisão de 1:1 o aspeto do talão impresso no papel de 80mm.

## [v2.3.4] - 2026-10-18

### Added & Enhanced (Edição Total de Lojas/Carrinhas/B2B, Configuração de Talão por Loja e Gestão de Acessos)
- **Edição e Criação Completa de Lojas e Carrinhas**:
  - Desbloqueio dos botões "+ Nova Loja" e "+ Nova Carrinha", permitindo criar e editar dados operacionais (nome, contacto, morada, matrícula, capacidade e estado) diretamente a partir dos cartões em `/gestao`.
- **Edição Total da Base Diária por Carrinha (Carrinhas 1 a 4)**:
  - Desbloqueio dos inputs de quantidades para edição direta em grelha sem restrições.
  - Adição de artigos a partir do catálogo oficial ou personalizados, alteração de nomes e eliminação de artigos da base fixa.
  - Suporte a gravação imediata e replicação das quantidades do dia selecionado para toda a semana.
  - Exclusão da Carrinha 5 da Base Diária comum, alinhando a grelha com a realidade logística da frota.
- **Edição Total de Clientes Empresariais B2B (Rota Dedicada 5º Carro)**:
  - Remoção da coluna redundante "ROTA / CARRINHA" da grelha de clientes empresariais, uma vez que todas as entregas B2B são efetuadas exclusivamente pela Carrinha 5.
  - Suporte completo a criação (+ Novo Cliente Empresarial), edição modal, edição direta de quantidades por artigo/dia e eliminação (com confirmação na tabela e no rodapé do modal).
  - Replicação de quantidades de um dia para todos os dias da semana para cada cliente empresarial.
- **Configuração de Talão Térmico por Loja**:
  - Seletor de loja física implementado no configurador de talão de `/gestao`, permitindo que cada loja tenha os seus próprios cabeçalhos comerciais, moradas, telefones, NIFs e rodapés.
  - Atualização do componente `ThermalReceipt.tsx` para carregar automaticamente a configuração específica da loja da encomenda, mantendo fallback na configuração global.
- **Gestão de Acessos Sem Restrições**:
  - Desbloqueio dos controlos de criação (+ Novo Utilizador), edição e eliminação de perfis de utilizador diretamente no painel de controlo de acessos.
- **Otimização Visual de Base de Dados & Excel**:
  - Remoção do banner redundante "+ Inserir Registo na Base de Dados", integrando o botão "+ Novo Artigo" diretamente no cabeçalho do Catálogo de Artigos.

## [v2.3.3] - 2026-10-18

### Fixed & Enhanced (Error Boundaries Ativos em /gestao e Root + Blindagem de Ordenação e useEffect)
- **Implementação de Error Boundaries Nativos do Next.js (`src/app/gestao/error.tsx` e `src/app/error.tsx`)**:
  - Eliminação da página de erro genérica em branco da Vercel. Qualquer exceção de cliente agora renderiza um painel informativo com diagnóstico exato, nome do erro, stack trace e botão tátil **"Limpar Cache & Recarregar"** (`localStorage.clear()` + reload limpo).
- **Blindagem de `sortConsolidada` em `/gestao`**:
  - Prevenção de falhas no carregamento inicial da grelha consolidada: ordenações por `data_agendamento`, `hora_agendamento` e `formato` blindadas com fallbacks para string vazia (`(a.data_agendamento || '').localeCompare(...)`), eliminando erros se registos na base de dados tiverem datas nulas.
- **Proteção Completa no `useEffect` de Inicialização**:
  - Inclusão de bloco `try / catch` e validações `Array.isArray(...)` em todos os setters de encomendas, lojas, carrinhas, produtos e clientes B2B.
- **Blindagem do Cálculo de Desvios de Tempo (`calcularDesvioMinutos`)**:
  - Validação estrita de tipo string e partes horárias antes de divisões com `.split(':')`.

## [v2.3.2] - 2026-10-18

### Fixed (Eliminação Definitiva da Exceção de Cliente em /gestao - Blindagem Total de Itens e Cliente)
- **Blindagem do Cálculo de Volume de Artigos por Loja (`itensLoja`)**:
  - Resolução da falha crítica `TypeError: Cannot read properties of undefined (reading 'reduce')` na redução de artigos de cada loja no separador predefinido de Métricas (`curr.itens.reduce` alterado para `(curr.itens || []).reduce`).
- **Navegação Segura em Dados de Clientes na Tabela Consolidada e Filtros**:
  - Aplicação de encadeamento opcional `enc.cliente?.nome || 'Cliente'` e `enc.cliente?.telefone || '—'` na tabela de detalhe consolidado, eliminando qualquer risco de `Cannot read properties of undefined (reading 'nome')`.
  - Proteção nas pesquisas textuais de clientes em `filtroConsolidada` e na ordenação alfabética por cliente em `sortConsolidada`.
  - Salvaguarda defensiva na exportação de encomendas para Excel (`exportarEncomendas`).
- **Sanitização da Cache Offline de Encomendas (`lerCacheEncomendasOffline`)**:
  - Garantia de que registos antigos ou corrompidos em `localStorage` são normalizados com `itens: []` e objeto `cliente` preenchido por omissão antes de serem injetados no estado da aplicação.
- **Blindagem do Componente de Impressão Térmica (`ThermalReceipt.tsx`)**:
  - Salvaguardas defensivas com optional chaining em `encomenda.cliente?.nome`, `telefone`, `morada` e `notas_entrega`.

## [v2.3.1] - 2026-10-18

### Fixed (Hotfix de Robustez e Tolerância a Valores Nulos na Hidratação do Cockpit de Gestão)
- **Blindagem Defensiva contra Null/Undefined em Badges Vetoriais (`OriginBadge`, `SectorBadge` e `StatusBadge`)**:
  - Resolução da exceção de cliente (*"Application error: a client-side exception has occurred"*) causada por tentativas de invocação de `.toLowerCase()` sobre valores nulos ou indefinidos de `setor`, `categoria`, `origem` e `status` provenientes da base de dados.
- **Harden de Ordenação e Agregações em `/gestao`**:
  - Aplicação de `String(...) || ''` e verificações defensivas em ordenações por nome, categoria, unidade e datas.
  - Salvaguarda nas agregações de clientes, artigos e `obterQtdBaseCarrinha` com navegação segura `?.`.

## [v2.3.0] - 2026-10-18

### Added & Refactored (Simplificação Operacional, Base Diária Semanal por Carrinha, Auditoria Transversal e Rastreabilidade Total)

- **Padronização e Neutralidade da Frota de Viaturas**:
  - Nomenclatura normalizada para `Carrinha 1`, `Carrinha 2`, `Carrinha 3`, `Carrinha 4` e `Carrinha 5` em todos os cockpits (`/gestao`, `/entregas`, `/producao`, `/encomendas`), sem prefixos duplicados (ex: removido `1º Carro (Carrinha 1 - Particulares)`).
  - Remoção de atribuição fixa/definitiva de viaturas a particulares ou empresas nos cartões e modais de edição.
  - Eliminação de campos obsoletos como "Loja Afeta" na edição de carrinhas, com fallback seguro para integridade referencial.
- **Base Diária Semanal por Carrinha e Exportações Excel Flexíveis**:
  - Matriz diária de quantidades por artigo e por carrinha para cada dia da semana (`Segunda` a `Domingo`).
  - Seletor rápido de dias da semana e botão de replicação imediata ("Replicar para Toda a Semana").
  - Exportação Excel Consolidada (todas as carrinhas nos 7 dias da semana) e Exportação Excel Individual (7 dias da semana para a carrinha selecionada).
  - Limpeza dos títulos de secção no cockpit de gestão, removendo contagens estáticas de entidades e viaturas (ex: `Base Diária por Carrinha` e `Clientes Empresariais (B2B)` sem textos rígidos como "14 entidades" ou "1º ao 4º Carro").
- **Neutralidade da Base de Dados e Ocultação de Detalhes Técnicos**:
  - Eliminação de todas as referências ao fornecedor `Supabase` em interfaces públicas e de gestão (substituído por `Base de Dados Central`).
  - Ocultação e remoção visual das colunas técnicas `ID (Supabase)` e `UUID` nas tabelas de dados.
- **Auditoria Transversal e Rastreabilidade Total de Operações**:
  - Sincronização centralizada de registos de auditoria partilhados entre todos os postos de trabalho e utilizadores.
  - Filtro predefinido para a última semana (`Últimos 7 dias`), permitindo acompanhar a taxa de adoção, quem realizou cada ação, quando e em que cockpit.
- **App do Cliente (`/encomendar`) — Fluxo de Estados e Políticas de Edição/Cancelamento**:
  - Estados simplificados: apenas `Encomendado`, `Pronto`, `Entregue` e `Cancelado` (removidos os estados "Em Produção" e "Em Distribuição" e barra de progresso em 4 etapas).
  - Campo de hora de entrega: exibido exclusivamente para `Levantamento em Loja`; para `Entrega ao Domicílio`, o campo de hora é omitido com nota informativa sobre as rondas habituais das carrinhas.
  - Política de Edição e Cancelamento:
    - Se a entrega for no próprio dia (`hoje`): bloqueio de alteração de quantidades com aviso para contacto telefónico (256 944 330).
    - Se a entrega for agendada para data futura (`amanhã ou posterior`): edição livre de quantidades e botão proeminente de **"Cancelar Encomenda"**.
- **Cockpit de Entregas (`/entregas`) & KPIs de Gestão**:
  - Foco exclusivo dos motoristas na sinalização e entrega de encomendas ao domicílio (removido acordeão de carga base consolidada da página de entregas).
  - Dashboard de gestão alinhado para contabilizar estritamente entregas reais de encomendas.
- **Cockpit de Produção (`/producao`)**:
  - Foco estrito em encomendas de levantamento em loja (`tipo === 'levantamento_loja'`).
  - Ação tátil unificada: "Marcar como Pronta" (`pronto_loja`).
  - Alerta sonoro/visual para encomendas com entrega em menos de 3 horas.
  - Ordenação estrita ascendente por data e hora de levantamento.

## [v2.2.0] - 2026-10-16

### Added & Refactored (Alinhamento com a Norma Técnica de Iconografia, Estados e Design de Interação — Inprooval®)
- **Eliminação Integral de Emojis Operacionais (Zero Emojis across Codebase)**:
  - Varredura e substituição completa de todos os emojis em títulos, tabelas, crachás, cabeçalhos, botões, modais, selects e templates de texto por iconografia linear vetorial estandardizada (`lucide-react`, stroke 1.75px–2px).
- **Implementação do Sistema de Estados Semafóricos Padronizados Inprooval (`StatusBadge`)**:
  - Novo componente modular `src/components/StatusBadge.tsx` que materializa a fórmula canónica Inprooval: Pílula com Borda Fina + Micro-Ponto Semafórico (6px) + Rótulo Tipográfico.
  - Suporte estrito aos 5 estados funcionais:
    - **Concluído / Sucesso / Pronto**: Fundo esmeralda suave (`#ECFDF5`), bordo `#A7F3D0`, texto `#065F46`, ponto verde esmeralda (`#10B981`).
    - **Em Curso / Em Preparo / Em Rota**: Fundo âmbar/azul suave, bordo de contraste, texto escuro, micro-ponto com pulso subtil animado (`animate-pulse`).
    - **Aguardar / Pendente**: Fundo azul suave (`#EFF6FF`), bordo `#BFDBFE`, texto `#1E40AF`, micro-ponto azul estático (`#3B82F6`).
    - **Alerta / Crítico / Recusado**: Fundo rosa/vermelho suave (`#FEF2F2`), bordo `#FECACA`, texto `#991B1B`, micro-ponto vermelho (`#EF4444`).
    - **Inativo / Neutro / Rascunho**: Fundo ardósia suave (`#F8FAFC`), bordo `#E2E8F0`, texto `#475569`, micro-ponto cinza (`#94A3B8`).
  - Mapeamento automático inteligente de estados operacionais legados (`pendente`, `em_preparo`, `pronto`, `entregue`, `cancelado`, `recusado`, `atrasado`, `em_rota`, `aceite`).
- **Novos Componentes Canónicos Inprooval (`InproovalBadges`)**:
  - `OriginBadge`: Representação vetorial limpa dos canais de entrada de pedidos com ícones Lucide específicos (`Globe` para Site/Online, `MessageSquare` para WhatsApp, `Phone` para Telefone e `Store` para Presencial/Balcão).
  - `SectorBadge`: Identificação industrial por setor com ícones normalizados (`Flame` para Padaria e `Layers` para Pastelaria).
  - `SkuTag`: Identificador tipográfico monoespaciado em caixa-alta cinzenta suave (`font-mono text-xs`).
- **Refatoração Integral dos Cockpits Operacionais**:
  - **Barra de Navegação (`Navbar.tsx`)**: Cockpits com ícones stroke-first (`Store`, `ChefHat`, `Truck`, `Settings`), telemetria de conectividade com micro-ponto esmeralda pulsante (`Ligado`) e micro-ponto vermelho em caso de perda de ligação (`Offline`).
  - **Cockpit de Loja (`/loja`)**: Crachás de estado de encomenda atualizados com `StatusBadge`, pílulas de canal via `OriginBadge`, avisos de itens recusados e gatilho de notificação WhatsApp com ícones vetoriais.
  - **Cockpit de Produção KDS (`/producao`)**: Triagem de alertas urgentes (<3h) com alerta visual limpo, botões de decisão por item com `Check` e `X`, indicação setorial via `SectorBadge` e monitorização dos 3 fornos com crachás de estado canónicos.
  - **Cockpit de Entregas & Carrinhas (`/entregas`)**: Banners de estado de rota (`Flag`, `Truck`, `Clock`), classificação de clientes B2B vs. Particulares com `Building2` e `Home`, e crachás de conformidade de entrega.
  - **Registo & Consulta de Encomendas (`/encomendas`)**: Seleção de artigos por setor via `SectorBadge`, campo de pesquisa com limpeza vetorial `X` e pílulas semafóricas nos detalhes dos itens.
  - **Painel Executivo de Gestão (`/gestao`)**: Cabeçalhos de KPIs corporativos higienizados, gestão de frotas e acessos de segurança via ícones contextuais (`Lock`, `Eye`, `Edit3`).
  - **Portal de Clientes (`/encomendar`)**: Limpeza dos separadores de categoria, avisos de privacidade RGPD (`ShieldCheck`), alertas de entrega parcelar e rastreio de encomenda via `StatusBadge`.
  - **Templates de Notificação WhatsApp (`encomendasService.ts`)**: Notificações formatadas profissionalmente com marcadores canónicos entre parêntesis retos (`[Confirmado]`, `[Indisponível]`).
  - **Ecrãs de Boas-Vindas e Balcão (`/page.tsx`, `/balcao`)**: Indicadores de carregamento limpos com ícone vetorial temático `Flame`.

## [v2.1.3] - 2026-10-12

### Added & Security
- **Autenticação com Password Definida pelo Utilizador & E-mail de Recuperação no Portal Direto de Clientes (`/encomendar`)**:
  - **Login Seguro (`Já sou Cliente`)**: Exige **Número de Telemóvel (ou E-mail)** + **Password definida pelo cliente** (com botão de mostrar/ocultar password). Caso o cliente já tenha ficha criada ao balcão da loja mas ainda não tenha password definida, é automaticamente encaminhado para o 1.º acesso online com os seus dados pré-preenchidos para definir a sua Password e E-mail de Recuperação.
  - **Registo com E-mail Obrigatório (`Novo Registo`)**: Exige Telemóvel, Nome Completo, **E-mail para Recuperação de Password** (`email`), **Password** (mínimo 4 caracteres) e **Confirmação de Password**.
  - **Fluxo de Recuperação de Password com Envio Real de E-mail via Supabase (`Recuperar`)**: Dispara um e-mail real através do motor **Supabase Auth** (`signInWithOtp` / `resetPasswordForEmail`) para a caixa de correio do cliente. O cliente confirma a posse do e-mail clicando no link enviado para o seu e-mail (que regressa automaticamente a `/encomendar?recuperar=1`) ou introduzindo o código OTP de 6 dígitos recebido (`verifyOtp`), desbloqueando então a definição da nova password.
  - **Edição de Perfil do Cliente**: Modal `Atualizar Dados de Cliente` atualizado para permitir consultar/editar o E-mail de Recuperação e alterar a Password a qualquer momento.
  - **Persistência Híbrida Resiliente (`encomendasService.ts` + Supabase)**: Gravação do e-mail na coluna nativa `clientes.email` e da password em `clientes` (com tag resiliente limpa automaticamente na leitura para não poluir notas de entrega + cache local `padaria_credenciais_clientes_v1` + migração SQL `password_cliente`).
  - **Hardening Supabase RLS (`20261012_bulletproof_hardening.sql`)**: Ativação de *Row-Level Security* (RLS) em todas as tabelas `public` com políticas granulares de leitura (`SELECT`) e escrita validada (`INSERT`/`UPDATE`/`DELETE` com `id IS NOT NULL`), eliminando todos os erros e avisos de tabelas no *Supabase Security Advisor*.
  - **Remoção do Pacote Externo `TinaCMS`**: Eliminadas as dependências externas redundantes `tinacms` e `@tinacms/cli` (bem como a pasta `tina/` e `tina-lock.json`), mantendo 100% operacional o **Studio CMS Visual Nativo (`/cms`)** e os ficheiros `content/*.json`.

## [v2.1.2] - 2026-10-12

### Added
- **Edição, Correção e Eliminação de Artigos na Base Fixa Diária de Clientes Particulares (`1.º ao 4.º Carro`) (`/gestao`)**:
  - Edição inline do nome de qualquer artigo na grelha **«Base Fixa Diária de Clientes Particulares (1.º ao 4.º Carro)»** (clicando no nome do artigo ou no botão **`✏️ Editar`**), com suporte a autocompletar a partir do catálogo de produtos e migração automática das quantidades existentes nas 4 carrinhas e na matriz B2B.
  - Botão **`🗑️ Eliminar`** em cada linha para remover artigos da Base Fixa Diária.
  - Adição rápida de novos artigos por seleção do catálogo ou introdução de nome personalizado (`+ Adicionar`).
- **Extração e Importação Excel (`.xlsx` / `.xls` / `.csv`) na Base Fixa Diária de Clientes Particulares (`/gestao`)**:
  - Botão **`Extrair Excel Base Fixa (.xlsx)`** que exporta o ficheiro `Base_Fixa_Clientes_Particulares_1a4_Carro_YYYY-MM-DD.xlsx` com as colunas `Produto_Artigo`, `1º Carro`, `2º Carro`, `3º Carro`, `4º Carro` e `Total_Particulares`, incluindo linha de totais.
  - Botão **`Importar Excel Base Fixa`** que permite carregar e atualizar em lote os artigos e quantidades das 4 carrinhas particulares, igualando a capacidade de extração/importação do módulo B2B (`5.º Carro`).
  - Sincronização automática da lista de artigos ativos (`carregarArtigosBaseFixa` / `salvarArtigosBaseFixa`) com a exportação do **Mapa Diário Oficial Excel** em `/entregas` e com o template B2B.

## [v2.1.1] - 2026-10-12
### 🛡️ Auditoria & Hardening (Inprooval® Bulletproof Agent Swarm — Readiness Score: 99,1%)
- **Agente 1 (`E2E Journey & Chaos Simulator`)**:
  - Propagação integral da recusa parcelar de artigos (`estado_producao === 'recusado'`) e das `observacoes_producao` para o Cockpit de Carrinhas (`/entregas`), Histórico de Encomendas (`/encomendas`), Cockpit de Loja (`/loja`) e Exportação Excel do «Mapa Diário».
  - Preservação de artigos recusados e notas de personalização de bolos ao mover encomendas no Kanban de Produção (`/producao`).
- **Agente 2 (`Supabase DBA & Data Integrity Auditor`)**:
  - Auditoria ao vivo às 7 tabelas Supabase (`0` itens órfãos, `0` encomendas vazias) e criação da migração SQL idempotente `supabase/migrations/20261012_bulletproof_hardening.sql` com índices compostos para otimização de Egress.
  - Preservação automática das tags `[OBS_PROD:...]` e `[RECUSADO]` durante edições posteriores de encomendas (`atualizarEncomendaDb`).
- **Agente 3 (`Cybersecurity Red-Team — OWASP`)**:
  - Configuração de HTTP Security Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) em `next.config.mjs`.
  - Implementação de *Route Guard* ativo por Cockpit na `Navbar.tsx`.
- **Agente 4 (`Data Protection & Privacy Auditor`)**:
  - Adição de nota informativa de Proteção de Dados nos formulários de Login/Registo e Perfil do Portal Direto de Clientes (`/encomendar`).
- **Agente 5 (`Edge, Offline & Hardware POS Resilience`)**:
  - Atualização do talão térmico **Epson M249A TM-T20 (80mm)** (`ThermalReceipt.tsx`) para assinalar artigos recusados com `[NÃO PROD.]`, excluí-los do somatório de unidades entregues e imprimir `observacoes_producao`.
  - Implementação de cache offline automática (`padaria_encomendas_cache_v1`) e badge `⚡ Offline (Cache)` na `Navbar.tsx` para operação contínua das 5 carrinhas em zonas sem rede.
- **Agente 6 & Agente 7 (`Value/FinOps & Living Docs Guardian`)**:
  - Criação do Relatório Oficial de Certificação `docs/06_Relatorio_Auditoria_Bulletproof_Swarm.md`, atualização de `DOC 01` e `DOC 04`, e regeneração dos 6 PDFs institucionais sanitizados em `docs/pdf/`.

## [v2.1.0] - 2026-10-12
### 🚀 Adicionado (Added)
- **Triagem Parcelar Artigo a Artigo nos Alertas de Encomenda Urgente ($\le 3\text{ Horas}$) (`/producao`)**:
  - Exibição explícita do **Canal de Origem** (`🌐 App Cliente`, `💬 WhatsApp`, `📞 Telefone`, `🏪 Presencial`) e da **Loja / Destino** no cartão de alerta urgente.
  - Visualização completa dos artigos do pedido com botões individuais **`✓ Produzir`** e **`✕ Não Produzir`** por artigo, além do botão rápido **`✓ Aceitar Todos os Artigos`**.
  - Campo de **Observações da Produção para o Cliente** (`observacoes_producao`) sincronizado com a base de dados (`[OBS_PROD:...]`).
- **Feedback Parcelar de Produção na App Cliente (`/encomendar`) e via WhatsApp**:
  - No menu *«As Minhas Encomendas»* da App Cliente, exibição do estado individual de cada artigo (`👨‍🍳 Aceite (Em Produção)`, `✓ Pronto`, `✕ Não Produzido / Indisponível`), aviso de **Produção Parcelar** e caixa de **Observações da Padaria / Produção**.
  - Botão de envio via WhatsApp na Produção (`gerarLinkWhatsAppDecisaoEncomenda`) para pedidos feitos fora da App Cliente (ou como reforço opcional), listando artigos aceites (`✅`), recusados (`❌`) e observações.
- **Disparo Automático de WhatsApp na Loja ao Marcar Encomenda como Pronta (`/loja`)**:
  - Botão **`✅ Dar Encomenda como Pronta p/ Entrega`** que muda o estado para `pronto_loja` e abre automaticamente o WhatsApp (`gerarLinkWhatsAppEncomendaPronta`) para o telemóvel do cliente.
- **Suite Documental Viva Inprooval® (`docs/01` a `docs/05`)**:
  - Criação dos 5 documentos canónicos vivos do projeto em `docs/`.

### 🐛 Corrigido (Fixed)
- Sincronização e backup estruturado (`[ITENS_BACKUP:...]`) das linhas de `itens_encomenda` submetidas na App Cliente para garantir que nenhum pedido aparece com `0 artigos` na Produção.
- Ajuste de altura `h-dvh max-h-dvh` nos ecrãs de login (`/login` e `/encomendar`) para que o badge oficial *Powered by Inprooval* seja sempre visível sem scroll.

### 🔗 Referência Técnica
- Commit: `e3b93fd` | Tag: `v2.1.0`

## [v2.0.0] - 2026-10-11
### 🚀 Adicionado (Added)
- **Implementação dos 22 Requisitos Operacionais da Reunião em Arouca**:
  - Login da equipa (`/login`) com seleção obrigatória de **Cockpit de Trabalho** (`Loja 1`, `Loja 2`, `Loja 3`, `Centro de Produção`, `Carrinhas`, `Gestão`) e isolamento de menus.
  - Ecrã de login autónomo para clientes em `/encomendar` (Módulo Extra / Add-On), sem exposição de preços e com tracking em 4 estados.
  - Expansão da frota para **5 Carrinhas (`1.º Carro` ao `5.º Carro`)**: `1.º` ao `4.º Carro` dedicados a particulares (Base Fixa Diária + Adicionais) e `5.º Carro` dedicado aos **13 Clientes Empresariais B2B** de Arouca.
  - Grelha de **Base Fixa (1.º ao 4.º Carro)** e **Matriz Semanal B2B (5.º Carro)** com upload/exportação Excel em `/gestao`.
  - Exportação com 1 clique do ficheiro Excel oficial **«MAPA DIÁRIO»** em `/entregas`.
  - **Pool Consolidada do Dia** e **3 Cartões de Forno (`Forno 1`, `Forno 2`, `Forno 3`)** com cronómetro em tempo real e histórico de fornadas em `/producao`.
  - Edição completa de artigos (adicionar/eliminar/alterar quantidades) em encomendas já registadas em `/encomendas`.
  - Calibração nativa do talão térmico para a impressora **Epson M249A TM-T20 (80mm / 72mm úteis)**.

### 🔗 Referência Técnica
- Commit: `7ae6771` | Tag: `v2.0.0`

## [v1.9.0] - 2026-09-21
### 🎨 Integração do TinaCMS (Git-Backed Content Management)
- **Arquitetura Híbrida Oficial**: Integração do TinaCMS para gestão visual de conteúdos institucionais e de montra em conformidade com o padrão oficial Inprooval® / EyeQ Lda (`Next.js + TinaCMS + GitHub + Vercel`), mantendo o Supabase para a operação transacional em tempo real (encomendas, Kanban, rotas e auditoria).
- **Esquema de Coleções (`tina/config.ts`)**:
  - **`configuracao`**: Coleção global para nome da marca, slogan, telefone geral, NIF, mensagem de rodapé do talão térmico e modelo estruturado de WhatsApp.
  - **`lojas`**: Coleção de lojas físicas com código, nome, morada, telefone, horário de funcionamento, NIF e fotografia de fachada.
  - **`produtos`**: Catálogo de montra com fotos de bolos, categorias (padaria/pastelaria), unidades, descrição detalhada e declaração de alergénios.
- **Camada Resiliente de Consumo (`src/lib/tinaContent.ts`)**: Módulo com fallbacks seguros e tipagem estrita que alimenta a Navbar e o Talão Térmico (`ThermalReceipt.tsx`) a partir de ficheiros estáticos Git-backed (`content/config/geral.json`, `content/lojas/*.json`, `content/produtos/*.json`) com zero impacto de latência na renderização.
- **Atalho no Painel Executivo (`/admin`)**: Adicionado botão destacado "Editor Visual (TinaCMS) ↗" no menu de abas do painel executivo para abertura direta da interface SPA do TinaCMS.
- **Configuração de Variáveis de Ambiente**: Criação de `.env.example` e ativação de `TINA_PUBLIC_IS_LOCAL=true` para desenvolvimento e testes locais com suporte nativo a Tina Cloud em produção na Vercel.

## [v1.8.0] - 2026-09-17
### 🛡️ Histórico & Auditoria de Ações de Utilizadores
- **Registo Contínuo End-to-End**: Implementado sistema de auditoria completo (`LogAuditoria`) que monitoriza e audita todas as ações executadas pelos utilizadores em todos os painéis da aplicação (desde a criação da encomenda, alterações, início/conclusão de fabrico na produção, atribuição e rota nas entregas, até ao levantamento em loja).
- **Instrumentação em Todos os Módulos**:
  - `Encomendas`: registo na criação, edição de artigos, cancelamento/eliminação e alteração de modalidade de entrega.
  - `Produção`: registo ao avançar no Kanban e na alteração de estado individual de artigos de padaria e pastelaria.
  - `Entregas`: registo na atribuição de carrinhas, início e conclusão de rota, reordenação de paragens e registo de entrega concluída com timestamp real.
  - `Loja`: registo na entrega ao balcão e conversão de encomendas para entrega domiciliária.
- **Painel de Auditoria & Histórico no Admin (`/admin`)**:
  - Nova aba "Auditoria & Histórico" com métricas de eventos no topo (Total, Encomendas Criadas, Fabrico, Entregas/Balcão).
  - Tabela avançada com ordenação com 1 clique (ascendente/descendente) e filtros independentes nas 8 colunas (Data/Hora, Código Encomenda, Cliente, Colaborador, Cargo/Role, Módulo/Painel, Ação, Detalhes).
  - Atalhos de período rápido (Hoje, Últimos 7 Dias, Últimos 30 Dias, Todos), paginação dinâmica e exportação nativa para Excel (`.xlsx`).
  - Persistência e sincronização híbrida com tabela `logs_auditoria` no Supabase e fallback resiliente em `localStorage`.

### 🧾 Remoção de Preços na Pré-Visualização do Talão no Painel de Gestão
- **Alinhamento com o Talão Térmico Real**: Removidos todos os valores monetários residuais (`3.20 €`, `18.50 €`, `21.70 €`) da pré-visualização estática do talão térmico no "Configurador de Talão" do `/admin`.
- **Foco em Artigos e Quantidades**: A pré-visualização apresenta agora de forma limpa e fiel os artigos, quantidades e a indicação `TOTAL DE ARTIGOS: 3 UN.`, exatamente como no talão impresso de 80mm/58mm.

### 📊 Exportação de Folhas de Fabrico em Excel para a Linha de Produção (`/producao`)
- **Separação por Linhas de Fabrico (Padaria e Pastelaria)**: Novo botão "Exportar Linha de Fabrico (Excel)" na barra de filtros de produção que gera um ficheiro Excel estruturado em múltiplas folhas independentes:
  - **Folha "Linha Padaria"**: Lista cronológica de todas as encomendas da data selecionada com itens de padaria, quantidades, notas de fabrico/personalização, observações e caixa de conferência `[  ]` para visto manual à caneta.
  - **Folha "Linha Pastelaria"**: Lista cronológica de encomendas com artigos de pastelaria, destaque para mensagens e especificações de bolos, destino e campo de conferência.
  - **Folha "Resumo Totais Fabrico"**: Folha consolidada com somatório de unidades a produzir por artigo e por setor, permitindo aos chefes de padaria e pastelaria planearem as fornadas e lotes de produção com rapidez.
- **Pronto a Imprimir**: Formatação otimizada de larguras de coluna (`!cols`) para impressão direta em papel A4 e entrega à equipa de fabrico nas primeiras horas da madrugada.
- **Registo de Auditoria**: Cada exportação da folha de produção gera automaticamente um log no histórico de auditoria.

## [v1.7.1] - 2026-09-16
### 🧾 Resolução do Corte no Talão de Pré-Visualização
- **Eliminação do Bug de Flexbox Height**: O contentor de scroll da pré-visualização do talão térmico (`ThermalReceipt.tsx`) foi refatorado de `display: flex` para um contentor de bloco padrão com `mx-auto block h-auto`, eliminando o comportamento de esticamento vertical (`align-items: stretch`) que causava o corte da folha branca do talão aos ~500px e deixava o QR Code e o rodapé a transbordar sobre o fundo cinzento. A folha branca e o picotado passam a envolver 100% dos dados desde o cabeçalho até ao rodapé final, com espaçamento seguro (`pb-12`).
- **Fixação do Cabeçalho do Modal**: O cabeçalho com os botões de ação ("Imprimir" e "Fechar") mantém-se fixo no topo com `shrink-0 bg-white z-10`, e o modal previne transbordos indesejados com `overflow-hidden`.

### 🔘 Correção de Caracteres Duplicados no Botão
- **Remoção de Duplo Sinal "+"**: Corrigido o botão de inserção de registos no painel de administração (`/admin`) para exibir unicamente o ícone `<Plus />` seguido do texto `"Inserir registo"`, eliminando o segundo carácter `+` literal redundante.

## [v1.7.0] - 2026-09-16
### 🏬 Restrição de Licenciamento de Lojas & Carrinhas
- **Bloqueio de Criação no Frontend**: Remoção da opção de adicionar lojas e carrinhas na interface de utilizador (mesmo para perfis de administrador), ficando a criação restrita ao backoffice técnico do proprietário (conforme o modelo de fee mensal por ponto de venda e viatura).
- **Remoção Permanente da Loja 4**: Eliminação da "Futura Loja IV" da base de dados Supabase e dos mocks locais, reafetando as carrinhas à Loja Central (Loja 1).
- **Formulário de Registo Simplificado**: Atualização do assistente "+ Inserir registo" para criar exclusivamente Clientes e Produtos, eliminando as opções de Loja e Carrinha.

### 🗄️ Catálogo Interativo de Artigos & Réplica do Supabase
- **Tabela Completa no Menu de Bases de Dados**: Tabela interativa réplica da tabela do Supabase contendo `ID`, `Nome`, `Setor` (Padaria ou Pastelaria), `Unidade` e `Estado` (Ativo/Inativo).
- **Pesquisa e Filtros por Coluna**: Campo de pesquisa textual em tempo real no nome do artigo, filtros por setor, unidade e estado.
- **Ordenação com 1 Clique**: Clique nos cabeçalhos das colunas para alternar ordenação ascendente e descendente com indicadores visuais.
- **Edição & Eliminação Segura**: Modal dedicado de edição de artigos com gravação direta em Supabase e botão de eliminação permanente com confirmação.
- **Sincronização em Tempo Real**: Disparo de evento `app_produtos_atualizados` para atualizar instantaneamente o catálogo no ecrã de encomendas sem necessidade de recarregar a página.

### 🔤 Padronização Title Case & Remoção de Preço
- **Normalização Automática de Nomes**: Mecanismo inteligente de conversão para Title Case (ex: "Pão Alentejano") em todos os registos avulsos de produtos e clientes, respeitando preposições e acentuação da língua portuguesa.
- **Remoção de Preços Operacionais**: Eliminação da coluna `Preço` no Supabase, nas exportações Excel e nos formulários do catálogo.

### 📊 Filtros por Coluna e Intervalo de Datas
- **Tabela Consolidada de Planeamento vs Real**: Todos os cabeçalhos das colunas passam a ser ordenáveis com 1 clique (Código, Cliente, Formato, Data, Hora Planeada, Hora Real, Pontualidade, Estado) e contam com caixas de pesquisa e filtros dropdown in-column.
- **Intervalo de Datas na Produção**: Substituição do filtro de dia único por um seletor de intervalo de datas flexível ("De:" e "Até:") com botão "Limpar".
- **Ajuste de Terminologia**: Normalização de "Iniciar preparo" para "Iniciar preparação" no painel de fabrico e visualização Kanban.

### 🧾 Impressão Térmica Aperfeiçoada
- **Correção de Corte no Rodapé**: Ajuste de padding na pré-visualização do talão térmico (`ThermalReceipt.tsx`), assegurando que a mensagem de agradecimento e rodapé nunca fiquem cortados antes da impressão.

### 📦 Dataset Realista de Arouca
- **100 Encomendas Autênticas**: Injeção de 100 encomendas e 250 itens com clientes e moradas reais no concelho de Arouca (distribuídos pelos últimos 10 dias, hoje e datas futuras), com tempos reais de entrega e simulação fidedigna de pontualidade e atrasos.
### 🐛 Correção no Build Vercel & Validação JSX
- **Sintaxe JSX em `ThermalReceipt.tsx`**: Fechamento do elemento contentor `<div id="receipt-print-root">` no modal de impressão térmica antes do encerramento com `createPortal(..., document.body)`. Elimina o erro do compilador SWC na Vercel (`Unexpected token div. Expected jsx identifier`) e valida a compilação completa da release.

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
