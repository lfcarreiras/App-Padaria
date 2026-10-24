/**
 * Utilitário de Pesquisa Inteligente e Tolerância a Gralhas / Letras Trocadas (Fuzzy Search)
 * Padaria da Vila • Suporta acentuação, permutações (ex: 'bor' ou 'bro' -> 'Broa') e erros tipográficos.
 */

export function normalizarTextoFuzzy(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Distância Damerau-Levenshtein (suporta inserções, deleções, substituições e transposição de letras adjacentes)
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  if (Math.abs(al - bl) > 3) return 99; // Corte rápido

  const matrix: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1); // transposition (ex: 'bor' vs 'bro')
      }
    }
  }
  return matrix[al][bl];
}

function matchPalavra(palavra: string, token: string): boolean {
  if (palavra.includes(token)) return true;
  if (token.length < 2) return palavra.startsWith(token);

  // Prefixo com o mesmo tamanho do token (ex: 'bor' vs prefixo 'bro' de 'broa')
  const prefixo = palavra.slice(0, token.length);
  const distPrefixo = damerauLevenshtein(token, prefixo);
  const maxTol = token.length <= 3 ? 1 : token.length <= 5 ? 1 : 2;
  if (distPrefixo <= maxTol) return true;

  // Letras trocadas/anagrama no prefixo (ex: 'bor' -> 'bro')
  if (token.length <= 5 && prefixo.length === token.length) {
    const s1 = token.split('').sort().join('');
    const s2 = prefixo.split('').sort().join('');
    if (s1 === s2) return true;
  }

  // Tolerância sobre a palavra completa
  if (Math.abs(palavra.length - token.length) <= 2) {
    if (damerauLevenshtein(token, palavra) <= maxTol) return true;
  }

  return false;
}

/**
 * Valida se um nome de artigo corresponde ao termo pesquisado com tolerância a gralhas e letras trocadas.
 * Ex: correspondePesquisaArtigo("Broa de Milho", "bor") === true
 * Ex: correspondePesquisaArtigo("Broa de Milho", "bro") === true
 * Ex: correspondePesquisaArtigo("Pão de Trigo", "poa") === true
 */
export function correspondePesquisaArtigo(nomeArtigo: string, termoBusca: string): boolean {
  if (!termoBusca || !termoBusca.trim()) return true;

  const nomeNorm = normalizarTextoFuzzy(nomeArtigo);
  const termoNorm = normalizarTextoFuzzy(termoBusca);

  // Correspondência direta
  if (nomeNorm.includes(termoNorm)) return true;

  // Correspondência comprimida sem espaços (ex: "paotrig" -> "pao de trigo")
  const nomeComp = nomeNorm.replace(/[^a-z0-9]/g, '');
  const termoComp = termoNorm.replace(/[^a-z0-9]/g, '');
  if (termoComp.length >= 3 && nomeComp.includes(termoComp)) return true;

  const tokens = termoNorm.split(/\s+/).filter(Boolean);
  const palavras = nomeNorm.split(/[\s\-_\/,\.]+/).filter(Boolean);

  return tokens.every((tok) => palavras.some((pal) => matchPalavra(pal, tok)));
}
