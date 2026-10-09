import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const REPO_OWNER = 'lfcarreiras';
const REPO_NAME = 'App-Padaria';
const TARGET_BRANCH = 'main';

interface CommitPayload {
  config: Record<string, any>;
  lojas: Array<Record<string, any>>;
  produtos: Array<Record<string, any>>;
  layout: Array<Record<string, any>>;
  commitMessage?: string;
  githubToken?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CommitPayload;
    const { config, lojas, produtos, layout, commitMessage, githubToken } = body;

    const msg = commitMessage?.trim() || `cms: atualização de conteúdos, lojas e montra (${new Date().toLocaleString('pt-PT')})`;
    const token = githubToken?.trim() || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';

    // Preparar mapa de ficheiros e conteúdos formatados
    const filesToCommit: Array<{ path: string; content: string }> = [];

    // 1. Config Geral
    if (config) {
      filesToCommit.push({
        path: 'content/config/geral.json',
        content: JSON.stringify(config, null, 2) + '\n',
      });
    }

    // 2. Layout & Blocos Drag and Drop
    if (layout && Array.isArray(layout)) {
      filesToCommit.push({
        path: 'content/blocos/layout.json',
        content: JSON.stringify(layout, null, 2) + '\n',
      });
    }

    // 3. Lojas
    if (lojas && Array.isArray(lojas)) {
      lojas.forEach((loja, idx) => {
        const slug = (loja.codigo || `loja-${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '-');
        filesToCommit.push({
          path: `content/lojas/${slug}.json`,
          content: JSON.stringify(loja, null, 2) + '\n',
        });
      });
    }

    // 4. Produtos de Montra / Catálogo Frontoffice
    if (produtos && Array.isArray(produtos)) {
      filesToCommit.push({
        path: 'content/produtos/catalogo.json',
        content: JSON.stringify(produtos, null, 2) + '\n',
      });
      produtos.forEach((prod, idx) => {
        const slug = (prod.nome || `produto-${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '-');
        filesToCommit.push({
          path: `content/produtos/${slug}.json`,
          content: JSON.stringify(prod, null, 2) + '\n',
        });
      });
    }

    // Gravar localmente se em ambiente local
    try {
      const rootDir = process.cwd();
      for (const f of filesToCommit) {
        const fullPath = path.join(rootDir, f.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, f.content, 'utf8');
      }
    } catch (fsErr) {
      console.warn('Aviso ao gravar ficheiros locais (normal em ambiente serverless):', fsErr);
    }

    // Se houver token GitHub configurado, criar commit atómico via GitHub REST API
    if (token) {
      const authHeader = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'App-Padaria-CMS/2.0',
      };

      // 1. Obter SHA da cabeça do branch main
      const refRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${TARGET_BRANCH}`, {
        headers: authHeader,
        cache: 'no-store',
      });

      if (!refRes.ok) {
        const errText = await refRes.text();
        return NextResponse.json(
          { 
            error: `Erro ao obter branch no GitHub (${refRes.status}): Verifique se o token tem permissão de leitura/escrita no repositório ${REPO_OWNER}/${REPO_NAME}.`, 
            details: errText 
          },
          { status: 400 }
        );
      }

      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      // 2. Obter SHA da Tree do commit atual
      const commitRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${latestCommitSha}`, {
        headers: authHeader,
        cache: 'no-store',
      });

      if (!commitRes.ok) {
        return NextResponse.json({ error: 'Erro ao obter dados do commit base no GitHub.' }, { status: 400 });
      }

      const commitData = await commitRes.json();
      const baseTreeSha = commitData.tree.sha;

      // 3. Criar nova Tree com os ficheiros atualizados
      const treePayload = {
        base_tree: baseTreeSha,
        tree: filesToCommit.map((f) => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          content: f.content,
        })),
      };

      const newTreeRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(treePayload),
      });

      if (!newTreeRes.ok) {
        const errText = await newTreeRes.text();
        return NextResponse.json({ error: 'Erro ao criar árvore de ficheiros no GitHub.', details: errText }, { status: 400 });
      }

      const newTreeData = await newTreeRes.json();
      const newTreeSha = newTreeData.sha;

      // 4. Criar o Commit
      const newCommitRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          tree: newTreeSha,
          parents: [latestCommitSha],
        }),
      });

      if (!newCommitRes.ok) {
        const errText = await newCommitRes.text();
        return NextResponse.json({ error: 'Erro ao gerar commit no GitHub.', details: errText }, { status: 400 });
      }

      const newCommitData = await newCommitRes.json();
      const newCommitSha = newCommitData.sha;

      // 5. Atualizar a referência do branch main para o novo commit
      const updateRefRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${TARGET_BRANCH}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      });

      if (!updateRefRes.ok) {
        const errText = await updateRefRes.text();
        return NextResponse.json({ error: 'Erro ao atualizar o branch main no GitHub.', details: errText }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        method: 'github_api',
        commitSha: newCommitSha.substring(0, 7),
        fullSha: newCommitSha,
        commitUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${newCommitSha}`,
        message: `Commit ${newCommitSha.substring(0, 7)} gravado com sucesso no GitHub! O deploy na Vercel foi iniciado automaticamente.`,
        filesCount: filesToCommit.length,
      });
    }

    // Se nenhum token for fornecido
    return NextResponse.json({
      success: false,
      needsToken: true,
      filesCount: filesToCommit.length,
      message: 'Ficheiros preparados com sucesso! Para publicar no GitHub e acionar a Vercel, introduza o seu GitHub Personal Access Token.',
    });
  } catch (error: any) {
    console.error('Erro na rota de commit do CMS:', error);
    return NextResponse.json(
      { error: error.message || 'Erro inesperado ao processar commit.' },
      { status: 500 }
    );
  }
}
