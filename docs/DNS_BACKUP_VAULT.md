# 🔐 DNS BACKUP VAULT — PADARIA DA VILA (`padariadavila.com`)

Data de Gravação: 22 de Outubro de 2026, 22:08 (UTC+1)  
Objetivo: Registo de salvaguarda dos registos de DNS originais do cPanel antes de qualquer alteração de encaminhamento.

---

## 📋 Registos Originais do cPanel (Backup de Restauro)

Caso seja necessário repor a configuração original do servidor cPanel a qualquer momento, estes são os valores exatos:

| Nome do Registo | TTL | Tipo | Registo / Destino Original | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `padariadavila.com.` | `14400` | **A** | `45.92.68.104` | Servidor Web cPanel (Alojamento Original) |
| `www.padariadavila.com.` | `14400` | **CNAME** | `padariadavila.com` | Redirecionamento Web www para o domínio principal |

---

## 🌐 Credenciais do Painel de Alojamento cPanel
* **URL de Gestão**: `https://padariadavila.com/cpanel`
* **Utilizador**: `padariav`
* **IP do Servidor cPanel**: `45.92.68.104`

---

## ⚠️ Análise de Impacto de Alterações

1. **Se alterar o registo `A` de `padariadavila.com` para a Vercel (`76.76.21.21`):**
   * **SIM, AFETA O SITE NO CPANEL**: Todo o tráfego que aceda a `padariadavila.com` é enviado diretamente para a app na Vercel. O website existente no cPanel deixa de ser apresentado.

2. **Se criar um Subdomínio (ex: `encomendas.padariadavila.com`):**
   * **NÃO AFETA NADA**: O website existente em `padariadavila.com` e `www.padariadavila.com` continua a carregar 100% no cPanel a partir do IP `45.92.68.104`.
   * Os emails (`@padariadavila.com`) continuam intactos.
   * A app fica isolada no endereço seguro `https://encomendas.padariadavila.com`.
