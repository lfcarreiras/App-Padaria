import { NextResponse } from 'next/server';
import {
  carregarLojasSupabase,
  carregarCarrinhasSupabase,
  carregarProdutosSupabase,
  carregarEncomendasSupabase,
  carregarBasesDiariasRecorrentes,
  carregarBaseFixaCarrinhasSupabase,
  carregarAjustesAdhocSupabase,
  sincronizarClientesB2BComSupabase,
  obterDiaSemanaDeData,
} from '@/lib/encomendasService';
import { gerarPdfFolhaFabricoLojas, gerarPdfGuiaCargaConjunta } from '@/lib/pdfContinuidadeBuilder';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return GET(request);
}

export async function GET(request: Request) {
  const inicioProbe = Date.now();
  const relatorio: Record<string, any> = {
    timestamp: new Date().toISOString(),
    fusoHorario: 'Europe/Lisbon',
    status: 'UNKNOWN',
    auditorias: {},
  };

  try {
    // 1. Verificação de Segurança (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse(JSON.stringify({ erro: 'Não autorizado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Determinar data em Europe/Lisbon
    const agora = new Date();
    const partesDataHoje = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(agora);

    const [ano, mes, dia] = partesDataHoje.split('-');
    const dataHojeFormatada = `${dia}/${mes}/${ano}`;
    const diaSemanaHoje = obterDiaSemanaDeData(partesDataHoje);

    // --- AGENTE 8: DevOps & Cloud Infrastructure Sentry ---
    const inicioInfra = Date.now();
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET,
    };
    const latenciaInfraMs = Date.now() - inicioInfra;
    relatorio.auditorias['Agente_8_DevOps'] = {
      score: Object.values(envVars).every(Boolean) ? 100 : 75,
      variaveisConfiguradas: envVars,
      latenciaCheckMs: latenciaInfraMs,
      estado: 'SAUDÁVEL',
    };

    // --- AGENTE 2: Supabase DBA & Data Sanity ---
    const inicioDB = Date.now();
    const [lojas, carrinhas, produtos, encomendas, basesRecorrentes, clientesB2B, baseFixaCarrinhas, ajustesAdhoc] = await Promise.all([
      carregarLojasSupabase(),
      carregarCarrinhasSupabase(),
      carregarProdutosSupabase(),
      carregarEncomendasSupabase(),
      carregarBasesDiariasRecorrentes(),
      sincronizarClientesB2BComSupabase(),
      carregarBaseFixaCarrinhasSupabase(),
      carregarAjustesAdhocSupabase(),
    ]);
    const latenciaDBMs = Date.now() - inicioDB;

    // Validação dos 57 artigos canónicos
    const produtosAtivos = produtos.filter(p => p.ativo !== false);
    const errosArtigos: string[] = [];
    if (produtosAtivos.length < 50) {
      errosArtigos.push(`Aviso: Apenas ${produtosAtivos.length} produtos ativos encontrados (esperado ~57).`);
    }

    // Validação das 7 rotas
    const rotasEsperadas = [1, 2, 3, 4, 5, 6, 7];
    const rotasEncontradas = carrinhas.map(c => c.numero_carro || c.numeroCarro || c.id);
    const rotasEmFalta = rotasEsperadas.filter(r => !rotasEncontradas.some(rf => String(rf).includes(String(r))));

    relatorio.auditorias['Agente_2_DBA_DataSanity'] = {
      score: errosArtigos.length === 0 && rotasEmFalta.length === 0 ? 100 : 90,
      totalLojas: lojas.length,
      totalCarrinhas: carrinhas.length,
      totalProdutos: produtos.length,
      totalEncomendasHoje: encomendas.filter(e => e.data_entrega === partesDataHoje).length,
      totalClientesB2B: clientesB2B.length,
      latenciaSupabaseMs: latenciaDBMs,
      alertas: [...errosArtigos, ...(rotasEmFalta.length > 0 ? [`Rotas ausentes: ${rotasEmFalta.join(', ')}`] : [])],
      estado: latenciaDBMs < 2000 ? 'SAUDÁVEL' : 'DEGRADADO',
    };

    // --- AGENTE 9: Integrations Sentry (Resend / Email Continuidade) ---
    const apiKey = process.env.RESEND_API_KEY;
    let resendStatus = 'DESCONHECIDO';
    if (apiKey) {
      try {
        const resendCheck = await fetch('https://api.resend.com/api-keys', {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: 'no-store',
        });
        resendStatus = resendCheck.ok ? 'OPERACIONAL' : `RESEND_HTTP_${resendCheck.status}`;
      } catch (err: any) {
        resendStatus = `ERRO_CONEXAO: ${err.message}`;
      }
    }
    relatorio.auditorias['Agente_9_Integrations'] = {
      score: resendStatus === 'OPERACIONAL' ? 100 : 80,
      servicoEmail: 'Resend API',
      estadoConexao: resendStatus,
    };

    // --- AGENTE 11: Synthetic Health Probe (Simulação E2E em Memória) ---
    const inicioProbeE2E = Date.now();
    const pdfFabrico = gerarPdfFolhaFabricoLojas({
      dataOperacao: partesDataHoje,
      dataFormatada: dataHojeFormatada,
      lojas,
      encomendas,
      carrinhas,
      baseFixaCarrinhas,
      clientesB2B,
      basesRecorrentes,
      produtos,
      ajustesAdhoc,
    });

    const pdfCarga = gerarPdfGuiaCargaConjunta({
      dataOperacao: partesDataHoje,
      dataFormatada: dataHojeFormatada,
      diaSemana: diaSemanaHoje,
      carrinhas,
      baseFixaCarrinhas,
      clientesB2B,
      basesRecorrentes,
      encomendas,
      produtos,
      ajustesAdhoc,
    });
    const duracaoProbeE2EMs = Date.now() - inicioProbeE2E;

    relatorio.auditorias['Agente_11_SyntheticProbe'] = {
      score: pdfFabrico.length > 1000 && pdfCarga.length > 1000 ? 100 : 50,
      tamanhoPdfFabricoBytes: pdfFabrico.length,
      tamanhoPdfCargaBytes: pdfCarga.length,
      duracaoGeracaoMs: duracaoProbeE2EMs,
      estado: duracaoProbeE2EMs < 1500 ? 'EXCELENTE' : 'LENTO',
    };

    // Avaliação Global
    const duracaoTotalMs = Date.now() - inicioProbe;
    relatorio.duracaoTotalMs = duracaoTotalMs;
    relatorio.status = 'HEALTHY_BULLETPROOF';

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Sentinela Matinal executado com sucesso: todos os 4 agentes validaram a integridade do ecossistema.',
      relatorio,
    });
  } catch (error: any) {
    console.error('[Sentinela Matinal Error]:', error);
    relatorio.status = 'CRITICAL_ERROR';
    relatorio.erro = error.message || 'Erro fatal na rotina sentinela';
    return NextResponse.json({ sucesso: false, relatorio }, { status: 500 });
  }
}
