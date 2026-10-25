import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    
    if (process.stdin.isTTY) {
      return resolve({});
    }

    const timer = setTimeout(() => {
      resolve(data ? tryParse(data) : {});
    }, 150);

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(tryParse(data));
    });

    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve({});
    });

    process.stdin.resume();
  });
}

function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

async function main() {
  await readStdin();

  const candidates = [
    path.join(repoRoot, '.git', 'bulletproof_pending_swarm.json'),
    path.join(repoRoot, '.agents', 'bulletproof_pending_swarm.json')
  ];

  let state = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        state = JSON.parse(fs.readFileSync(p, 'utf-8'));
        break;
      } catch {
        // continue
      }
    }
  }

  const lastAuditedPath = path.join(repoRoot, '.git', 'bulletproof_last_audited_commit.txt');
  let lastAuditedSha = '';
  if (fs.existsSync(lastAuditedPath)) {
    try {
      lastAuditedSha = fs.readFileSync(lastAuditedPath, 'utf-8').trim();
    } catch {
      // ignore
    }
  }

  if (state && state.pendingAntigravitySwarm && state.commitSha !== lastAuditedSha) {
    const retrofitsText = state.hasRetrofitsOrDeletions
      ? `ALERTA: Foram detetados ficheiros removidos/renomeados (${state.deletedFiles.join(', ') || state.renamedFiles.join(', ')})!`
      : 'Nenhuma remoção estrutural detetada.';

    const message = [
      `🚨 [TRIGGER AUTOMÁTICO DO INPROOVAL BULLETPROOF AGENT SWARM]`,
      `Um novo git commit foi detetado no repositório App-Padaria:`,
      `- Commit: [${state.shortSha}] ${state.message}`,
      `- Autor: ${state.author} | Data: ${state.timestamp}`,
      `- Ficheiros Alterados: ${state.changedFilesCount}`,
      `- Retrofits / Deprecações: ${retrofitsText}`,
      `- Compilação TypeScript: ${state.tscPassed ? 'PASS (0 erros)' : 'FALHA DE TIPOS'}`,
      ``,
      `PROTOCOLO MANDATÓRIO INPROOVAL:`,
      `O Swarm de Agentes Bulletproof foi ativado automaticamente para este commit. O assistente Antigravity deve:`,
      `1. Validar impactos funcionais (Agente 1: KDS / Produção por Loja / Carrinhas; Agente 5: Epson TM-T20 & Offline).`,
      `2. Validar integridade e segurança (Agente 2: Supabase; Agente 3: OWASP Headers; Agente 4: RGPD).`,
      `3. Rastrear retrofits no Deprecation Ledger e sincronizar a documentação viva (Agente 6: FinOps; Agente 7: Living Docs em docs/01 a docs/06).`,
      `4. Executar 'node scripts/bulletproof-complete.mjs' (ou 'npm run swarm:done') para registar a auditoria como concluída com sucesso.`
    ].join('\n');

    const output = {
      injectSteps: [
        {
          ephemeralMessage: message
        }
      ]
    };

    console.log(JSON.stringify(output));
    return;
  }

  // No pending swarm trigger
  console.log(JSON.stringify({ injectSteps: [] }));
}

main().catch(() => {
  console.log(JSON.stringify({ injectSteps: [] }));
});
