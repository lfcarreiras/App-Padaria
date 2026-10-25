import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function getExecOutput(cmd) {
  try {
    return execSync(cmd, { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return null;
  }
}

try {
  const commitSha = getExecOutput('git rev-parse HEAD') || 'UNKNOWN';
  const shortSha = commitSha.slice(0, 7);
  const commitMsg = getExecOutput('git log -1 --pretty=format:%s') || 'No message';
  const authorName = getExecOutput('git log -1 --pretty=format:%an') || 'Unknown';
  const authorDate = getExecOutput('git log -1 --pretty=format:%aI') || new Date().toISOString();

  // Diff analysis of changed files in this commit
  const rawDiff = getExecOutput('git diff-tree --no-commit-id --name-status -r HEAD') || '';
  const diffLines = rawDiff.split('\n').filter(Boolean);

  const changedFiles = [];
  const deletedFiles = [];
  const renamedFiles = [];

  for (const line of diffLines) {
    const parts = line.trim().split(/\s+/);
    const status = parts[0];
    const file = parts.slice(1).join(' ');

    changedFiles.push({ status, file });
    if (status.startsWith('D')) {
      deletedFiles.push(file);
    } else if (status.startsWith('R')) {
      renamedFiles.push(file);
    }
  }

  // Fast typecheck
  let tscPassed = false;
  let tscOutput = '';
  try {
    const tscCmd = `node "${path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc')}" --project "${path.join(repoRoot, 'tsconfig.json')}" --noEmit`;
    execSync(tscCmd, { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    tscPassed = true;
  } catch (err) {
    tscPassed = false;
    tscOutput = err.stdout ? err.stdout.toString() : (err.message || 'Erro de tipos');
  }

  const payload = {
    commitSha,
    shortSha,
    message: commitMsg,
    author: authorName,
    timestamp: authorDate,
    changedFilesCount: changedFiles.length,
    changedFiles,
    deletedFiles,
    renamedFiles,
    hasRetrofitsOrDeletions: deletedFiles.length > 0 || renamedFiles.length > 0,
    tscPassed,
    pendingAntigravitySwarm: true,
    triggeredAt: new Date().toISOString()
  };

  // Persist state in .git and .agents
  const gitDir = path.join(repoRoot, '.git');
  const agentsDir = path.join(repoRoot, '.agents');

  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const targetFiles = [
    path.join(gitDir, 'bulletproof_pending_swarm.json'),
    path.join(agentsDir, 'bulletproof_pending_swarm.json')
  ];

  for (const target of targetFiles) {
    try {
      fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Ignore if write to git folder fails
    }
  }

  // Print console banner
  console.log('\n================================================================================');
  console.log('🚀 INPROOVAL BULLETPROOF AGENT SWARM - CONTINUOUS INTEGRITY ENGINE');
  console.log(`Commit: [${shortSha}] ${commitMsg}`);
  console.log(`Autor:  ${authorName} | Data: ${authorDate}`);
  console.log(`Ficheiros alterados: ${changedFiles.length}`);
  if (deletedFiles.length > 0 || renamedFiles.length > 0) {
    console.log(`⚠️  Retrofits / Ficheiros Removidos: ${deletedFiles.length} removidos, ${renamedFiles.length} renomeados`);
    deletedFiles.forEach(f => console.log(`   - Removido: ${f}`));
    renamedFiles.forEach(f => console.log(`   - Renomeado: ${f}`));
  } else {
    console.log('Integridade Estrutural: Sem remoções de ficheiros detetadas.');
  }

  if (tscPassed) {
    console.log('TypeScript Health: PASS (0 erros de tipagem estática)');
  } else {
    console.log('❌ TypeScript Health: FAILED (Erros detetados pelo compilador!)');
    console.log(tscOutput.slice(0, 400));
  }

  console.log('Sinalizador Swarm Antigravity: ATIVO (Pending Swarm Verification: true)');
  console.log('================================================================================\n');

} catch (globalErr) {
  console.warn('[Bulletproof Hook Warning]', globalErr.message);
}
