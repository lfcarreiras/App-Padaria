'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase, 
  carregarClientesSupabase, 
  carregarProdutosSupabase,
  salvarClienteDb,
  eliminarClienteDb,
  eliminarEncomendaDb,
  atualizarEncomendaDb,
  alternarTipoEntregaDb,
  registarLogAuditoria 
} from '../../lib/encomendasService';
import { Encomenda, Produto, ItemEncomenda, TipoEntrega, MetodoPagamento, Cliente } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Store, 
  Users, 
  Edit3, 
  ArrowRightLeft,
  Calendar,
  Phone,
  MapPin,
  X,
  Eye,
  MessageSquare,
  Copy,
  FileText
} from 'lucide-react';

export default function EncomendasPage() {
  const { t, language } = useTranslation();
  const { podeEditar, usuario } = useAuth();
  const currentUser = usuario || { id: 'user-balcao', nome: 'Marta Santos (Atendente Balcão)', role: 'atendente' };
  const temPermissaoEdicao = podeEditar('encomendas');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'novo' | 'clientes' | 'historico'>('novo');

  // Dados Globais
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [carregando, setCarregando] = useState(true);

  // Estados do Formulário de Novo Pedido
  const [carrinho, setCarrinho] = useState<ItemEncomenda[]>([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [moradaCliente, setMoradaCliente] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('levantamento_loja');
  const [dataAgendamento, setDataAgendamento] = useState(new Date().toISOString().split('T')[0]);
  const [horaAgendamento, setHoraAgendamento] = useState('10:00');
  const [notasGerais, setNotasGerais] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<'todas' | 'padaria' | 'pastelaria'>('todas');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [aGravar, setAGravar] = useState(false);

  // Modal de Importação do WhatsApp
  const [whatsappModalAberto, setWhatsappModalAberto] = useState(false);
  const [textoWhatsapp, setTextoWhatsapp] = useState('');

  // Modal de Talão
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Modal de Edição de Cliente
  const [clienteModal, setClienteModal] = useState<Partial<Cliente> | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  
  // Estados do Histórico de Encomendas
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [filtroPeriodoHistorico, setFiltroPeriodoHistorico] = useState<'todos' | 'hoje' | 'amanha' | 'semana' | 'personalizado'>('todos');
  const [dataInicioHistorico, setDataInicioHistorico] = useState('');
  const [dataFimHistorico, setDataFimHistorico] = useState('');
  const [encomendaEmEdicao, setEncomendaEmEdicao] = useState<Encomenda | null>(null);

  // Carregamento Inicial
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const [encs, clis, prods] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarClientesSupabase(),
        carregarProdutosSupabase(),
      ]);
      setEncomendas(encs);
      setClientes(clis);
      if (prods && prods.length > 0) setProdutos(prods);
      setCarregando(false);
    }
    carregar();

    const handleProdutosAtualizados = async () => {
      const prods = await carregarProdutosSupabase();
      if (prods && prods.length > 0) setProdutos(prods);
    };

    window.addEventListener('app_produtos_atualizados', handleProdutosAtualizados);
    return () => {
      window.removeEventListener('app_produtos_atualizados', handleProdutosAtualizados);
    };
  }, []);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];

  // Pesquisa automática de cliente no formulário de pedido
  const handleTelefoneChange = async (tel: string) => {
    setTelefoneCliente(tel);
    if (!supabase || tel.trim().length < 9) return;
    try {
      const { data: cli } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', tel.trim())
        .maybeSingle();

      if (cli) {
        setNomeCliente(cli.nome);
        if (cli.morada) setMoradaCliente(cli.morada);
        if (cli.notas_entrega) setNotasEntrega(cli.notas_entrega);
      }
    } catch (e) {
      console.warn('Erro ao pesquisar cliente:', e);
    }
  };

  // Funções do Carrinho
  const adicionarAoCarrinho = (prod: Produto) => {
    setCarrinho((prev) => {
      const existente = prev.find((item) => item.produto_id === prod.id);
      if (existente) {
        return prev.map((item) =>
          item.produto_id === prod.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          encomenda_id: '',
          produto_id: prod.id,
          produto_nome: prod.nome,
          setor: prod.categoria === 'padaria' ? 'padaria' : 'pastelaria',
          quantidade: 1,
          preco_unitario: prod.preco,
          estado_producao: 'pendente',
          notas_personalizacao: '',
        },
      ];
    });
  };

  const alterarQuantidade = (itemId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nova = item.quantidade + delta;
            return nova > 0 ? { ...item, quantidade: nova } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemEncomenda[]
    );
  };

  const atualizarNotaItem = (itemId: string, nota: string) => {
    setCarrinho((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, notas_personalizacao: nota } : i))
    );
  };

  // Modelo WhatsApp Padaria da Vila para copiar aos clientes
  const modeloWhatsapp = `*PEDIDO - PADARIA DA VILA*
Nome: [O seu nome]
Telefone: [O seu contacto telefónico]
Tipo: [Levantamento em Loja OU Entrega ao Domicílio]
Loja / Morada: [Praça / 25 de Abril / Arouca / Unidade Fabrico OU Morada completa em Arouca]
Data: [Hoje / Amanhã ou AAAA-MM-DD]
Hora: [ex: 08:30]
Artigos:
- 2x Pão de Arouca
- 1x Pão de Ló de Arouca
Observações: [ex: Pão fatiado / Frase no bolo / Campainha]`;

  const handleCopiarModelo = () => {
    navigator.clipboard.writeText(modeloWhatsapp);
    alert(t.whatsappTemplateCopied);
  };

  // Processar mensagem estruturada de WhatsApp colada pelo operador
  const handleProcessarWhatsapp = () => {
    if (!textoWhatsapp.trim()) return;

    const linhas = textoWhatsapp.split('\n').map((l) => l.trim()).filter(Boolean);

    let nomeEncontrado = '';
    let telEncontrado = '';
    let tipoEncontrado: TipoEntrega = 'levantamento_loja';
    let moradaEncontrada = '';
    let dataEncontrada = dataAgendamento;
    let horaEncontrada = horaAgendamento;
    let notasEncontradas = '';
    const itensParaAdicionar: ItemEncomenda[] = [];

    for (const linha of linhas) {
      const linhaLower = linha.toLowerCase();

      if (linhaLower.startsWith('nome:') || linhaLower.startsWith('cliente:')) {
        nomeEncontrado = linha.split(':')[1]?.trim().replace(/^\[|\]$/g, '') || '';
      } else if (
        linhaLower.startsWith('telefone:') ||
        linhaLower.startsWith('tel:') ||
        linhaLower.startsWith('contacto:') ||
        linhaLower.startsWith('telemovel:') ||
        linhaLower.startsWith('telemóvel:')
      ) {
        telEncontrado = linha.split(':')[1]?.trim().replace(/^\[|\]$/g, '') || '';
      } else if (linhaLower.startsWith('tipo:')) {
        const val = linha.split(':')[1]?.toLowerCase() || '';
        if (val.includes('entrega') || val.includes('domicilio') || val.includes('domicílio') || val.includes('carrinha')) {
          tipoEncontrado = 'entrega_domicilio';
        } else {
          tipoEncontrado = 'levantamento_loja';
        }
      } else if (
        linhaLower.startsWith('morada:') ||
        linhaLower.startsWith('loja / morada:') ||
        linhaLower.startsWith('endereco:') ||
        linhaLower.startsWith('endereço:')
      ) {
        moradaEncontrada = linha.split(':')[1]?.trim().replace(/^\[|\]$/g, '') || '';
      } else if (linhaLower.startsWith('data:')) {
        const val = linha.split(':')[1]?.trim().replace(/^\[|\]$/g, '') || '';
        if (val.toLowerCase() === 'hoje') {
          dataEncontrada = new Date().toISOString().split('T')[0];
        } else if (val.toLowerCase() === 'amanhã' || val.toLowerCase() === 'amanha') {
          const amanha = new Date();
          amanha.setDate(amanha.getDate() + 1);
          dataEncontrada = amanha.toISOString().split('T')[0];
        } else if (val.includes('-')) {
          dataEncontrada = val;
        } else if (val.includes('/')) {
          const [d, m, y] = val.split('/');
          if (d && m && y) {
            dataEncontrada = `${y.trim()}-${m.trim().padStart(2, '0')}-${d.trim().padStart(2, '0')}`;
          }
        }
      } else if (
        linhaLower.startsWith('hora:') ||
        linhaLower.startsWith('horário:') ||
        linhaLower.startsWith('horario:')
      ) {
        const val = linha.split(':')[1]?.trim().replace(/^\[|\]$/g, '') || '';
        const matchHora = val.match(/(\d{1,2})[h:](\d{2})?/i);
        if (matchHora) {
          const h = matchHora[1].padStart(2, '0');
          const m = matchHora[2] ? matchHora[2].padStart(2, '0') : '00';
          horaEncontrada = `${h}:${m}`;
        }
      } else if (
        linhaLower.startsWith('observações:') ||
        linhaLower.startsWith('observacoes:') ||
        linhaLower.startsWith('notas:') ||
        linhaLower.startsWith('obs:')
      ) {
        notasEncontradas = linha.split(':')[1]?.trim().replace(/^\[|\]$/g, '') || '';
      } else if (linha.startsWith('-') || linha.startsWith('•') || /^\d+\s*(x|un)\b/i.test(linha)) {
        const textoItem = linha.replace(/^[-•*]\s*/, '').trim();
        const matchQty = textoItem.match(/^(\d+)\s*(?:x|un)?\s+(.+)$/i);
        if (matchQty) {
          const qty = parseInt(matchQty[1], 10);
          const nomeArtigo = matchQty[2].replace(/\(.*?\)/g, '').trim();

          const prodEncontrado = produtos.find(
            (p) =>
              p.nome.toLowerCase().includes(nomeArtigo.toLowerCase()) ||
              nomeArtigo.toLowerCase().includes(p.nome.toLowerCase())
          );

          if (prodEncontrado) {
            itensParaAdicionar.push({
              id: `item-${Date.now()}-${Math.random()}`,
              encomenda_id: '',
              produto_id: prodEncontrado.id,
              produto_nome: prodEncontrado.nome,
              setor: prodEncontrado.categoria === 'padaria' ? 'padaria' : 'pastelaria',
              quantidade: qty,
              preco_unitario: 0,
              estado_producao: 'pendente',
              notas_personalizacao: '',
            });
          } else {
            notasEncontradas = notasEncontradas
              ? `${notasEncontradas} | ${qty}x ${nomeArtigo}`
              : `${qty}x ${nomeArtigo}`;
          }
        }
      }
    }

    if (nomeEncontrado) setNomeCliente(nomeEncontrado);
    if (telEncontrado) handleTelefoneChange(telEncontrado);
    if (tipoEncontrado) setTipoEntrega(tipoEncontrado);
    if (moradaEncontrada) setMoradaCliente(moradaEncontrada);
    if (dataEncontrada) setDataAgendamento(dataEncontrada);
    if (horaEncontrada) setHoraAgendamento(horaEncontrada);
    if (notasEncontradas) setNotasGerais(notasEncontradas);

    if (itensParaAdicionar.length > 0) {
      setCarrinho((prev) => [...prev, ...itensParaAdicionar]);
    }

    setWhatsappModalAberto(false);
    setTextoWhatsapp('');
    alert('Pedido do WhatsApp processado com sucesso! Verifique os dados no formulário.');
  };

  // Submeter Encomenda
  const handleGravarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente || !telefoneCliente) {
      alert('Por favor, indica pelo menos o nome e o telefone do cliente.');
      return;
    }
    if (carrinho.length === 0) {
      alert('Adiciona pelo menos um produto à encomenda.');
      return;
    }

    setAGravar(true);

    try {
      let clienteId = null;
      const codigoGerado = `ENC-${lojaAtual.codigo}-${Math.floor(1000 + Math.random() * 9000)}`;
      const encomendaId = `enc-${Date.now()}`;

      if (supabase) {
        // 1. Guardar ou Atualizar Cliente
        const { data: cliExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefone', telefoneCliente.trim())
          .maybeSingle();

        if (cliExistente) {
          clienteId = cliExistente.id;
          const updates: any = { nome: nomeCliente.trim() };
          if (tipoEntrega === 'entrega_domicilio') {
            updates.morada = moradaCliente.trim() || null;
            updates.notas_entrega = notasEntrega.trim() || null;
          }
          await supabase.from('clientes').update(updates).eq('id', clienteId);
        } else {
          const { data: novoCli } = await supabase
            .from('clientes')
            .insert({
              nome: nomeCliente.trim(),
              telefone: telefoneCliente.trim(),
              morada: tipoEntrega === 'entrega_domicilio' ? moradaCliente.trim() : null,
              notas_entrega: tipoEntrega === 'entrega_domicilio' ? notasEntrega.trim() : null,
            })
            .select('id')
            .single();
          if (novoCli) clienteId = novoCli.id;
        }

        // 2. Resolver UUID da Loja e Carrinha
        const { data: lojaDb } = await supabase
          .from('lojas')
          .select('id')
          .eq('codigo', lojaAtual.codigo)
          .maybeSingle();

        const lojaIdFinal = lojaDb?.id || lojaAtual.id;

        let carrinhaIdFinal: string | null = null;
        if (tipoEntrega === 'entrega_domicilio') {
          const { data: carDb } = await supabase
            .from('carrinhas')
            .select('id')
            .eq('loja_id', lojaIdFinal)
            .limit(1)
            .maybeSingle();
          if (carDb) carrinhaIdFinal = carDb.id;
        }

        // 3. Inserir Encomenda
        const { data: encDb, error: errEnc } = await supabase
          .from('encomendas')
          .insert({
            codigo: codigoGerado,
            loja_id: lojaIdFinal,
            cliente_id: clienteId,
            tipo: tipoEntrega,
            carrinha_id: carrinhaIdFinal,
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
            estado: 'pendente',
            estado_pagamento: 'pago',
            total: 0,
            notas_cliente: notasGerais.trim() || null,
          })
          .select('id, codigo')
          .single();

        if (errEnc) throw errEnc;

        // 4. Inserir Itens
        if (encDb) {
          const itensPayload = carrinho.map((item) => ({
            encomenda_id: encDb.id,
            produto_id: item.produto_id,
            setor: item.setor,
            quantidade: item.quantidade,
            preco_unitario: 0,
            notas_personalizacao: item.notas_personalizacao || null,
            estado_producao: 'pendente',
          }));

          await supabase.from('itens_encomenda').insert(itensPayload);
        }
      }

      // Criar Objeto Local para Impressão Imediata
      const novaEncomenda: Encomenda = {
        id: encomendaId,
        numero_sequencial: encomendas.length + 1,
        codigo: codigoGerado,
        loja_id: lojaAtual.id,
        loja_nome: lojaAtual.nome,
        cliente: {
          id: clienteId || `cli-${Date.now()}`,
          nome: nomeCliente.trim(),
          telefone: telefoneCliente.trim(),
          morada: tipoEntrega === 'entrega_domicilio' ? moradaCliente.trim() : undefined,
          notas_entrega: tipoEntrega === 'entrega_domicilio' ? notasEntrega.trim() : undefined,
        },
        tipo: tipoEntrega,
        data_agendamento: dataAgendamento,
        hora_agendamento: horaAgendamento,
        estado: 'pendente',
        total: 0,
        notas_cliente: notasGerais.trim() || undefined,
        itens: [...carrinho],
        criado_em: new Date().toISOString(),
      };

      // Registar Log de Auditoria
      const qtdTotalArtigos = carrinho.reduce((acc, it) => acc + (Number(it.quantidade) || 1), 0);
      const resumoArtigos = carrinho.slice(0, 3).map((it) => `${it.quantidade}x ${it.produto_nome}`).join(', ') + (carrinho.length > 3 ? ` e mais ${carrinho.length - 3} artigo(s)` : '');
      await registarLogAuditoria({
        encomenda_id: encomendaId,
        codigo_encomenda: codigoGerado,
        cliente_nome: nomeCliente.trim(),
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: lojaAtual.id,
        loja_nome: lojaAtual.nome,
        painel: 'encomendas',
        acao: 'Registo de Encomenda',
        detalhes: `Registado pedido com ${qtdTotalArtigos} artigo(s) (${resumoArtigos}). Modalidade: ${tipoEntrega === 'entrega_domicilio' ? 'Entrega ao Domicílio' : 'Levantamento no Balcão'}. Agendado para ${dataAgendamento} às ${horaAgendamento}.`,
      });

      setEncomendas((prev) => [novaEncomenda, ...prev]);
      setEncomendaParaImprimir(novaEncomenda);

      // Limpar Formulário
      setCarrinho([]);
      setNomeCliente('');
      setTelefoneCliente('');
      setMoradaCliente('');
      setNotasEntrega('');
      setNotasGerais('');

      // Recarregar Clientes
      const clisAtualizados = await carregarClientesSupabase();
      setClientes(clisAtualizados);
    } catch (err: any) {
      console.error('Erro ao registar encomenda:', err);
      alert('Erro ao guardar encomenda: ' + err.message);
    } finally {
      setAGravar(false);
    }
  };

  // Guardar Cliente (Modal)
  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteModal || !clienteModal.nome || !clienteModal.telefone) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    const salvo = await salvarClienteDb({
      id: clienteModal.id,
      nome: clienteModal.nome,
      telefone: clienteModal.telefone,
      email: clienteModal.email,
      morada: clienteModal.morada,
      codigo_postal: clienteModal.codigo_postal,
      notas_entrega: clienteModal.notas_entrega,
    });

    if (salvo) {
      const lista = await carregarClientesSupabase();
      setClientes(lista);
      setClienteModal(null);
    }
  };

  // Eliminar Cliente
  const handleEliminarCliente = async () => {
    if (!clienteModal?.id) return;
    if (!window.confirm(`Tem a certeza de que deseja eliminar o cliente "${clienteModal.nome}"? Esta ação é irreversível.`)) return;
    const ok = await eliminarClienteDb(clienteModal.id);
    if (ok) {
      const lista = await carregarClientesSupabase();
      setClientes(lista);
      setClienteModal(null);
      alert('Cliente eliminado com sucesso.');
    }
  };

  // Eliminar Encomenda
  const handleEliminarEncomenda = async (encId: string, encCodigo: string) => {
    if (!window.confirm(`Tem a certeza de que deseja eliminar a encomenda ${encCodigo}? Esta ação não pode ser anulada.`)) return;
    const encAlvo = encomendas.find((e) => e.id === encId);
    const ok = await eliminarEncomendaDb(encId);
    if (ok) {
      await registarLogAuditoria({
        encomenda_id: encId,
        codigo_encomenda: encCodigo,
        cliente_nome: encAlvo?.cliente.nome,
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: encAlvo?.loja_id,
        loja_nome: encAlvo?.loja_nome,
        painel: 'encomendas',
        acao: 'Eliminação de Encomenda',
        detalhes: `Encomenda ${encCodigo} eliminada definitivamente por ${currentUser.nome}.`,
      });

      setEncomendas((prev) => prev.filter((e) => e.id !== encId));
      if (encomendaEmEdicao?.id === encId) {
        setEncomendaEmEdicao(null);
      }
      alert(`Encomenda ${encCodigo} eliminada com sucesso.`);
    }
  };

  // Guardar Edição de Encomenda
  const handleSalvarEdicaoEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encomendaEmEdicao) return;
    const ok = await atualizarEncomendaDb(encomendaEmEdicao);
    if (ok) {
      await registarLogAuditoria({
        encomenda_id: encomendaEmEdicao.id,
        codigo_encomenda: encomendaEmEdicao.codigo,
        cliente_nome: encomendaEmEdicao.cliente.nome,
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: encomendaEmEdicao.loja_id,
        loja_nome: encomendaEmEdicao.loja_nome,
        painel: 'encomendas',
        acao: 'Edição de Encomenda',
        detalhes: `Dados da encomenda atualizados por ${currentUser.nome}: Agendado para ${encomendaEmEdicao.data_agendamento} às ${encomendaEmEdicao.hora_agendamento}. Estado: ${encomendaEmEdicao.estado}.`,
      });

      setEncomendas((prev) =>
        prev.map((enc) => (enc.id === encomendaEmEdicao.id ? { ...encomendaEmEdicao } : enc))
      );
      setEncomendaEmEdicao(null);
      alert(`Encomenda ${encomendaEmEdicao.codigo} atualizada com sucesso!`);
    }
  };

  // Alternar Tipo de Entrega na Lista de Encomendas
  const handleAlternarEntrega = async (enc: Encomenda) => {
    const novoTipo: TipoEntrega = 
      enc.tipo === 'levantamento_loja' ? 'entrega_domicilio' : 'levantamento_loja';

    const confirmMsg = novoTipo === 'entrega_domicilio'
      ? `Deseja converter a encomenda ${enc.codigo} em ENTREGA AO DOMICÍLIO?`
      : `Deseja converter a encomenda ${enc.codigo} em LEVANTAMENTO EM LOJA?`;

    if (!window.confirm(confirmMsg)) return;

    let moradaDestino = enc.cliente.morada;
    if (novoTipo === 'entrega_domicilio' && !moradaDestino) {
      const inputMorada = window.prompt('Indique a morada de entrega para esta encomenda:', '');
      if (!inputMorada || !inputMorada.trim()) {
        alert('A morada de entrega é obrigatória para entrega ao domicílio.');
        return;
      }
      moradaDestino = inputMorada.trim();
      if (supabase && enc.cliente.id) {
        await supabase.from('clientes').update({ morada: moradaDestino }).eq('id', enc.cliente.id);
      }
    }

    const sucesso = await alternarTipoEntregaDb(enc.id, novoTipo, enc.loja_id);
    if (sucesso) {
      await registarLogAuditoria({
        encomenda_id: enc.id,
        codigo_encomenda: enc.codigo,
        cliente_nome: enc.cliente.nome,
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: enc.loja_id,
        loja_nome: enc.loja_nome,
        painel: 'encomendas',
        acao: novoTipo === 'entrega_domicilio' ? 'Alteração para Entrega ao Domicílio' : 'Alteração para Levantamento em Loja',
        detalhes: `Modalidade de entrega alterada por ${currentUser.nome} para ${novoTipo === 'entrega_domicilio' ? 'Entrega ao Domicílio' : 'Levantamento no Balcão'}. Morada: ${moradaDestino || 'Balcão da Loja'}.`,
      });

      setEncomendas((prev) =>
        prev.map((e) =>
          e.id === enc.id
            ? { 
                ...e, 
                tipo: novoTipo, 
                cliente: { ...e.cliente, morada: moradaDestino || e.cliente.morada } 
              }
            : e
        )
      );
    }
  };

  // Pré-preencher formulário com cliente selecionado
  const handleCriarPedidoParaCliente = (cli: Cliente) => {
    setNomeCliente(cli.nome);
    setTelefoneCliente(cli.telefone);
    if (cli.morada) setMoradaCliente(cli.morada);
    if (cli.notas_entrega) setNotasEntrega(cli.notas_entrega);
    setActiveTab('novo');
  };

  // Filtros de Produtos
  const produtosFiltrados = produtos.filter((p) => {
    const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
    const matchBusca = p.nome.toLowerCase().includes(buscaProduto.toLowerCase());
    return matchCat && matchBusca;
  });

  // Filtros de Clientes
  const clientesFiltrados = clientes.filter((c) => {
    const termo = buscaCliente.toLowerCase();
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.telefone.includes(termo) ||
      (c.morada && c.morada.toLowerCase().includes(termo))
    );
  });

  // Filtros de Encomendas
  const encomendasFiltradas = selectedLojaId === 'todas'
    ? encomendas
    : encomendas.filter((e) => e.loja_id === selectedLojaId);

  // Filtro e Ordenação do Histórico de Encomendas
  const hoje = new Date().toISOString().split('T')[0];
  const dHoje = new Date();
  const dAmanha = new Date(dHoje);
  dAmanha.setDate(dHoje.getDate() + 1);
  const amanha = dAmanha.toISOString().split('T')[0];
  const dSemanaAtras = new Date(dHoje);
  dSemanaAtras.setDate(dHoje.getDate() - 7);
  const semanaAtras = dSemanaAtras.toISOString().split('T')[0];
  const dSemanaFrente = new Date(dHoje);
  dSemanaFrente.setDate(dHoje.getDate() + 7);
  const semanaFrente = dSemanaFrente.toISOString().split('T')[0];

  const encomendasHistoricoFiltradas = encomendasFiltradas.filter((e) => {
    // 1. Filtro de Texto
    if (buscaHistorico.trim()) {
      const q = buscaHistorico.toLowerCase().trim();
      const match = (
        e.codigo.toLowerCase().includes(q) ||
        e.cliente.nome.toLowerCase().includes(q) ||
        e.cliente.telefone.includes(q) ||
        e.data_agendamento.includes(q) ||
        (e.cliente.morada && e.cliente.morada.toLowerCase().includes(q)) ||
        e.itens.some((i) => i.produto_nome.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    // 2. Filtro de Período / Calendário
    if (filtroPeriodoHistorico === 'hoje') {
      return e.data_agendamento === hoje;
    } else if (filtroPeriodoHistorico === 'amanha') {
      return e.data_agendamento === amanha;
    } else if (filtroPeriodoHistorico === 'semana') {
      return e.data_agendamento >= semanaAtras && e.data_agendamento <= semanaFrente;
    } else if (filtroPeriodoHistorico === 'personalizado') {
      if (dataInicioHistorico && e.data_agendamento < dataInicioHistorico) return false;
      if (dataFimHistorico && e.data_agendamento > dataFimHistorico) return false;
      return true;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t.readOnlyNotice}</span>
          </div>
        )}

        {/* Barra Superior com Título e Seletor de Abas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-bakery-600" />
              {t.navEncomendas}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Registo rápido, gestão de contactos de clientes e histórico de pedidos.
            </p>
          </div>

          {/* Abas Principais */}
          <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('novo')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'novo'
                  ? 'bg-bakery-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="h-4 w-4" />
              {t.newOrder}
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'clientes'
                  ? 'bg-bakery-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4" />
              {t.clientManagement} ({clientes.length})
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'historico'
                  ? 'bg-bakery-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-4 w-4" />
              {t.ordersHistory} ({encomendasFiltradas.length})
            </button>
          </div>
        </div>

        {/* ----------------- ABA 1: NOVO PEDIDO (BALCÃO) ----------------- */}
        {activeTab === 'novo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Catálogo de Produtos */}
            <div className="lg:col-span-7 space-y-4">
              {/* Barra de Integração WhatsApp */}
              <div className="bg-emerald-50/90 border border-emerald-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950">Integração WhatsApp</h4>
                    <p className="text-[11px] text-emerald-800">Importar mensagens estruturadas de clientes</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarModelo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t.whatsappCopyTemplate}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappModalAberto(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t.whatsappOrderBtn}</span>
                  </button>
                </div>
              </div>

              {/* Pesquisa e Filtros de Categoria */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    placeholder={t.searchProductPlaceholder}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-bakery-500"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto">
                  {(['todas', 'padaria', 'pastelaria'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaAtiva(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                        categoriaAtiva === cat
                          ? 'bg-bakery-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'todas' ? t.allCategories : cat === 'padaria' ? t.categoryBakery : t.categoryPastry}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grelha de Produtos (Sem preços - foco na quantidade e artigo) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {produtosFiltrados.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => adicionarAoCarrinho(prod)}
                    className="flex flex-col text-left p-3.5 rounded-2xl bg-white border border-gray-200 shadow-2xs hover:border-bakery-400 hover:shadow-xs transition group"
                  >
                    <span className="text-xl mb-1">
                      {prod.categoria === 'padaria' ? '🥖' : '🎂'}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-bakery-700 line-clamp-2">
                      {prod.nome}
                    </h4>
                    <span className="text-[11px] font-bold text-bakery-700 mt-auto pt-2 uppercase">
                      + Adicionar
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coluna Direita: Dados do Pedido & Carrinho */}
            <div className="lg:col-span-5 space-y-4">
              <form onSubmit={handleGravarEncomenda} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                {/* Tipo de Entrega */}
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('levantamento_loja')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      tipoEntrega === 'levantamento_loja'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Store className="h-4 w-4 text-bakery-600" />
                    {t.pickupStore}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('entrega_domicilio')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      tipoEntrega === 'entrega_domicilio'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Truck className="h-4 w-4 text-blue-600" />
                    {t.deliveryHome}
                  </button>
                </div>

                {/* Cliente: Telefone e Nome */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.phone} (Pesquisa Auto)
                    </label>
                    <input
                      type="tel"
                      required
                      value={telefoneCliente}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      placeholder="9xxxxxxxx"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-bakery-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.client}
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-bakery-500"
                    />
                  </div>
                </div>

                {/* Campos Específicos para Entrega ao Domicílio */}
                {tipoEntrega === 'entrega_domicilio' && (
                  <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        {t.deliveryAddress} *
                      </label>
                      <input
                        type="text"
                        required
                        value={moradaCliente}
                        onChange={(e) => setMoradaCliente(e.target.value)}
                        placeholder="Rua, Número, Andar / Código Postal"
                        className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-blue-200 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1">
                        {t.accessNotes}
                      </label>
                      <input
                        type="text"
                        value={notasEntrega}
                        onChange={(e) => setNotasEntrega(e.target.value)}
                        placeholder="Portão verde, código do prédio, etc."
                        className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-blue-200 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Agendamento: Data e Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.date}
                    </label>
                    <input
                      type="date"
                      value={dataAgendamento}
                      onChange={(e) => setDataAgendamento(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.time}
                    </label>
                    <input
                      type="time"
                      value={horaAgendamento}
                      onChange={(e) => setHoraAgendamento(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Lista de Itens no Carrinho */}
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    {t.itemsInCart} ({carrinho.length})
                  </h4>

                  {carrinho.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3 text-center">
                      {t.cartEmpty}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {carrinho.map((item) => (
                        <div key={item.id} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-gray-900">
                            <span>{item.produto_nome}</span>
                            <span className="text-xs text-stone-600 font-bold">{item.quantidade} un.</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, -1)}
                                className="h-6 w-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-black text-xs">{item.quantidade}</span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, 1)}
                                className="h-6 w-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={item.notas_personalizacao || ''}
                              onChange={(e) => atualizarNotaItem(item.id, e.target.value)}
                              placeholder="Personalização (frase no bolo, etc.)"
                              className="w-44 text-[11px] px-2 py-1 bg-white border border-gray-200 rounded-md"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo de Artigos no Pedido */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between text-base font-black text-gray-900 pt-1">
                    <span>{t.totalItems}:</span>
                    <span className="text-xl text-bakery-700">
                      {carrinho.reduce((acc, i) => acc + i.quantidade, 0)} un.
                    </span>
                  </div>
                </div>

                {/* Botão Submeter */}
                <button
                  type="submit"
                  disabled={aGravar || carrinho.length === 0 || !temPermissaoEdicao}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bakery-600 text-white font-black text-sm shadow-md hover:bg-bakery-700 disabled:opacity-50 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  {aGravar ? 'A registar...' : !temPermissaoEdicao ? `🚫 ${t.readOnlyMode}` : t.registerOrder}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- ABA 2: GESTÃO DE CLIENTES ----------------- */}
        {activeTab === 'clientes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Pesquisar por nome, telefone ou morada..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              {temPermissaoEdicao && (
                <button
                  type="button"
                  onClick={() => setClienteModal({ nome: '', telefone: '', morada: '', notas_entrega: '' })}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-600 text-white text-xs font-bold shadow-xs hover:bg-bakery-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  {t.newClient}
                </button>
              )}
            </div>

            {/* Tabela de Clientes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">{t.client}</th>
                      <th className="p-3.5">{t.phone}</th>
                      <th className="p-3.5">{t.address}</th>
                      <th className="p-3.5">{t.notes}</th>
                      <th className="p-3.5 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 italic">
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                    ) : (
                      clientesFiltrados.map((cli) => (
                        <tr key={cli.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3.5 font-bold text-gray-900">{cli.nome}</td>
                          <td className="p-3.5 font-mono">{cli.telefone}</td>
                          <td className="p-3.5 text-gray-600">
                            {cli.morada || <span className="text-gray-300 italic">Sem morada</span>}
                          </td>
                          <td className="p-3.5 text-gray-500 italic max-w-xs truncate">
                            {cli.notas_entrega || '-'}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleSalvarCliente}
                              onClickCapture={() => setClienteModal(cli)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition"
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleCriarPedidoParaCliente(cli)}
                              className="px-2.5 py-1 rounded-lg bg-bakery-50 hover:bg-bakery-100 text-bakery-700 font-bold text-[11px] border border-bakery-200 transition"
                            >
                              + Pedido
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 3: HISTÓRICO DE ENCOMENDAS ----------------- */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            {/* Barra de Filtros do Histórico: Pesquisa e Seletor de Período / Calendário */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={buscaHistorico}
                    onChange={(e) => setBuscaHistorico(e.target.value)}
                    placeholder="Pesquisar histórico por código, cliente, telefone, morada ou produto..."
                    className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-hidden"
                  />
                  {buscaHistorico && (
                    <button
                      type="button"
                      onClick={() => setBuscaHistorico('')}
                      className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Seletor Rápido de Período */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-bakery-600" />
                    Período:
                  </span>
                  {[
                    { id: 'todos', label: 'Todas as Datas' },
                    { id: 'hoje', label: 'Hoje' },
                    { id: 'amanha', label: 'Amanhã' },
                    { id: 'semana', label: 'Próx. 7 Dias' },
                    { id: 'personalizado', label: 'Personalizado' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFiltroPeriodoHistorico(p.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        filtroPeriodoHistorico === p.id
                          ? 'bg-bakery-600 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Datas Personalizadas do Calendário */}
              {filtroPeriodoHistorico === 'personalizado' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 bg-bakery-50/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700">De:</label>
                    <input
                      type="date"
                      value={dataInicioHistorico}
                      onChange={(e) => setDataInicioHistorico(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-300 font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700">Até:</label>
                    <input
                      type="date"
                      value={dataFimHistorico}
                      onChange={(e) => setDataFimHistorico(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-300 font-medium"
                    />
                  </div>
                  {(dataInicioHistorico || dataFimHistorico) && (
                    <button
                      type="button"
                      onClick={() => { setDataInicioHistorico(''); setDataFimHistorico(''); }}
                      className="text-xs text-bakery-700 font-bold hover:underline"
                    >
                      Limpar datas
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Visualização Hierárquica: Tipo de Entrega -> Loja -> Ordenado Ascendente por Data e Hora */}
            {encomendasHistoricoFiltradas.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 text-gray-500 text-xs font-semibold">
                Nenhuma encomenda encontrada no histórico para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-8">
                {(['levantamento_loja', 'entrega_domicilio'] as TipoEntrega[]).map((tipo) => {
                  const encomendasDoTipo = encomendasHistoricoFiltradas.filter((e) => e.tipo === tipo);
                  if (encomendasDoTipo.length === 0) return null;

                  // Agrupar por Loja
                  const lojasMap = new Map<string, Encomenda[]>();
                  for (const enc of encomendasDoTipo) {
                    const lNome = enc.loja_nome || 'Padaria da Vila (Arouca)';
                    if (!lojasMap.has(lNome)) {
                      lojasMap.set(lNome, []);
                    }
                    lojasMap.get(lNome)!.push(enc);
                  }

                  return (
                    <div key={tipo} className="space-y-4">
                      {/* Cabeçalho de Nível 1: Tipo de Entrega */}
                      <div className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                        tipo === 'levantamento_loja'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-blue-50/80 border-blue-200 text-blue-950'
                      }`}>
                        <div className="flex items-center gap-2.5 font-black text-sm">
                          {tipo === 'levantamento_loja' ? (
                            <>
                              <Store className="h-5 w-5 text-emerald-700" />
                              <span>LEVANTAMENTO EM LOJA</span>
                            </>
                          ) : (
                            <>
                              <Truck className="h-5 w-5 text-blue-700" />
                              <span>ENTREGA AO DOMICÍLIO</span>
                            </>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold border border-current opacity-80">
                            {encomendasDoTipo.length} encomenda(s)
                          </span>
                        </div>
                      </div>

                      {/* Agrupamento de Nível 2: Por Loja */}
                      {Array.from(lojasMap.entries()).map(([nomeLoja, pedidosLoja]) => {
                        // Ordenação estrita crescente por data e hora de agendamento
                        const pedidosOrdenados = [...pedidosLoja].sort((a, b) => {
                          const dtA = `${a.data_agendamento} ${a.hora_agendamento}`;
                          const dtB = `${b.data_agendamento} ${b.hora_agendamento}`;
                          return dtA.localeCompare(dtB);
                        });

                        return (
                          <div key={nomeLoja} className="pl-2 sm:pl-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 border-b border-gray-200 pb-1.5">
                              <span className="h-2 w-2 rounded-full bg-bakery-600"></span>
                              <span>{nomeLoja}</span>
                              <span className="text-[11px] text-gray-500 font-normal">
                                ({pedidosOrdenados.length} pedidos • ordenados por hora crescente)
                              </span>
                            </div>

                            {/* Grelha de Pedidos Ordenados */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {pedidosOrdenados.map((enc) => (
                                <div
                                  key={enc.id}
                                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-bakery-300 transition"
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-mono font-black text-xs text-gray-800">{enc.codigo}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                        enc.estado === 'entregue'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : enc.estado === 'em_producao' || enc.estado === 'pronto_loja'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}>
                                        {enc.estado.replace('_', ' ')}
                                      </span>
                                    </div>

                                    <h4 className="font-bold text-sm text-gray-900">{enc.cliente.nome}</h4>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <Phone className="h-3 w-3" /> {enc.cliente.telefone}
                                    </p>

                                    {enc.tipo === 'entrega_domicilio' && enc.cliente.morada && (
                                      <p className="text-xs text-gray-700 mt-1.5 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                        <MapPin className="h-3 w-3 inline mr-1 text-red-500" />
                                        {enc.cliente.morada}
                                      </p>
                                    )}

                                    <div className="text-xs text-gray-600 mt-2.5 flex items-center justify-between bg-gray-50 p-2 rounded-xl">
                                      <span className="font-bold text-gray-900 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-bakery-600" />
                                        {enc.data_agendamento} às {enc.hora_agendamento}
                                      </span>
                                      <span className="font-bold text-xs text-stone-800 bg-stone-200/80 px-2 py-0.5 rounded-md">
                                        {enc.itens.reduce((acc, i) => acc + i.quantidade, 0)} {t.totalItems.toLowerCase()}
                                      </span>
                                    </div>

                                    {/* Resumo de Artigos */}
                                    <div className="mt-2 space-y-0.5">
                                      {enc.itens.map((it) => (
                                        <div key={it.id} className="text-[11px] text-gray-600 flex justify-between">
                                          <span>• {it.produto_nome}</span>
                                          <span className="font-bold">{it.quantidade} un.</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Ações da Encomenda */}
                                  <div className="pt-2.5 border-t border-gray-100 flex flex-wrap gap-1.5 text-xs font-bold">
                                    <button
                                      type="button"
                                      onClick={() => setEncomendaParaImprimir(enc)}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition text-[11px]"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      Talão
                                    </button>

                                    {temPermissaoEdicao && (
                                      <button
                                        type="button"
                                        onClick={() => setEncomendaEmEdicao(enc)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-bakery-50 text-bakery-800 border border-bakery-200 hover:bg-bakery-100 transition text-[11px]"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                        Editar
                                      </button>
                                    )}

                                    {temPermissaoEdicao && (
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarEncomenda(enc.id, enc.codigo)}
                                        className="flex items-center justify-center p-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                                        title="Eliminar Encomenda"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleAlternarEntrega(enc)}
                                      className="flex items-center justify-center p-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                                      title="Alternar entre Loja e Domicílio"
                                    >
                                      <ArrowRightLeft className="h-3.5 w-3.5" />
                                    </button>

                                    <a
                                      href={`https://wa.me/351${enc.cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        `🥖 *Padaria da Vila*\nOlá ${enc.cliente.nome}, o seu pedido *${enc.codigo}* está confirmado para ${enc.data_agendamento} às ${enc.hora_agendamento}.\nFormato: ${enc.tipo === 'entrega_domicilio' ? `Entrega em ${enc.cliente.morada}` : 'Levantamento no Balcão'}.\nArtigos: ${enc.itens.map(i => `${i.quantidade}x ${i.produto_nome}`).join(', ')}.\nObrigado pela sua preferência!`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center p-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
                                      title="Enviar WhatsApp"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE EDIÇÃO DE CLIENTE */}
      {clienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-bakery-600" />
                {clienteModal.id ? t.editClient : t.newClient}
              </h3>
              <button onClick={() => setClienteModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCliente} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.client} *</label>
                <input
                  type="text"
                  required
                  value={clienteModal.nome || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.phone} *</label>
                <input
                  type="tel"
                  required
                  value={clienteModal.telefone || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, telefone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.deliveryAddress}</label>
                <input
                  type="text"
                  value={clienteModal.morada || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, morada: e.target.value })}
                  placeholder="Rua, número, andar, localidade"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.accessNotes}</label>
                <textarea
                  rows={2}
                  value={clienteModal.notas_entrega || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, notas_entrega: e.target.value })}
                  placeholder="Instruções para o estafeta ou balcão"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                {clienteModal.id && temPermissaoEdicao ? (
                  <button
                    type="button"
                    onClick={handleEliminarCliente}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Cliente
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setClienteModal(null)}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition"
                  >
                    {t.cancel}
                  </button>
                  {temPermissaoEdicao ? (
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-bakery-600 font-bold text-white shadow-xs hover:bg-bakery-700 transition"
                    >
                      {t.save}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 italic">
                      {t.levelReadOnly}
                    </span>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO WHATSAPP */}
      {whatsappModalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">{t.whatsappModalTitle}</h3>
                  <p className="text-xs text-gray-500">Cole a mensagem enviada pelo cliente no WhatsApp</p>
                </div>
              </div>
              <button onClick={() => setWhatsappModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                rows={7}
                value={textoWhatsapp}
                onChange={(e) => setTextoWhatsapp(e.target.value)}
                placeholder={t.whatsappPastePlaceholder}
                className="w-full p-3.5 rounded-2xl border border-gray-300 font-mono text-xs focus:outline-hidden focus:border-emerald-500 bg-stone-50"
              />

              <div className="flex items-center justify-between text-xs text-gray-500">
                <button
                  type="button"
                  onClick={handleCopiarModelo}
                  className="flex items-center gap-1 font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t.whatsappCopyTemplate}
                </button>
                <span>Reconhece nome, telefone, morada, data e artigos</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setWhatsappModalAberto(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleProcessarWhatsapp}
                disabled={!textoWhatsapp.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {t.whatsappParseBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ENCOMENDA */}
      {encomendaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-bakery-600 text-white shadow-xs">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Editar Encomenda <span className="font-mono text-bakery-700">{encomendaEmEdicao.codigo}</span>
                  </h3>
                  <p className="text-xs text-gray-500">Altere dados do cliente, agendamento, formato de entrega ou artigos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEncomendaEmEdicao(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoEncomenda} className="space-y-4 text-xs">
              {/* Formato de Entrega */}
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, tipo: 'levantamento_loja' })}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                    encomendaEmEdicao.tipo === 'levantamento_loja'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Store className="h-4 w-4 text-emerald-600" />
                  Levantamento em Loja
                </button>
                <button
                  type="button"
                  onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, tipo: 'entrega_domicilio' })}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
                    encomendaEmEdicao.tipo === 'entrega_domicilio'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Truck className="h-4 w-4 text-blue-600" />
                  Entrega ao Domicílio
                </button>
              </div>

              {/* Dados do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={encomendaEmEdicao.cliente.nome}
                    onChange={(e) =>
                      setEncomendaEmEdicao({
                        ...encomendaEmEdicao,
                        cliente: { ...encomendaEmEdicao.cliente, nome: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Telefone *</label>
                  <input
                    type="tel"
                    required
                    value={encomendaEmEdicao.cliente.telefone}
                    onChange={(e) =>
                      setEncomendaEmEdicao({
                        ...encomendaEmEdicao,
                        cliente: { ...encomendaEmEdicao.cliente, telefone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Morada (se entrega ao domicílio) */}
              {encomendaEmEdicao.tipo === 'entrega_domicilio' && (
                <div className="space-y-2 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">Morada de Entrega *</label>
                    <input
                      type="text"
                      required
                      value={encomendaEmEdicao.cliente.morada || ''}
                      onChange={(e) =>
                        setEncomendaEmEdicao({
                          ...encomendaEmEdicao,
                          cliente: { ...encomendaEmEdicao.cliente, morada: e.target.value },
                        })
                      }
                      placeholder="Rua, número, andar, localidade"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-blue-200 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">Notas de Acesso / Estafeta</label>
                    <input
                      type="text"
                      value={encomendaEmEdicao.cliente.notas_entrega || ''}
                      onChange={(e) =>
                        setEncomendaEmEdicao({
                          ...encomendaEmEdicao,
                          cliente: { ...encomendaEmEdicao.cliente, notas_entrega: e.target.value },
                        })
                      }
                      placeholder="Código do portão, etc."
                      className="w-full px-3 py-2 bg-white rounded-lg border border-blue-200 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Agendamento & Loja & Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data Agendada *</label>
                  <input
                    type="date"
                    required
                    value={encomendaEmEdicao.data_agendamento}
                    onChange={(e) =>
                      setEncomendaEmEdicao({ ...encomendaEmEdicao, data_agendamento: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hora Agendada *</label>
                  <input
                    type="time"
                    required
                    value={encomendaEmEdicao.hora_agendamento}
                    onChange={(e) =>
                      setEncomendaEmEdicao({ ...encomendaEmEdicao, hora_agendamento: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Estado da Encomenda</label>
                  <select
                    value={encomendaEmEdicao.estado}
                    onChange={(e) =>
                      setEncomendaEmEdicao({ ...encomendaEmEdicao, estado: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_producao">Em Produção</option>
                    <option value="pronto_loja">Pronto / Para Expedição</option>
                    <option value="em_rota">Em Rota de Entrega</option>
                    <option value="entregue">Entregue / Concluída</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Notas Gerais */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Notas Gerais da Encomenda</label>
                <input
                  type="text"
                  value={encomendaEmEdicao.notas_cliente || ''}
                  onChange={(e) =>
                    setEncomendaEmEdicao({ ...encomendaEmEdicao, notas_cliente: e.target.value })
                  }
                  placeholder="Observações do pedido"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              {/* Artigos da Encomenda */}
              <div className="border-t pt-3">
                <h4 className="font-bold text-gray-800 mb-2 uppercase text-[11px]">Artigos ({encomendaEmEdicao.itens.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {encomendaEmEdicao.itens.map((item, idx) => (
                    <div key={item.id || idx} className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900">{item.produto_nome}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const novaQtd = Math.max(1, item.quantidade - 1);
                            const novos = encomendaEmEdicao.itens.map((it, i) =>
                              i === idx ? { ...it, quantidade: novaQtd } : it
                            );
                            setEncomendaEmEdicao({ ...encomendaEmEdicao, itens: novos });
                          }}
                          className="h-6 w-6 rounded-md bg-white border border-gray-200 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold w-6 text-center">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const novos = encomendaEmEdicao.itens.map((it, i) =>
                              i === idx ? { ...it, quantidade: it.quantidade + 1 } : it
                            );
                            setEncomendaEmEdicao({ ...encomendaEmEdicao, itens: novos });
                          }}
                          className="h-6 w-6 rounded-md bg-white border border-gray-200 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (encomendaEmEdicao.itens.length <= 1) {
                              alert('A encomenda deve ter pelo menos um artigo.');
                              return;
                            }
                            const novos = encomendaEmEdicao.itens.filter((_, i) => i !== idx);
                            setEncomendaEmEdicao({ ...encomendaEmEdicao, itens: novos });
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-50"
                          title="Remover artigo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações Inferiores */}
              <div className="flex items-center justify-between pt-3 border-t">
                <button
                  type="button"
                  onClick={() => handleEliminarEncomenda(encomendaEmEdicao.id, encomendaEmEdicao.codigo)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar Encomenda
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEncomendaEmEdicao(null)}
                    className="px-4 py-2 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-bakery-600 font-bold text-white shadow-xs hover:bg-bakery-700 transition"
                  >
                    Guardar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DO TALÃO TÉRMICO */}
      {encomendaParaImprimir && (
        <ThermalReceipt
          encomenda={encomendaParaImprimir}
          loja={lojaAtual}
          onClose={() => setEncomendaParaImprimir(null)}
        />
      )}
    </div>
  );
}
