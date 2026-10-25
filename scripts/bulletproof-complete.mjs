import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const gitDir = path.join(repoRoot, '.git');
const agentsDir = path.join(repoRoot, '.agents');

const pendingFiles = [
  path.join(gitDir, 'bulletproof_pending_swarm.json'),
  path.join(agentsDir, 'bulletproof_pending_swarm.json')
];

let commitSha = 'UNKNOWN';
let shortSha = 'UNKNOWN';
let commitMsg = '';

for (const p of pendingFiles) {
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      commitSha = data.commitSha || commitSha;
      shortSha = data.shortSha || shortSha;
      commitMsg = data.message || commitMsg;
      data.pendingAntigravitySwarm = false;
      data.auditedAt = new Date().toISOString();
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }
}

// Write last audited commit
try {
  fs.writeFileSync(path.join(gitDir, 'bulletproof_last_audited_commit.txt'), commitSha, 'utf-8');
} catch {
  // ignore
}

// Append to history
try {
  const logEntry = JSON.stringify({
    commitSha,
    shortSha,
    commitMsg,
    completedAt: new Date().toISOString(),
    status: 'AUDITED_BULLETPROOF'
  }) + '\n';
  fs.appendFileSync(path.join(gitDir, 'bulletproof_audit_history.jsonl'), logEntry, 'utf-8');
} catch {
  // ignore
}

console.log('\n================================================================================');
console.log('✅ INPROOVAL BULLETPROOF AGENT SWARM - AUDITORIA CONCLUÍDA');
console.log(`Commit: [${shortSha}] ${commitMsg}`);
console.log(`Estado: Arquivado com sucesso no histórico de auditoria contínua.`);
console.log('Pending Signal: LIMPO (pendingAntigravitySwarm = false)');
console.log('================================================================================\n');
