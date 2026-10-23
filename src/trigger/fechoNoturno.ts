import { schedules, logger } from "@trigger.dev/sdk/v3";
import { compilarPoolNoturnaAutomatica } from "../lib/poolNoturnaService";

/**
 * Trigger.dev v3 Scheduled Task — Fecho Noturno e Geração da Pool de Fabrico
 * Desativado conforme requisito operacional: "não faças qualquer fecho automático das encomendas".
 * Mantido apenas como registo sem alteração automática de encomendas.
 */
export const fechoNoturnoTask = schedules.task({
  id: "fecho-noturno-producao",
  cron: {
    pattern: "0 22 * * *",
    timezone: "Europe/Lisbon",
  },
  retry: {
    maxAttempts: 1,
    minTimeoutInMs: 2000,
  },
  run: async (payload) => {
    logger.info("Fecho automático de encomendas desativado conforme requisitos operacionais.", { payload });
    return {
      sucesso: true,
      desativado: true,
      mensagem: "Fecho automático desativado a pedido do utilizador."
    };
  },
});
