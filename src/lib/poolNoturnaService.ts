/**
 * Serviço de Fecho Noturno e Compilação Automática da Pool de Fabrico (22h00)
 * Trigger.dev v3 + Next.js Serverless + Resiliência contra oscilações de rede.
 */

import { 
  carregarEncomendasSupabase, 
  carregarBaseFixaCarrinhas, 
  carregarClientesEmpresariaisB2B, 
  carregarProdutosSupabase,
  obterDiaSemanaDeData,
  registarLogAuditoria 
} from './encomendasService';
import { DiaSemana } from '../types';

export interface ItemPoolNoturna {
  produtoNome: string;
  categoria: 'padaria' | 'pastelaria';
  unidade: string;
  qtdEncomendasBalcao: number;
  qtdBaseFixaRotas: number;
  qtdClientesB2B: number;
  totalUnidades: number;
  caixasEstimadas: number;
}

export interface ResultadoFechoNoturno {
  sucesso: boolean;
  dataAlvo: string;
  diaSemana: DiaSemana;
  executadoEm: string;
  totalArtigosDiferentes: number;
  totalUnidades: number;
  totalPadaria: number;
  totalPastelaria: number;
  totalCaixasEstimadas: number;
  encomendasProcessadasCount: number;
  rotasConsolidadasCount: number;
  clientesB2BConsolidadosCount: number;
  itens: ItemPoolNoturna[];
  mensagemKDS: string;
  erro?: string;
}

const STORAGE_KEY_ULTIMO_FECHO = 'padaria_ultimo_fecho_noturno_v1';
const STORAGE_KEY_ALERTA_KDS = 'padaria_alerta_kds_noturno_v1';

/**
 * Função de retry com backoff exponencial para resistir a oscilações noturnas no Supabase
 */
async function executarComRetry<T>(fn: () => Promise<T>, maxTentativas: number = 4): Promise<T> {
  let tentativa = 1;
  while (tentativa <= maxTentativas) {
    try {
      return await fn();
    } catch (err) {
      if (tentativa === maxTentativas) throw err;
      const esperaMs = Math.min(1000 * Math.pow(2, tentativa - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
      tentativa++;
    }
  }
  throw new Error('Falha após múltiplas tentativas com retry.');
}

/**
 * Compilação automática das 22h00:
 * Encomendas aceites + Base Fixa das 7 rotas + Matriz dos 13 clientes B2B.
 */
export async function compilarPoolNoturnaAutomatica(dataReferencia?: string): Promise<ResultadoFechoNoturno> {
  try {
    // 1. Determinar a data alvo de produção (se for 22h, a produção da madrugada fabrica para o dia seguinte)
    let dataAlvo: string;
    if (dataReferencia) {
      dataAlvo = dataReferencia;
    } else {
      const hoje = new Date();
      // Se executado após as 18h, compila para amanhã; caso contrário para hoje
      if (hoje.getHours() >= 18) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() + 1);
        dataAlvo = d.toISOString().split('T')[0];
      } else {
        dataAlvo = hoje.toISOString().split('T')[0];
      }
    }

    const diaSemana = obterDiaSemanaDeData(dataAlvo);

    // 2. Carregar dados com tolerância a falhas (retry)
    const [encomendasTodas, baseFixaCarrinhas, clientesB2B, catalogoProdutos] = await Promise.all([
      executarComRetry(() => carregarEncomendasSupabase()),
      executarComRetry(() => Promise.resolve(carregarBaseFixaCarrinhas())),
      executarComRetry(() => Promise.resolve(carregarClientesEmpresariaisB2B())),
      executarComRetry(() => carregarProdutosSupabase()),
    ]);

    // 3. Filtrar encomendas ativas/aceites para a data alvo
    const encomendasDoDia = encomendasTodas.filter((e) => {
      return e.data_agendamento === dataAlvo && e.estado !== 'cancelada';
    });

    // Mapa agregado de quantidades: produtoNome -> { encomendas, rotas, b2b }
    const mapaQuantidades: Record<string, { encomendas: number; rotas: number; b2b: number }> = {};

    function somar(prodNome: string, tipo: 'encomendas' | 'rotas' | 'b2b', qtd: number) {
      if (!prodNome || qtd <= 0) return;
      const nomeFormatado = prodNome.trim();
      if (!mapaQuantidades[nomeFormatado]) {
        mapaQuantidades[nomeFormatado] = { encomendas: 0, rotas: 0, b2b: 0 };
      }
      mapaQuantidades[nomeFormatado][tipo] += qtd;
    }

    // A) Somar encomendas do balcão e de entrega
    encomendasDoDia.forEach((enc) => {
      (enc.itens || []).forEach((item) => {
        if (item.status_item !== 'recusado') {
          somar(item.produto_nome || item.produto?.nome || 'Artigo', 'encomendas', item.quantidade);
        }
      });
    });

    // B) Somar Base Fixa das 7 Rotas
    baseFixaCarrinhas.forEach((carrinha) => {
      const semana = carrinha.quantidades_semanais || carrinha.quantidades_por_produto || {};
      const mapaDia = (semana[diaSemana] || semana) as Record<string, number>;
      Object.entries(mapaDia).forEach(([prod, qtd]) => {
        somar(prod, 'rotas', Number(qtd) || 0);
      });
    });

    // C) Somar Matriz dos Clientes Empresariais B2B
    clientesB2B
      .filter((c) => c.ativo)
      .forEach((cli) => {
        const semana = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
        const mapaDia = semana[diaSemana] || {};
        Object.entries(mapaDia).forEach(([prod, qtd]) => {
          somar(prod, 'b2b', Number(qtd) || 0);
        });
      });

    // 4. Construir lista detalhada e classificar por setor (Padaria vs Pastelaria)
    let totalUnidadesGeral = 0;
    let totalPadaria = 0;
    let totalPastelaria = 0;

    const itensDetalhados: ItemPoolNoturna[] = Object.entries(mapaQuantidades).map(([nome, dados]) => {
      const prodCatalogo = catalogoProdutos.find(
        (p) => p.nome.toLowerCase().trim() === nome.toLowerCase().trim()
      );
      const categoria: 'padaria' | 'pastelaria' = prodCatalogo?.categoria || (
        /bolo|torta|croissant|pastel|queque|folhado|tarte/i.test(nome) ? 'pastelaria' : 'padaria'
      );
      const unidade = prodCatalogo?.unidade || 'unidade';
      const totalItem = dados.encomendas + dados.rotas + dados.b2b;

      totalUnidadesGeral += totalItem;
      if (categoria === 'pastelaria') {
        totalPastelaria += totalItem;
      } else {
        totalPadaria += totalItem;
      }

      // Estimativa de caixas (média de 25 pães normais por caixa, 15 broas por caixa, ou 20 bolos)
      const divisor = /broa|forma/i.test(nome) ? 15 : /bolo|pastel/i.test(nome) ? 20 : 25;
      const caixasEstimadas = Math.max(1, Math.ceil(totalItem / divisor));

      return {
        produtoNome: nome,
        categoria,
        unidade,
        qtdEncomendasBalcao: dados.encomendas,
        qtdBaseFixaRotas: dados.rotas,
        qtdClientesB2B: dados.b2b,
        totalUnidades: totalItem,
        caixasEstimadas,
      };
    });

    // Ordenar itens alfabeticamente ou por volume
    itensDetalhados.sort((a, b) => b.totalUnidades - a.totalUnidades);

    const totalCaixasEstimadas = itensDetalhados.reduce((acc, it) => acc + it.caixasEstimadas, 0);

    const executadoEm = new Date().toISOString();
    const mensagemKDS = `Turno da Madrugada Ativo: Fecho Noturno às 22h00 concluído com sucesso. Pool de ${totalUnidadesGeral} peças (${totalPadaria} padaria / ${totalPastelaria} pastelaria) para ${dataAlvo} pronta para fabrico.`;

    const resultado: ResultadoFechoNoturno = {
      sucesso: true,
      dataAlvo,
      diaSemana,
      executadoEm,
      totalArtigosDiferentes: itensDetalhados.length,
      totalUnidades: totalUnidadesGeral,
      totalPadaria,
      totalPastelaria,
      totalCaixasEstimadas,
      encomendasProcessadasCount: encomendasDoDia.length,
      rotasConsolidadasCount: 8,
      clientesB2BConsolidadosCount: clientesB2B.filter((c) => c.ativo).length,
      itens: itensDetalhados,
      mensagemKDS,
    };

    // 5. Guardar no localStorage para sincronização no KDS e persistência local
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ULTIMO_FECHO, JSON.stringify(resultado));
        localStorage.setItem(STORAGE_KEY_ALERTA_KDS, JSON.stringify({
          ativo: true,
          timestamp: Date.now(),
          mensagem: mensagemKDS,
          totalUnidades: totalUnidadesGeral,
        }));
      } catch {}
    }

    // 6. Registar em Log de Auditoria
    await registarLogAuditoria({
      utilizador_id: 'cron-trigger-dev',
      utilizador_nome: 'Trigger.dev v3 (Fecho Noturno Automático)',
      utilizador_role: 'admin',
      painel: 'producao',
      acao: 'Fecho Noturno 22h00 - Pool de Fabrico Gerada',
      detalhes: `Pool de fabrico gerada para ${dataAlvo}: ${totalUnidadesGeral} unidades (${totalPadaria} padaria, ${totalPastelaria} pastelaria) a partir de ${encomendasDoDia.length} encomendas aceites, 7 rotas operacionais e ${clientesB2B.length} clientes B2B. Alerta KDS ativado para o turno das 23h00.`,
    });

    return resultado;
  } catch (error: any) {
    console.error('Erro no Fecho Noturno Automático:', error);
    return {
      sucesso: false,
      dataAlvo: new Date().toISOString().split('T')[0],
      diaSemana: 'seg',
      executadoEm: new Date().toISOString(),
      totalArtigosDiferentes: 0,
      totalUnidades: 0,
      totalPadaria: 0,
      totalPastelaria: 0,
      totalCaixasEstimadas: 0,
      encomendasProcessadasCount: 0,
      rotasConsolidadasCount: 8,
      clientesB2BConsolidadosCount: 0,
      itens: [],
      mensagemKDS: 'Falha ao compilar a pool noturna.',
      erro: error.message || 'Erro desconhecido',
    };
  }
}

/**
 * Executar compilação da pool noturna (alias para o Cockpit de Produção)
 */
export async function executarCompilacaoPoolNoturna(
  dataReferencia?: string,
  currentUser?: { id: string; nome: string; role: any }
): Promise<ResultadoFechoNoturno> {
  return compilarPoolNoturnaAutomatica(dataReferencia);
}

/**
 * Obter o último fecho noturno guardado em cache
 */
export function obterUltimoFechoNoturno(): ResultadoFechoNoturno | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ULTIMO_FECHO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Obter e limpar alarme do KDS (quando o padeiro confirma o alerta sonoro e visual)
 */
export function verificarAlertaKDSNoturno(): { ativo: boolean; mensagem: string; totalUnidades: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTA_KDS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.ativo ? parsed : null;
  } catch {
    return null;
  }
}

export function silenciarAlertaKDSNoturno(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTA_KDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY_ALERTA_KDS, JSON.stringify({ ...parsed, ativo: false }));
    }
  } catch {}
}
