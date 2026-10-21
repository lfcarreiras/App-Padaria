'use client';

import React, { useState, useMemo } from 'react';
import { Produto } from '../types';
import { buscarArtigosOramaSync } from '../lib/oramaSearch';
import { Search, X, Sparkles, Check, ChefHat, CakeSlice, Zap, Tag } from 'lucide-react';

interface OramaQuickSearchModalProps {
  produtos: Produto[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProduto?: (produto: Produto) => void;
}

export function OramaQuickSearchModal({
  produtos,
  isOpen,
  onClose,
  onSelectProduto,
}: OramaQuickSearchModalProps) {
  const [termo, setTermo] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('todas');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const { resultados, tempoMs, totalEncontrados } = useMemo(() => {
    return buscarArtigosOramaSync(produtos, termo, categoria);
  }, [produtos, termo, categoria]);

  if (!isOpen) return null;

  const handleCopiarNome = (prod: Produto) => {
    navigator.clipboard.writeText(prod.nome);
    setCopiadoId(prod.id);
    setTimeout(() => setCopiadoId(null), 1800);
  };

  const sugestoesRapidas = ['trigamilha', 'pao norma', 'centeo', 'broa milho', 'croissant', 'padaria'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-amber-300 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 text-white backdrop-blur-xs">
              <Zap className="h-6 w-6 text-amber-200 fill-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Orama — Pesquisa Instantânea no Balcão
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-amber-100 text-[10px] font-bold">
                  86 Artigos
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Localização sub-milissegundo com tolerância total a gralhas, falta de espaços e acentos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Pesquisa Orama */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-5 w-5 text-amber-600" />
            <input
              type="text"
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Digite o artigo... (ex: trigamilha, pao norma, centeo, broa amarela)"
              className="w-full pl-11 pr-24 py-2.5 text-sm font-bold bg-white rounded-2xl border-2 border-amber-400 focus:outline-hidden focus:border-amber-600 text-gray-900 shadow-xs"
            />
            {termo && (
              <button
                type="button"
                onClick={() => setTermo('')}
                className="absolute right-3 top-2.5 px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Sugestões e Métricas */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-gray-500 font-bold text-[11px]">Testar gralhas:</span>
              {sugestoesRapidas.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTermo(sug)}
                  className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 hover:border-amber-400 font-medium text-[11px] text-gray-700 hover:text-amber-800 transition cursor-pointer shadow-2xs"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Badge de Latência Sub-milissegundo */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-[11px] font-black">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>{tempoMs} ms</span>
              <span className="text-emerald-600/70">({totalEncontrados} artigos)</span>
            </div>
          </div>

          {/* Filtro por Categoria */}
          <div className="flex gap-1.5 pt-1">
            {[
              { id: 'todas', label: 'Todos os Artigos' },
              { id: 'padaria', label: 'Pães & Broas (Padaria)' },
              { id: 'pastelaria', label: 'Doces & Bolos (Pastelaria)' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoria(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  categoria === cat.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 space-y-1">
          {resultados.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Search className="h-8 w-8 mx-auto text-gray-300 stroke-1" />
              <p className="text-sm font-bold text-gray-600">Nenhum artigo encontrado</p>
              <p className="text-xs text-gray-400">Tente ajustar a pesquisa ou limpar os filtros.</p>
            </div>
          ) : (
            resultados.map((prod) => (
              <div
                key={prod.id}
                className="py-2.5 px-3 rounded-2xl hover:bg-amber-50/60 transition flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      prod.categoria === 'pastelaria'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {prod.categoria === 'pastelaria' ? (
                      <CakeSlice className="h-4 w-4" />
                    ) : (
                      <ChefHat className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 group-hover:text-amber-950">
                      {prod.nome}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                      <span className="capitalize font-bold text-gray-600">{prod.categoria || 'Padaria'}</span>
                      <span>•</span>
                      <span>Unidade: {prod.unidade || 'unidade'}</span>
                      {prod.preco ? (
                        <>
                          <span>•</span>
                          <span className="font-bold text-emerald-700">{prod.preco.toFixed(2)} €</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopiarNome(prod)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer flex items-center gap-1"
                    title="Copiar nome do produto"
                  >
                    {copiadoId === prod.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-black">Copiado!</span>
                      </>
                    ) : (
                      <span>Copiar</span>
                    )}
                  </button>

                  {onSelectProduto && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduto(prod);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-black rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span>Selecionar</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 bg-amber-50/80 border-t border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
          <span className="font-bold">
            💡 Dica: Se o cliente pedir "trigamilha", digite sem hesitar — o Orama encontra o artigo correto no 1.º resultado.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold text-amber-950 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
