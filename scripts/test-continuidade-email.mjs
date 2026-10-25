import { gerarEmailContinuidadeHTML, gerarEmailContinuidadeTexto } from '../src/lib/emailContinuidadeTemplate.ts';
import { gerarPdfFolhaFabricoLojas, gerarPdfFolhaCargaCarrinhas } from '../src/lib/pdfContinuidadeBuilder.ts';

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is required.');
    process.exit(1);
  }
  const emailsDestino = (process.env.EMAILS_CONTINUIDADE || 'luis.carreiras@inprooval.pt').split(',').map(e => e.trim());

  // Data de amanhã (26/10/2026)
  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(agora.getDate() + 1);
  const dataAmanhaStr = amanha.toLocaleDateString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  console.log(`[Teste] Gerando documentos de contingencia para a data: ${dataAmanhaStr}...`);

  const bufferFabrico = gerarPdfFolhaFabricoLojas(dataAmanhaStr);
  const bufferCargas = gerarPdfFolhaCargaCarrinhas(dataAmanhaStr);

  console.log(`[Teste] Folha de Fabrico PDF gerada: ${bufferFabrico.length} bytes`);
  console.log(`[Teste] Folha de Carga Carrinhas PDF gerada: ${bufferCargas.length} bytes`);

  const resumo = `
    • <strong>Folha de Fabrico por Loja:</strong> 4 Lojas Interligadas (Matriz/Fabrica, Praca, Av. 25 de Abril, Carocha).<br />
    • <strong>Folha de Carga das Carrinhas:</strong> 7 Rotas discriminadas (Base Diaria, B2B e Domicilios).<br />
    • <strong>Salvaguarda BCP:</strong> Documentos oficiais em anexo para impressao manual ou consulta movel offline.
  `;

  const resumoTexto = `• Folha de Fabrico por Loja: 4 Lojas Interligadas.\n• Folha de Carga das Carrinhas: 7 Rotas discriminadas.\n• Salvaguarda BCP: Documentos anexos para impressao ou consulta movel.`;

  const nomeFicheiroFabrico = `Folha_Fabrico_Lojas_${dataAmanhaStr.replace(/\//g, '-')}.pdf`;
  const nomeFicheiroCarga = `Folha_Carga_7_Carrinhas_${dataAmanhaStr.replace(/\//g, '-')}.pdf`;

  console.log('[Teste] Enviando email com 2 anexos PDF via Resend API...');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inprooval Sistemas <sistema@inprooval.pt>',
      to: emailsDestino,
      reply_to: 'Inprooval Suporte <suporte@inprooval.pt>',
      subject: `[Continuidade de Negocio] Planos de Producao e Carga - Padaria da Vila (${dataAmanhaStr})`,
      html: gerarEmailContinuidadeHTML(dataAmanhaStr, resumo),
      text: gerarEmailContinuidadeTexto(dataAmanhaStr, resumoTexto),
      attachments: [
        {
          filename: nomeFicheiroFabrico,
          content: bufferFabrico.toString('base64'),
        },
        {
          filename: nomeFicheiroCarga,
          content: bufferCargas.toString('base64'),
        },
      ],
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log('✅ SUCESSO! Email de teste enviado via Resend.');
    console.log('Resend Message ID:', data.id);
    console.log('Destinatario:', emailsDestino[0]);
    console.log('Anexos enviados:', [nomeFicheiroFabrico, nomeFicheiroCarga]);
  } else {
    console.error('❌ ERRO no envio Resend:', data);
  }
}

main().catch(console.error);
