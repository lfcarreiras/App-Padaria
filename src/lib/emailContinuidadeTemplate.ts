/**
 * Template Oficial do E-mail de Continuidade de Negócio (BCP)
 * Disparado automaticamente às 23h15 pelo Vercel Cron
 */

export function gerarEmailContinuidadeHTML(dataAmanha: string, resumoOperacional: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Plano de Continuidade de Negócio • Padaria da Vila</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <!-- Cabeçalho -->
    <div style="background-color: #1c1917; padding: 24px; color: #ffffff;">
      <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #f59e0b; font-weight: bold;">
        Salvaguarda Operacional Noturna (23h15)
      </p>
      <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">
        Planos de Fabrico & Carga • ${dataAmanha}
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #a8a29e;">
        Padaria da Vila • 4 Lojas & Frota de 7 Carrinhas
      </p>
    </div>

    <!-- Conteúdo Principal -->
    <div style="padding: 24px; color: #1f2937;">
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-top: 0;">
        Caros responsáveis e gerência da <strong>Padaria da Vila</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Em cumprimento do <strong>Plano de Continuidade de Negócio (BCP)</strong>, partilhamos a programação oficial compilada para a operação de amanhã. Os documentos em anexo destinam-se a garantir a continuidade absoluta do fabrico e das entregas, mesmo em caso de falha de ligação ou sistemas na fábrica e balcões.
      </p>

      <!-- Caixa de Resumo -->
      <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 6px; padding: 14px 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c;">
          Resumo da Operação Agendada:
        </p>
        <div style="font-size: 13px; color: #292524; line-height: 1.5;">
          ${resumoOperacional}
        </div>
      </div>

      <p style="font-size: 13px; color: #4b5563; line-height: 1.5;">
        <strong>Documentos Oficiais em Anexo:</strong><br />
        📄 <code>Plano_Fabrico_Lojas_${dataAmanha}.pdf</code> (Folha de Encomendas discriminada por loja)<br />
        🚚 <code>Plano_Carga_7_Carrinhas_${dataAmanha}.pdf</code> (Folha de Carga com Base Diária, B2B e Domicílios)
      </p>

      <!-- RODAPÉ APROVADO -->
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;" />

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #d97706; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #111827;">
          🛡️ SALVAGUARDA DE CONTINUIDADE DE NEGÓCIO (BCP)
        </p>
        <p style="margin: 0; font-size: 12px; color: #4b5563; line-height: 1.5;">
          Esta mensagem foi gerada automaticamente às 23h15 pelo motor de contingência da App Padaria da Vila na plataforma Inprooval® para assegurar a operação das lojas e carrinhas, para assegurar a continuidade da operação, em caso de falha de rede ou sistemas.
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #4b5563; line-height: 1.5;">
          <strong>Em caso de dúvida ou necessidade de suporte urgente para esta produção:</strong><br />
          Responda diretamente a este e-mail ou contacte: <a href="mailto:suporte@inprooval.pt" style="color: #d97706; text-decoration: underline;">suporte@inprooval.pt</a> | Tel.: <a href="tel:+351935241876" style="color: #d97706; text-decoration: underline;">935 241 876</a>
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #111827;">
              Inprooval® Sistemas Digitais
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
              EyeQ Lda • NIF: 515075337
            </p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">
              Web: <a href="https://inprooval.pt" style="color: #6b7280; text-decoration: none;">inprooval.pt</a> | Suporte: <a href="mailto:suporte@inprooval.pt" style="color: #6b7280; text-decoration: none;">suporte@inprooval.pt</a> | Tel.: <a href="tel:+351935241876" style="color: #6b7280; text-decoration: none;">935 241 876</a>
            </p>
          </td>
        </tr>
      </table>

      <p style="margin-top: 20px; font-size: 10px; color: #9ca3af; line-height: 1.4;">
        <em>Aviso de Confidencialidade: Esta comunicação e os documentos anexos contêm informação operacional confidencial destinada exclusivamente à gerência e responsáveis operacionais da Padaria da Vila. Se recebeu este e-mail por engano, agradecemos que o elimine de imediato.</em>
      </p>

    </div>
  </div>
</body>
</html>`;
}

export function gerarEmailContinuidadeTexto(dataAmanha: string, resumoOperacional: string): string {
  return `PLANOS DE PRODUÇÃO E CARGA • PADARIA DA VILA
Data da Operação: ${dataAmanha}

Caros responsáveis e gerência da Padaria da Vila,

Em cumprimento do Plano de Continuidade de Negócio (BCP), partilhamos a programação oficial compilada para a operação de amanhã. Os documentos em anexo destinam-se a garantir a continuidade absoluta do fabrico e das entregas, mesmo em caso de falha de ligação ou sistemas na fábrica e balcões.

RESUMO DA OPERAÇÃO:
${resumoOperacional}

Documentos Oficiais em Anexo:
- Plano_Fabrico_Lojas_${dataAmanha}.pdf (Folha de Encomendas discriminada por loja)
- Plano_Carga_7_Carrinhas_${dataAmanha}.pdf (Folha de Carga com Base Diária, B2B e Domicílios)

____________________________________________________________________

🛡️ SALVAGUARDA DE CONTINUIDADE DE NEGÓCIO (BCP)
Esta mensagem foi gerada automaticamente às 23h15 pelo motor de contingência da App Padaria da Vila na plataforma Inprooval® para assegurar a operação das lojas e carrinhas, para assegurar a continuidade da operação, em caso de falha de rede ou sistemas.

Em caso de dúvida ou necessidade de suporte urgente para esta produção:
Responda diretamente a este e-mail ou contacte: suporte@inprooval.pt | Tel.: 935 241 876

--
Inprooval® Sistemas Digitais

EyeQ Lda • NIF: 515075337
Web: inprooval.pt | Suporte: suporte@inprooval.pt | Tel.: 935 241 876

Aviso de Confidencialidade: Esta comunicação e os documentos anexos contêm informação operacional confidencial destinada exclusivamente à gerência e responsáveis operacionais da Padaria da Vila. Se recebeu este e-mail por engano, agradecemos que o elimine de imediato.`;
}
