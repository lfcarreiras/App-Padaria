'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Carrinha, 
  BaseFixaCarrinha, 
  ClienteEmpresarialB2B, 
  Produto, 
  DiaSemana 
} from '../types';
import { correspondePesquisaArtigo } from '../lib/fuzzySearch';
import { 
  carregarAjustesAdhoc, 
  salvarAjusteAdhoc, 
  removerAjusteAdhoc,
  getChaveAdhocBase, 
  getChaveAdhocB2B,
  normalizarNomeArtigoCanonico
} from '../lib/encomendasService';
import { 
  Calendar, 
  Truck, 
  Building2, 
  RotateCcw, 
  Search, 
  Check, 
  Sparkles,
  Info,
  ShieldCheck,
  Filter
} from 'lucide-react';

export interface MatrizAjustesAdhocProps {
  carrinhas: Carrinha[];
  baseFixaCarrinhas: BaseFixaCarrinha[];
  clientesB2B: ClienteEmpresarialB2B[];
  produtos?: Produto[];
  onAjusteSalvo?: () => void;
  className?: string;
}

export function MatrizAjustesAdhoc({
  carrinhas,
  baseFixaCarrinhas,
  clientesB2B,
  produtos = [],
  onAjusteSalvo,
  className = '',
}: MatrizAjustesAdhocProps) {
  const [subAba, setSubAba] = useState<'base_rotas' | 'matriz_b2b'>('base_rotas');
  const [rotaFiltroId, setRotaFiltroId] = useState<string>('');
  const [pesquisaArtigo, setPesquisaArtigo] = useState<string>('');
  const [pesquisaCliente, setPesquisaCliente] = useState<string>('');
  const [ajustesAdhoc, setAjustesAdhoc] = useState<Record<string, number>>({});
  const [feedbackSalvo, setFeedbackSalvo] = useState<string | null>(null);

  // Filtrar carrinhas para garantir apenas Rotas 1 a 7 (Rota 8 eliminada)
  const carrinhasValidas = useMemo(() => {
    return carrinhas
      .filter((c) => {
        const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
        return num >= 1 && num <= 7 && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
      })
      .sort((a, b) => (a.numero || 0) - (b.numero || 0));
  }, [carrinhas]);

  // Inicializar rota selecionada
  useEffect(() => {
    if (carrinhasValidas.length > 0 && !rotaFiltroId) {
      setRotaFiltroId(carrinhasValidas[0].id);
    }
  }, [carrinhasValidas, rotaFiltroId]);

  // Carregar ajustes do localStorage
  const recarregarAjustes = () => {
    setAjustesAdhoc(carregarAjustesAdhoc());
  };

  useEffect(() => {
    recarregarAjustes();
    const handleSync = () => recarregarAjustes();
    window.addEventListener('app_ajustes_adhoc_atualizados', handleSync);
    return () => window.removeEventListener('app_ajustes_adhoc_atualizados', handleSync);
  }, []);

  // Janela móvel de 7 dias a partir de hoje
  const diasJanela = useMemo(() => {
    const list: {
      dataIso: string;
      diaSemana: DiaSemana;
      diaMes: string;
      diaSemanaCurto: string;
      labelColuna: string;
      isHoje: boolean;
    }[] = [];

    const hoje = new Date();
    const mapaDias: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dataIso = `${yyyy}-${mm}-${dd}`;

      const diaSemana = mapaDias[d.getDay()];
      const diaMes = `${dd}/${mm}`;
      const nomesDiasPt: Record<DiaSemana, string> = {
        seg: 'Seg',
        ter: 'Ter',
        qua: 'Qua',
        qui: 'Qui',
        sex: 'Sex',
        sab: 'Sáb',
        dom: 'Dom',
      };
      const diaSemanaCurto = nomesDiasPt[diaSemana] || diaSemana;
      const isHoje = i === 0;

      list.push({
        dataIso,
        diaSemana,
        diaMes,
        diaSemanaCurto,
        labelColuna: isHoje ? `${diaSemanaCurto} ${diaMes} (Hoje)` : `${diaSemanaCurto} ${diaMes}`,
        isHoje,
      });
    }

    return list;
  }, []);

  // Handler de alteração ad-hoc para Base de Rota
  const handleAlterarBaseAdhoc = (
    dataIso: string,
    carrinhaId: string,
    produtoNome: string,
    valorStr: string
  ) => {
    const chave = getChaveAdhocBase(dataIso, carrinhaId, produtoNome);
    if (valorStr.trim() === '') {
      removerAjusteAdhoc(chave);
    } else {
      const num = parseInt(valorStr, 10);
      if (!isNaN(num)) {
        salvarAjusteAdhoc(chave, Math.max(0, num));
      }
    }
    recarregarAjustes();
    setFeedbackSalvo(`Ajuste guardado para ${produtoNome} (${dataIso})`);
    setTimeout(() => setFeedbackSalvo(null), 2500);
    if (onAjusteSalvo) onAjusteSalvo();
  };

  // Reverter ajuste ad-hoc para Base de Rota
  const handleReverterBaseAdhoc = (dataIso: string, carrinhaId: string, produtoNome: string) => {
    const chave = getChaveAdhocBase(dataIso, carrinhaId, produtoNome);
    removerAjusteAdhoc(chave);
    recarregarAjustes();
    setFeedbackSalvo(`Restaurado valor baseline para ${produtoNome}`);
    setTimeout(() => setFeedbackSalvo(null), 2500);
    if (onAjusteSalvo) onAjusteSalvo();
  };

  // Handler de alteração ad-hoc para Cliente B2B
  const handleAlterarB2BAdhoc = (
    dataIso: string,
    clienteB2BId: string,
    produtoNome: string,
    valorStr: string
  ) => {
    const chave = getChaveAdhocB2B(dataIso, clienteB2BId, produtoNome);
    if (valorStr.trim() === '') {
      removerAjusteAdhoc(chave);
    } else {
      const num = parseInt(valorStr, 10);
      if (!isNaN(num)) {
        salvarAjusteAdhoc(chave, Math.max(0, num));
      }
    }
    recarregarAjustes();
    setFeedbackSalvo(`Ajuste B2B guardado para ${produtoNome} (${dataIso})`);
    setTimeout(() => setFeedbackSalvo(null), 2500);
    if (onAjusteSalvo) onAjusteSalvo();
  };

  // Reverter ajuste ad-hoc para Cliente B2B
  const handleReverterB2BAdhoc = (dataIso: string, clienteB2BId: string, produtoNome: string) => {
    const chave = getChaveAdhocB2B(dataIso, clienteB2BId, produtoNome);
    removerAjusteAdhoc(chave);
    recarregarAjustes();
    setFeedbackSalvo(`Restaurado valor baseline B2B para ${produtoNome}`);
    setTimeout(() => setFeedbackSalvo(null), 2500);
    if (onAjusteSalvo) onAjusteSalvo();
  };

  // Carrinha selecionada para a Base Diária
  const carrinhaAtiva = useMemo(() => {
    return carrinhasValidas.find((c) => c.id === rotaFiltroId) || carrinhasValidas[0];
  }, [carrinhasValidas, rotaFiltroId]);

  // Base fixa da carrinha selecionada
  const baseFixaAtiva = useMemo(() => {
    if (!carrinhaAtiva) return null;
    return baseFixaCarrinhas.find((b) => b.carrinha_id === carrinhaAtiva.id) || null;
  }, [baseFixaCarrinhas, carrinhaAtiva]);

  // Lista de produtos presentes na base fixa desta carrinha
  const produtosDaBase = useMemo(() => {
    const setProds = new Set<string>();
    if (baseFixaAtiva?.quantidades_semanais) {
      Object.values(baseFixaAtiva.quantidades_semanais).forEach((mapa) => {
        if (mapa) {
          Object.keys(mapa).forEach((p) => setProds.add(normalizarNomeArtigoCanonico(p)));
        }
      });
    }
    if (baseFixaAtiva?.quantidades_por_produto) {
      Object.keys(baseFixaAtiva.quantidades_por_produto).forEach((p) => setProds.add(normalizarNomeArtigoCanonico(p)));
    }
    // Adicionar também quaisquer produtos que tenham ajustes adhoc registados para esta carrinha
    Object.keys(ajustesAdhoc).forEach((k) => {
      if (carrinhaAtiva && k.includes(`_${carrinhaAtiva.id}_`)) {
        const partes = k.split(`_${carrinhaAtiva.id}_`);
        if (partes[1]) setProds.add(normalizarNomeArtigoCanonico(partes[1]));
      }
    });

    let lista = Array.from(setProds);
    if (pesquisaArtigo.trim()) {
      lista = lista.filter((p) => correspondePesquisaArtigo(p, pesquisaArtigo));
    }

    return lista.sort((a, b) => a.localeCompare(b));
  }, [baseFixaAtiva, ajustesAdhoc, carrinhaAtiva, pesquisaArtigo]);

  // Lista de Clientes B2B filtrados
  const clientesB2BFiltrados = useMemo(() => {
    let list = clientesB2B.filter((cli) => {
      // Filtrar Rota 8
      if (cli.carrinha_id) {
        const car = carrinhas.find((c) => c.id === cli.carrinha_id);
        if (car && (car.rota === 'Rota 8' || car.numero === 8)) return false;
      }
      return cli.ativo;
    });

    if (rotaFiltroId && rotaFiltroId !== 'todas') {
      list = list.filter((cli) => cli.carrinha_id === rotaFiltroId);
    }

    if (pesquisaCliente.trim()) {
      const q = pesquisaCliente.toLowerCase().trim();
      list = list.filter(
        (cli) =>
          cli.nome.toLowerCase().includes(q) ||
          correspondePesquisaArtigo(cli.nome, pesquisaCliente) ||
          (cli.morada && cli.morada.toLowerCase().includes(q))
      );
    }

    return list;
  }, [clientesB2B, rotaFiltroId, pesquisaCliente, carrinhas]);

  // Total de ajustes adhoc ativos
  const totalAjustesAtivos = useMemo(() => {
    return Object.keys(ajustesAdhoc).length;
  }, [ajustesAdhoc]);

  return (
    <div className={`rounded-3xl bg-white border border-stone-200 shadow-md overflow-hidden ${className}`}>
      {/* CABEÇALHO DO COMPONENTE */}
      <div className="p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Ajustes Pontuais à Recorrência de Entregas</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-bold uppercase tracking-wider">
                  Próximos 7 Dias
                </span>
              </h2>
              <p className="text-xs text-stone-300 mt-0.5">
                Faça alterações pontuais de quantidades para datas específicas sem alterar a base diária definida para cada cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Badges de Estado e Base Protegida */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-stone-200 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Base Recorrente Protegida</span>
          </div>

          {totalAjustesAtivos > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{totalAjustesAtivos} {totalAjustesAtivos === 1 ? 'ajuste ativo' : 'ajustes ativos'}</span>
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK DE AJUSTE SALVO */}
      {feedbackSalvo && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{feedbackSalvo}</span>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO DE SUB-ABAS */}
      <div className="p-3 sm:px-6 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-stone-200/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setSubAba('base_rotas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              subAba === 'base_rotas'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Base Diária por Rota (7 Dias)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubAba('matriz_b2b')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              subAba === 'matriz_b2b'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Clientes Empresariais (7 Dias)</span>
          </button>
        </div>

        {/* Seletor de Rota */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-600">Rota:</span>
          <select
            value={rotaFiltroId}
            onChange={(e) => setRotaFiltroId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-black text-stone-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {subAba === 'matriz_b2b' && <option value="todas">Todas as Rotas (1 a 7)</option>}
            {carrinhasValidas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rota || c.identificador} — {c.nome_carro || c.matricula}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-ABA 1: BASE DIÁRIA POR ROTA (CALENDARIZADA A 7 DIAS)               */}
      {/* ===================================================================== */}
      {subAba === 'base_rotas' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <span>Base Diária: {carrinhaAtiva?.rota || 'Rota Selecionada'} ({carrinhaAtiva?.matricula})</span>
              </h3>
              <p className="text-[11px] text-stone-500">
                Altere diretamente o número na célula para aplicar um ajuste pontual nesta data de calendário.
              </p>
            </div>

            {/* Barra de Pesquisa de Artigo */}
            <div className="relative max-w-xs w-full">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={pesquisaArtigo}
                onChange={(e) => setPesquisaArtigo(e.target.value)}
                placeholder="Pesquisar artigo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* TABELA DE BASE DIÁRIA COM COLUNAS DE DIAS DO MÊS */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-800 font-black border-b border-stone-200">
                  <th className="py-3 px-4 sticky left-0 bg-stone-100 z-10 min-w-[180px]">
                    Artigo / Produto
                  </th>
                  {diasJanela.map((col) => (
                    <th
                      key={col.dataIso}
                      className={`py-2 px-2 text-center min-w-[90px] border-l border-stone-200 ${
                        col.isHoje ? 'bg-amber-100/70 text-amber-950 font-black' : ''
                      }`}
                    >
                      <span className="block text-[11px] font-black">{col.diaSemanaCurto}</span>
                      <span className="block text-[10px] font-mono text-stone-500">{col.diaMes}</span>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-black w-24 border-l border-stone-200 bg-stone-100">
                    Total 7D
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {produtosDaBase.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400 italic">
                      Nenhum artigo encontrado para esta rota na base diária.
                    </td>
                  </tr>
                ) : (
                  produtosDaBase.map((produtoNome, idx) => {
                    let totalLinha7Dias = 0;

                    return (
                      <tr
                        key={produtoNome}
                        className={idx % 2 === 0 ? 'bg-white hover:bg-stone-50' : 'bg-stone-50/50 hover:bg-stone-100/50'}
                      >
                        <td className="py-2.5 px-4 font-bold text-stone-900 sticky left-0 bg-inherit z-10">
                          {produtoNome}
                        </td>

                        {diasJanela.map((col) => {
                          const chave = getChaveAdhocBase(col.dataIso, carrinhaAtiva.id, produtoNome);
                          const temAdhoc = ajustesAdhoc[chave] !== undefined;

                          // Baseline semanal
                          const semana = baseFixaAtiva?.quantidades_semanais || baseFixaAtiva?.quantidades_semana || {};
                          const mapaDia = semana[col.diaSemana] || baseFixaAtiva?.quantidades_por_produto || {};
                          let baselineVal = Number(mapaDia[produtoNome] || 0);
                          if (baselineVal === 0 && mapaDia) {
                            for (const [k, v] of Object.entries(mapaDia)) {
                              if (normalizarNomeArtigoCanonico(k) === produtoNome) {
                                baselineVal = Number(v) || 0;
                                break;
                              }
                            }
                          }

                          const valorEfetivo = temAdhoc ? Number(ajustesAdhoc[chave]) : baselineVal;
                          totalLinha7Dias += valorEfetivo;

                          return (
                            <td
                              key={col.dataIso}
                              className={`py-1.5 px-1.5 text-center border-l border-stone-200 ${
                                col.isHoje ? 'bg-amber-50/40' : ''
                              } ${temAdhoc ? 'bg-amber-100/60 ring-1 ring-amber-400/60' : ''}`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={valorEfetivo}
                                  onChange={(e) =>
                                    handleAlterarBaseAdhoc(
                                      col.dataIso,
                                      carrinhaAtiva.id,
                                      produtoNome,
                                      e.target.value
                                    )
                                  }
                                  className={`w-14 text-center py-1 px-1 rounded-lg text-xs font-mono font-black border transition ${
                                    temAdhoc
                                      ? 'bg-amber-50 border-amber-500 text-amber-950 font-black shadow-xs'
                                      : 'bg-white border-stone-300 text-stone-900 hover:border-amber-400'
                                  }`}
                                  title={
                                    temAdhoc
                                      ? `Ajustado pontualmente para ${col.dataIso}! (Base diária: ${baselineVal} un.)`
                                      : `Valor de base diária: ${baselineVal} un.`
                                  }
                                />

                                {temAdhoc && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReverterBaseAdhoc(col.dataIso, carrinhaAtiva.id, produtoNome)
                                    }
                                    className="p-1 rounded text-stone-400 hover:text-amber-800 hover:bg-amber-200 transition cursor-pointer"
                                    title={`Reverter para base diária (${baselineVal} un.)`}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {temAdhoc && (
                                <span className="block text-[9px] font-black text-amber-700 tracking-tight mt-0.5">
                                  Ajustado
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-right font-mono font-black text-stone-900 border-l border-stone-200 bg-inherit">
                          {totalLinha7Dias} un.
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-ABA 2: CLIENTES EMPRESARIAIS B2B (CALENDARIZADA A 7 DIAS)          */}
      {/* ===================================================================== */}
      {subAba === 'matriz_b2b' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>Clientes Empresariais — Calendário 7 Dias</span>
              </h3>
              <p className="text-[11px] text-stone-500">
                Ajuste pontualmente as encomendas para Lares, Hospitais e Empresas sem mexer no contrato baseline semanal.
              </p>
            </div>

            {/* Barra de Pesquisa de Cliente */}
            <div className="relative max-w-xs w-full">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={pesquisaCliente}
                onChange={(e) => setPesquisaCliente(e.target.value)}
                placeholder="Pesquisar cliente empresarial..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {clientesB2BFiltrados.length === 0 ? (
            <div className="p-8 text-center text-stone-400 italic bg-stone-50 rounded-2xl border border-stone-200">
              Nenhum cliente empresarial B2B encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-6">
              {clientesB2BFiltrados.map((cli) => {
                const carrinhaDoCli = carrinhasValidas.find((c) => c.id === cli.carrinha_id);
                const semana = cli.quantidades_semanais || cli.quantidades_semana || {};

                // Coletar produtos deste cliente
                const setProdsCli = new Set<string>();
                Object.values(semana).forEach((m) => {
                  if (m) {
                    Object.keys(m).forEach((p) => setProdsCli.add(normalizarNomeArtigoCanonico(p)));
                  }
                });
                // Adicionar artigos que tenham adhoc para este cliente
                Object.keys(ajustesAdhoc).forEach((k) => {
                  if (k.includes(`_${cli.id}_`)) {
                    const partes = k.split(`_${cli.id}_`);
                    if (partes[1]) setProdsCli.add(normalizarNomeArtigoCanonico(partes[1]));
                  }
                });

                const listaArtigos = Array.from(setProdsCli).sort((a, b) => a.localeCompare(b));

                return (
                  <div
                    key={cli.id}
                    className="rounded-2xl border border-purple-200 bg-white overflow-hidden shadow-2xs"
                  >
                    {/* Cabeçalho do Cliente */}
                    <div className="p-3 bg-purple-50/80 border-b border-purple-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-700 shrink-0" />
                        <div>
                          <span className="font-black text-xs text-purple-950">{cli.nome}</span>
                          <span className="text-[10px] text-stone-500 block">
                            {cli.morada} {cli.telefone ? `• Tel: ${cli.telefone}` : ''} {cli.nif ? `• NIF: ${cli.nif}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white border border-purple-200 text-purple-900">
                          {carrinhaDoCli?.rota || 'Sem Rota Fixa'}
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Produtos deste Cliente */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50 text-stone-700 font-bold border-b border-stone-200 text-[11px]">
                            <th className="py-2 px-3 sticky left-0 bg-stone-50 z-10 min-w-[160px]">
                              Artigo Contratado
                            </th>
                            {diasJanela.map((col) => (
                              <th
                                key={col.dataIso}
                                className={`py-1.5 px-2 text-center min-w-[85px] border-l border-stone-200 ${
                                  col.isHoje ? 'bg-purple-100/60 font-black text-purple-950' : ''
                                }`}
                              >
                                <span className="block text-[10px] font-black">{col.diaSemanaCurto}</span>
                                <span className="block text-[9px] font-mono text-stone-500">{col.diaMes}</span>
                              </th>
                            ))}
                            <th className="py-2 px-3 text-right font-bold w-20 border-l border-stone-200 bg-stone-50">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {listaArtigos.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-4 text-center text-stone-400 italic">
                                Sem artigos fixos registados para este cliente.
                              </td>
                            </tr>
                          ) : (
                            listaArtigos.map((artigo, idxArt) => {
                              let totalArtigo7Dias = 0;

                              return (
                                <tr
                                  key={artigo}
                                  className={idxArt % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}
                                >
                                  <td className="py-2 px-3 font-semibold text-stone-900 sticky left-0 bg-inherit z-10">
                                    {artigo}
                                  </td>

                                  {diasJanela.map((col) => {
                                    const chave = getChaveAdhocB2B(col.dataIso, cli.id, artigo);
                                    const temAdhoc = ajustesAdhoc[chave] !== undefined;

                                    const mapaDia = semana[col.diaSemana] || {};
                                    let baselineVal = Number(mapaDia[artigo] || 0);
                                    if (baselineVal === 0 && mapaDia) {
                                      for (const [k, v] of Object.entries(mapaDia)) {
                                        if (normalizarNomeArtigoCanonico(k) === artigo) {
                                          baselineVal = Number(v) || 0;
                                          break;
                                        }
                                      }
                                    }

                                    const valorEfetivo = temAdhoc ? Number(ajustesAdhoc[chave]) : baselineVal;
                                    totalArtigo7Dias += valorEfetivo;

                                    return (
                                      <td
                                        key={col.dataIso}
                                        className={`py-1 px-1.5 text-center border-l border-stone-200 ${
                                          col.isHoje ? 'bg-purple-50/30' : ''
                                        } ${temAdhoc ? 'bg-amber-100/70 ring-1 ring-amber-400' : ''}`}
                                      >
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            value={valorEfetivo}
                                            onChange={(e) =>
                                              handleAlterarB2BAdhoc(
                                                col.dataIso,
                                                cli.id,
                                                artigo,
                                                e.target.value
                                              )
                                            }
                                            className={`w-14 text-center py-0.5 px-1 rounded text-xs font-mono font-bold border transition ${
                                              temAdhoc
                                                ? 'bg-amber-50 border-amber-500 text-amber-950 font-black'
                                                : 'bg-white border-stone-300 text-stone-900 hover:border-purple-400'
                                            }`}
                                            title={
                                              temAdhoc
                                                ? `Ajustado pontualmente para ${col.dataIso}! (Base diária: ${baselineVal} un.)`
                                                : `Valor base diária: ${baselineVal} un.`
                                            }
                                          />

                                          {temAdhoc && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleReverterB2BAdhoc(col.dataIso, cli.id, artigo)
                                              }
                                              className="p-0.5 rounded text-stone-400 hover:text-amber-800 hover:bg-amber-200 transition cursor-pointer"
                                              title={`Reverter para base diária (${baselineVal} un.)`}
                                            >
                                              <RotateCcw className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                        {temAdhoc && (
                                          <span className="block text-[9px] font-black text-amber-700 tracking-tight mt-0.5 text-center">
                                            Ajustado
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  <td className="py-2 px-3 text-right font-mono font-black text-purple-950 border-l border-stone-200 bg-inherit">
                                    {totalArtigo7Dias} un.
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
