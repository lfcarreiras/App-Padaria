import { schedules, logger } from "@trigger.dev/sdk/v3";
import { compilarPoolNoturnaAutomatica } from "../lib/poolNoturnaService";

/**
 * Trigger.dev v3 Scheduled Task — Fecho Noturno e Geração da Pool de Fabrico
 * Executa todos os dias às 22h00 (fuso horário de Portugal - Europe/Lisbon).
 * Compila automaticamente encomendas aceites + Base Fixa das 8 rotas + Matriz dos 13 clientes B2B.
 */
export const fechoNoturnoTask = schedules.task({
  id: "fecho-noturno-producao",
  cron: {
    pattern: "0 22 * * *",
    timezone: "Europe/Lisbon",
  },
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload) => {
    logger.info("Iniciando Fecho Automático Noturno das 22h00...", { payload });

    const resultado = await compilarPoolNoturnaAutomatica();

    if (!resultado.sucesso) {
      logger.error("Falha ao compilar Pool Noturna:", { erro: resultado.erro });
      throw new Error(`Falha no Fecho Noturno: ${resultado.erro}`);
    }

    logger.info("Fecho Noturno das 22h00 concluído com sucesso!", {
      dataAlvo: resultado.dataAlvo,
      totalUnidades: resultado.totalUnidades,
      padaria: resultado.totalPadaria,
      pastelaria: resultado.totalPastelaria,
      caixasEstimadas: resultado.totalCaixasEstimadas,
      encomendas: resultado.encomendasProcessadasCount,
      rotas: resultado.rotasConsolidadasCount,
      clientesB2B: resultado.clientesB2BConsolidadosCount,
    });

    return resultado;
  },
});
