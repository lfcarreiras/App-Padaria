'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/Navbar';
import { ShoppingBag, ChefHat, Truck, BarChart3, ArrowRight, Store, Clock, Printer } from 'lucide-react';
import { LOJAS_MOCK } from '../lib/mockData';
import { carregarEncomendasSupabase } from '../lib/encomendasService';
import { Encomenda } from '../types';

export default function HomePage() {
  const [selectedLojaId, setSelectedLojaId] = useState('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);

  useEffect(() => {
    async function carregar() {
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    }
    carregar();
  }, []);

  const encomendasFiltradas = selectedLojaId === 'todas'
    ? encomendas
    : encomendas.filter((e) => e.loja_id === selectedLojaId);

  const totalHoje = encomendasFiltradas.reduce((acc, curr) => acc + curr.total, 0);
  const totalEntregas = encomendasFiltradas.filter((e) => e.tipo === 'entrega_domicilio').length;
  const totalLevantamentos = encomendasFiltradas.filter((e) => e.tipo === 'levantamento_loja').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6">
        {/* Banner de Boas-vindas */}
        <div className="rounded-3xl bg-linear-to-r from-bakery-800 via-bakery-700 to-bakery-600 p-6 sm:p-10 text-white shadow-xl mb-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-xs mb-4">
              <Store className="h-3.5 w-3.5" /> 4 Lojas Interligadas
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Gestão de Encomendas, Produção & Carrinhas
            </h2>
            <p className="mt-3 text-sm sm:text-base text-bakery-100">
              Plataforma centralizada com operação local: balcão com impressão térmica de talões, ecrãs KDS de padaria e pastelaria, e rotas GPS para carrinhas.
            </p>
          </div>
        </div>

        {/* Resumo Rápido de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-bakery-200 shadow-xs">
            <p className="text-xs font-medium text-gray-500">Encomendas Hoje</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{encomendasFiltradas.length}</p>
            <p className="text-xs text-bakery-600 font-medium mt-1">
              {selectedLojaId === 'todas' ? 'Todas as 4 lojas' : LOJAS_MOCK.find(l => l.id === selectedLojaId)?.nome}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-bakery-200 shadow-xs">
            <p className="text-xs font-medium text-gray-500">Total Faturado Agendado</p>
            <p className="text-2xl font-bold text-bakery-700 mt-1">{totalHoje.toFixed(2)} €</p>
            <p className="text-xs text-gray-500 mt-1">Soma do dia</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-bakery-200 shadow-xs">
            <p className="text-xs font-medium text-gray-500">Entregas ao Domicílio</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalEntregas}</p>
            <p className="text-xs text-gray-500 mt-1">Carrinhas afetas</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-bakery-200 shadow-xs">
            <p className="text-xs font-medium text-gray-500">Levantamentos em Loja</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{totalLevantamentos}</p>
            <p className="text-xs text-gray-500 mt-1">Prontos no balcão</p>
          </div>
        </div>

        {/* Cartões de Acesso aos 4 Módulos Principais */}
        <h3 className="text-lg font-bold text-gray-900 mb-4">Módulos Operacionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Módulo 1: Balcão */}
          <Link
            href="/balcao"
            className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 border border-bakery-200 shadow-xs hover:shadow-lg hover:border-bakery-400 transition"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bakery-100 text-bakery-600 group-hover:bg-bakery-600 group-hover:text-white transition">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-bold text-gray-900 group-hover:text-bakery-600 transition">
                Balcão & Telefone
              </h4>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Registo ágil de novos pedidos, busca rápida por telefone e impressão imediata de talões térmicos (80mm).
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-bakery-600">
              Abrir Balcão <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 2: Cozinha KDS */}
          <Link
            href="/producao"
            className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 border border-bakery-200 shadow-xs hover:shadow-lg hover:border-bakery-400 transition"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
                <ChefHat className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-bold text-gray-900 group-hover:text-amber-600 transition">
                Cozinha & KDS
              </h4>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Filas táteis de produção para Padaria e Pastelaria da loja. Alertas em tempo real e notas de bolos personalizados.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-amber-600">
              Abrir KDS Cozinha <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 3: Carrinhas de Entrega */}
          <Link
            href="/entregas"
            className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 border border-bakery-200 shadow-xs hover:shadow-lg hover:border-bakery-400 transition"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                <Truck className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-bold text-gray-900 group-hover:text-blue-600 transition">
                Carrinhas & Rotas
              </h4>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Interface mobile para os motoristas de cada loja. Navegação GPS com 1 clique e confirmação de entrega no cliente.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-blue-600">
              Abrir Painel Carrinhas <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 4: Gestão & Painel */}
          <Link
            href="/admin"
            className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 border border-bakery-200 shadow-xs hover:shadow-lg hover:border-bakery-400 transition"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-base font-bold text-gray-900 group-hover:text-purple-600 transition">
                Gestão & Relatórios
              </h4>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Relatórios consolidados das 4 lojas, gestão de catálogo de produtos e planeamento de produção diária.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-purple-600">
              Ver Relatórios <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
