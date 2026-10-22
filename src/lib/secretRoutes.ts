/**
 * Mapeamento Centralizado de Rotas Ofuscadas / Chaves Alfanuméricas de Alta Entropia
 * 
 * Requisitos de Segurança & Confidencialidade:
 * 1. O endereço da app é: app.padariadavila.com
 * 2. Cada ecrã possui uma extensão com chave alfanumérica longa (32 caracteres),
 *    que NÃO deriva do nome do ecrã e previne adivinhação ou cópia indevida.
 * 3. Rotas canónicas/padrão (/producao, /gestao, etc.) são bloqueadas contra acesso direto.
 * 4. Permite override através de variáveis de ambiente NEXT_PUBLIC_SLUG_* para rotação dinâmica.
 */

declare const process: any;

export interface SecretRouteDef {
  key: string;
  internalPath: string;
  defaultSlug: string;
  label: string;
  envVar: string;
}

export const ROUTE_DEFINITIONS: Record<string, SecretRouteDef> = {
  login: {
    key: 'login',
    internalPath: '/login',
    defaultSlug: 'a8f1b94d2e7c056384a1e9d2b704c8f1',
    label: 'Acesso Seguro ao Sistema',
    envVar: 'NEXT_PUBLIC_SLUG_LOGIN',
  },
  encomendas: {
    key: 'encomendas',
    internalPath: '/encomendas',
    defaultSlug: 'k9x4m7b1w8q2e5t0z3a6c9d2f1j8v4p7',
    label: 'Registo & Consulta de Encomendas',
    envVar: 'NEXT_PUBLIC_SLUG_ENCOMENDAS',
  },
  producao: {
    key: 'producao',
    internalPath: '/producao',
    defaultSlug: 'f2b8c9d1e4a7m0w5q3x6z8k1j9p2t4v7',
    label: 'KDS Fabrico & Pastelaria',
    envVar: 'NEXT_PUBLIC_SLUG_PRODUCAO',
  },
  loja: {
    key: 'loja',
    internalPath: '/loja',
    defaultSlug: 'b7c4d1e9f2a0385a6e81d74c82b14e90',
    label: 'Cockpit Balcão & Loja Física',
    envVar: 'NEXT_PUBLIC_SLUG_LOJA',
  },
  entregas: {
    key: 'entregas',
    internalPath: '/entregas',
    defaultSlug: 'r3e81a9f0b2c457d6e19034af58c19d2',
    label: 'Cockpit de Carrinhas & Distribuição',
    envVar: 'NEXT_PUBLIC_SLUG_ENTREGAS',
  },
  gestao: {
    key: 'gestao',
    internalPath: '/gestao',
    defaultSlug: 'g9d0e2f4a6b8c1357e9204b7f61c38e4',
    label: 'Cockpit de Gestão & Administração',
    envVar: 'NEXT_PUBLIC_SLUG_GESTAO',
  },
  cms: {
    key: 'cms',
    internalPath: '/cms',
    defaultSlug: 'm5c8e1a7d9f2b406e3a19c7f82b04d16',
    label: 'Studio CMS de Conteúdos',
    envVar: 'NEXT_PUBLIC_SLUG_CMS',
  },
  encomendar: {
    key: 'encomendar',
    internalPath: '/encomendar',
    defaultSlug: 'p4w8x1z0k7e2b5m9c3v6f1a8d0t2r4q9',
    label: 'Portal Público de Encomendas',
    envVar: 'NEXT_PUBLIC_SLUG_ENCOMENDAR',
  },
};

/**
 * Obtém o slug secreto ativo para uma chave ou caminho interno.
 */
export function getSecretSlug(keyOrInternalPath: string): string {
  const clean = keyOrInternalPath.replace(/^\//, '').trim().toLowerCase();
  
  // Se já for um slug secreto conhecido, devolve-o
  for (const def of Object.values(ROUTE_DEFINITIONS)) {
    const activeSlug = (typeof process !== 'undefined' && process.env?.[def.envVar]) || def.defaultSlug;
    if (activeSlug === clean) return activeSlug;
    if (def.key === clean || def.internalPath.replace(/^\//, '') === clean) {
      return activeSlug;
    }
  }

  // Fallback caso não seja reconhecido
  return ROUTE_DEFINITIONS.login.defaultSlug;
}

/**
 * Obtém o URL completo ofuscado (ex: '/f2b8c9d1e4a7m0w5q3x6z8k1j9p2t4v7')
 */
export function getSecretUrl(keyOrInternalPath: string): string {
  return `/${getSecretSlug(keyOrInternalPath)}`;
}

/**
 * Mapeia um slug secreto vindo do browser de volta para o caminho interno do Next.js
 * Devolve null se o slug não corresponder a nenhum ecrã registado.
 */
export function getInternalPathFromSecret(slugOrPath: string): string | null {
  const clean = slugOrPath.replace(/^\//, '').trim().toLowerCase();
  
  for (const def of Object.values(ROUTE_DEFINITIONS)) {
    const activeSlug = (typeof process !== 'undefined' && process.env?.[def.envVar]) || def.defaultSlug;
    if (activeSlug === clean) {
      return def.internalPath;
    }
  }
  return null;
}

/**
 * Lista de caminhos padrão legíveis que NÃO devem ser acedidos diretamente pelo utilizador
 */
export const BLOCKED_STANDARD_PATHS = new Set([
  '/login',
  '/encomendas',
  '/producao',
  '/loja',
  '/entregas',
  '/gestao',
  '/cms',
  '/balcao',
]);

/**
 * Verifica se um caminho é um caminho padrão bloqueado
 */
export function isStandardBlockedRoute(pathname: string): boolean {
  const clean = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return BLOCKED_STANDARD_PATHS.has(clean);
}

/**
 * Lista completa de todas as rotas e os seus URLs secretos para o Administrador
 */
export function getAllSecretRouteMappings() {
  return Object.values(ROUTE_DEFINITIONS).map((def) => {
    const activeSlug = (typeof process !== 'undefined' && process.env?.[def.envVar]) || def.defaultSlug;
    return {
      key: def.key,
      label: def.label,
      internalPath: def.internalPath,
      secretSlug: activeSlug,
      secretUrl: `/${activeSlug}`,
      fullAppUrl: `https://app.padariadavila.com/${activeSlug}`,
    };
  });
}
