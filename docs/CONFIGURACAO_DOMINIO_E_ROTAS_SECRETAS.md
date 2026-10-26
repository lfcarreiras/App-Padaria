# Guia de Configuração: Domínio e Rotas Secretas da App (v2.6.0)

Este documento detalha a configuração oficial para colocar a aplicação a funcionar no subdomínio **`app.padariadavila.com`**, a atribuição de **chaves alfanuméricas longas (ofuscadas)** para cada ecrã e as salvaguardas implementadas para **bloquear a indexação em motores de busca** e **proteger o site existente alojado no cPanel**.

---

## 1. Impacto no Site Existente no cPanel

> **A alteração afeta o site alojado no cPanel?**
> **NÃO, de forma alguma.** O site principal (`padariadavila.com`) e todas as contas de e-mail continuam **100% inalterados e protegidos**.

### Porquê?
1. O seu site atual no cPanel responde pelo domínio raiz **`padariadavila.com`** e pelo apontamento **`www.padariadavila.com`**, que estão associados ao endereço IP do servidor cPanel: **`45.92.68.104`**.
2. Os seus e-mails operam através dos registos **MX** (`mail.padariadavila.com`).
3. Para a aplicação, criamos apenas um **subdomínio novo e independente**: **`app.padariadavila.com`**.
4. Este subdomínio é configurado como um registo **CNAME** exclusivo para a Vercel (`cname.vercel-dns.com`), sem tocar nem alterar em nada os registos `A` ou `MX` do cPanel.
5. Todos os registos DNS originais foram previamente guardados no cofre de segurança em `docs/DNS_BACKUP_VAULT.md`.

---

## 2. Passo-a-Passo: Configurar `app.padariadavila.com`

### Passo A: No cPanel (Zone Editor)
1. Aceda ao painel do seu alojamento **cPanel**.
2. Na secção **Domínios**, clique em **Zone Editor** (ou Editor de Zona DNS).
3. Ao lado do domínio `padariadavila.com`, clique no botão **Gerir** (Manage) ou **+ Registo CNAME**.
4. Adicione o seguinte registo:
   - **Nome / Name**: `app.padariadavila.com.` (ou apenas `app`)
   - **Tipo / Type**: `CNAME`
   - **TTL**: `14400` (ou padrão)
   - **Registo / Destino / Record**: `cname.vercel-dns.com.`
5. Clique em **Guardar Registo** (Save Record).

### Passo B: Na Vercel
1. Aceda ao dashboard do projeto na **Vercel** (`https://vercel.com`).
2. Clique no projeto `app-encomendas-padaria` (ou `app-padaria`).
3. Vá a **Settings** > **Domains**.
4. No campo de introdução de domínio, escreva: **`app.padariadavila.com`** e clique em **Add**.
5. A Vercel validará automaticamente o apontamento CNAME e emitirá um certificado SSL/HTTPS gratuito e renovável automaticamente (Let's Encrypt).
6. A partir desse momento, a app passa a responder de forma limpa e segura em `https://app.padariadavila.com`.

---

## 3. Chaves Alfanuméricas Secretas por Ecrã

Em conformidade com o seu pedido, cada ecrã dispõe agora de uma **chave alfanumérica de alta entropia (32 caracteres)** que **não deriva do nome do ecrã**, impedindo que pessoas não autorizadas adivinhem os endereços ou os partilhem facilmente:

| Ecrã / Cockpit | Caminho Interno | Chave Alfanumérica Secreta | Endereço Completo de Acesso |
| :--- | :--- | :--- | :--- |
| **Login / Acesso Geral** | `/login` | `a8f1b94d2e7c056384a1e9d2b704c8f1` | `https://app.padariadavila.com/a8f1b94d2e7c056384a1e9d2b704c8f1` |
| **Registo & Consulta Encomendas** | `/encomendas` | `k9x4m7b1w8q2e5t0z3a6c9d2f1j8v4p7` | `https://app.padariadavila.com/k9x4m7b1w8q2e5t0z3a6c9d2f1j8v4p7` |
| **KDS Fabrico & Pastelaria** | `/producao` | `f2b8c9d1e4a7m0w5q3x6z8k1j9p2t4v7` | `https://app.padariadavila.com/f2b8c9d1e4a7m0w5q3x6z8k1j9p2t4v7` |
| **Cockpit Balcão / Loja Física** | `/loja` | `b7c4d1e9f2a0385a6e81d74c82b14e90` | `https://app.padariadavila.com/b7c4d1e9f2a0385a6e81d74c82b14e90` |
| **Cockpit Carrinhas & Entregas** | `/entregas` | `r3e81a9f0b2c457d6e19034af58c19d2` | `https://app.padariadavila.com/r3e81a9f0b2c457d6e19034af58c19d2` |
| **Cockpit Gestão & Admin** | `/gestao` | `g9d0e2f4a6b8c1357e9204b7f61c38e4` | `https://app.padariadavila.com/g9d0e2f4a6b8c1357e9204b7f61c38e4` |
| **Studio CMS de Conteúdos** | `/cms` | `m5c8e1a7d9f2b406e3a19c7f82b04d16` | `https://app.padariadavila.com/m5c8e1a7d9f2b406e3a19c7f82b04d16` |
| **Portal Encomendar (Online)** | `/encomendar` | `p4w8x1z0k7e2b5m9c3v6f1a8d0t2r4q9` | `https://app.padariadavila.com/p4w8x1z0k7e2b5m9c3v6f1a8d0t2r4q9` |

> **Acesso rápido no Cockpit de Gestão**: No ecrã de Gestão (`/g9d0e2f4a6b8c1357e9204b7f61c38e4`), no separador **"Acessos"**, foi incorporado um cartão onde o Administrador pode visualizar e **copiar com 1 clique** o endereço exato de cada ecrã para configurar nos tablets/postos da padaria e das lojas.

---

## 4. Bloqueio Completo de Motores de Busca (Anti-Indexação)

Para garantir que a aplicação nunca aparece em pesquisas do Google, Bing ou outros motores de busca, foram implementadas 3 camadas de blindagem estrita:

1. **Cabeçalho HTTP de Resposta (`next.config.mjs` e `middleware.ts`)**:
   ```http
   X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate
   ```
   Instrui qualquer robô que mesmo que encontre um link, é terminantemente proibido indexar, armazenar cache ou exibir resumos.
2. **Meta Tags no HTML (`src/app/layout.tsx`)**:
   ```tsx
   robots: {
     index: false,
     follow: false,
     nocache: true,
     googleBot: { index: false, follow: false, noimageindex: true, ... }
   }
   ```
3. **Ficheiro de Robôs (`public/robots.txt`)**:
   ```txt
   User-agent: *
   Disallow: /
   ```
   Bloqueia de forma irrestrita o acesso de todos os crawlers a qualquer diretoria da aplicação.

---

## 5. Proteção de Rotas Padrão no Servidor (`middleware.ts`)

Se alguém tentar digitar diretamente no browser nomes previsíveis como:
- `app.padariadavila.com/producao`
- `app.padariadavila.com/gestao`
- `app.padariadavila.com/encomendas`
- `app.padariadavila.com/loja`
- `app.padariadavila.com/entregas`

O middleware do Next.js **interceta imediatamente o pedido e redireciona para a raiz de login secreto**, impedindo qualquer descoberta ou acesso não autorizado por enumeração de caminhos.


---

## 6. Infraestrutura de Email Transacional & Continuidade BCP (Resend)

A aplicação de gestão e encomendas da Padaria da Vila utiliza a plataforma **Resend** para o disparo automático noturno dos cadernos de continuidade de negócio (BCP) às 23h15:

* **Plataforma / Fornecedor:** Resend (`https://resend.com`)
* **Conta / Workspace:** `lffcarreiras`
* **Nome Exato da Chave de API:** `Email Continuidade Padaria da Vila`
* **Variável de Ambiente na Vercel:** `RESEND_API_KEY`
* **Domínio de Envio Autorizado:** `inprooval.pt` (com SPF, DKIM e DMARC ativos)
* **Endereço de Envio (From):** `Inprooval Sistemas <sistema@inprooval.pt>`
* **Endereço de Resposta (Reply-To):** `Inprooval Suporte <suporte@inprooval.pt>`
* **Destinatários Configurados (`EMAILS_CONTINUIDADE`):** `luis.carreiras@inprooval.pt` (configurável no painel da Vercel)
* **Anexos Transmitidos:** `Folha_Fabrico_Lojas_<data>.pdf` e `Folha_Carga_7_Carrinhas_<data>.pdf` gerados nativamente em memória.