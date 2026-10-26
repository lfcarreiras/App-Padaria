import { gerarEmailContinuidadeHTML, gerarEmailContinuidadeTexto } from '../src/lib/emailContinuidadeTemplate.ts';
import { gerarPdfFolhaFabricoLojas, gerarPdfFolhaCargaCarrinhas } from '../src/lib/pdfContinuidadeBuilder.ts';

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is required.');
    process.exit(1);
  }
  const emailsDestino = (process.env.EMAILS_CONTINUIDADE || 'padariadavila@gmail.com').split(',').map(e => e.trim()).filter(Boolean);
  const emailsBcc = (process.env.EMAILS_CONTINUIDADE_BCC || 'luis.carreiras@inprooval.pt').split(',').map(e => e.trim()).filter(Boolean);

  // Data da operação (00h15 - Dia atual)
  const agora = new Date();
  const dataHojeStr = agora.toLocaleDateString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  console.log(`[Teste 00h15] Gerando documentos BCP para o dia atual: ${dataHojeStr}...`);

  const bufferFabrico = gerarPdfFolhaFabricoLojas(dataHojeStr);
  const bufferCargas = gerarPdfFolhaCargaCarrinhas(dataHojeStr);

  console.log(`[Teste] Folha de Fabrico PDF gerada: ${bufferFabrico.length} bytes`);
  console.log(`[Teste] Folha de Carga Carrinhas PDF gerada: ${bufferCargas.length} bytes`);

  const nomeFicheiroFabrico = `Folha_Fabrico_${dataHojeStr.replace(/\//g, '-')}.pdf`;
  const nomeFicheiroCarga = `Folha_Carga_Rotas_${dataHojeStr.replace(/\//g, '-')}.pdf`;

  console.log('[Teste] Enviando email com logos oficiais e 2 anexos PDF via Resend API...');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inprooval Sistemas <sistema@inprooval.pt>',
      to: emailsDestino,
      bcc: emailsBcc,
      reply_to: 'Inprooval Suporte <suporte@inprooval.pt>',
      subject: `[Continuidade de Negócio] Planos de Fabrico & Carga • Dia atual - Padaria da Vila (${dataHojeStr})`,
      html: gerarEmailContinuidadeHTML(dataHojeStr),
      text: gerarEmailContinuidadeTexto(dataHojeStr),
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
    console.log('✅ SUCESSO! Email BCP das 00h15 enviado via Resend.');
    console.log('Resend Message ID:', data.id);
    console.log('Destinatario (TO):', emailsDestino);
    console.log('Copia Oculta (BCC):', emailsBcc);
    console.log('Anexos enviados:', [nomeFicheiroFabrico, nomeFicheiroCarga]);
  } else {
    console.error('❌ ERRO no envio Resend:', data);
  }
}

main().catch(console.error);
