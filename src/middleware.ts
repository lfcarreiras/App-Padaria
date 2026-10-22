import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  getInternalPathFromSecret, 
  isStandardBlockedRoute, 
  getSecretUrl 
} from './lib/secretRoutes';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Verificar se o caminho solicitado é um dos slugs secretos de alta entropia
  const internalPath = getInternalPathFromSecret(pathname);
  if (internalPath) {
    const rewriteUrl = new URL(internalPath + search, request.url);
    const response = NextResponse.rewrite(rewriteUrl);

    // Blindagem de Segurança contra Motores de Busca (Google, Bing, etc.)
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');

    return response;
  }

  // 2. Bloquear tentativas de acesso direto por nomes canónicos previsíveis (/producao, /gestao, etc.)
  if (isStandardBlockedRoute(pathname)) {
    // Redireciona imediatamente para o ecrã secreto de login
    const loginSecretUrl = new URL(getSecretUrl('login') + search, request.url);
    return NextResponse.redirect(loginSecretUrl);
  }

  // 3. Caso seja a raiz '/' ou outra rota válida (ex: rotas públicas de imagem), aplicar cabeçalhos de segurança
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate');
  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas de navegação da aplicação,
     * ignorando assets estáticos, bundles internos do Next.js e ficheiros de media.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
