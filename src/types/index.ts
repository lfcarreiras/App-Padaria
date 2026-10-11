export type Role = 'admin' | 'gerente_loja' | 'atendente' | 'operador_padaria' | 'operador_pastelaria' | 'motorista';

export type CategoriaProduto = 'padaria' | 'pastelaria' | 'bebidas_outros';
export type SetorProducao = 'padaria' | 'pastelaria';
export type TipoEntrega = 'levantamento_loja' | 'entrega_domicilio';
export type EstadoEncomenda = 'pendente' | 'em_producao' | 'pronto_loja' | 'em_rota' | 'entregue' | 'cancelado';
export type EstadoProducaoItem = 'pendente' | 'em_preparo' | 'pronto';
export type EstadoPagamento = 'pendente' | 'pago';
export type MetodoPagamento = 'dinheiro' | 'multibanco' | 'mbway' | 'transferencia';

export interface Loja {
  id: string;
  codigo: string;
  nome: string;
  morada: string;
  telefone: string;
  nif?: string;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  morada?: string;
  codigo_postal?: string;
  notas_entrega?: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  preco?: number;
  unidade: 'unidade' | 'kg' | 'cento';
  tempo_preparo_minutos?: number;
  ativo: boolean;
}

export interface Carrinha {
  id: string;
  loja_id: string;
  identificador: string;
  matricula: string;
  motorista_id?: string;
  ativo: boolean;
}

export interface ItemEncomenda {
  id: string;
  encomenda_id: string;
  produto_id: string;
  produto_nome: string;
  setor: SetorProducao;
  quantidade: number;
  preco_unitario?: number;
  notas_personalizacao?: string;
  estado_producao: EstadoProducaoItem;
}

export type CanalOrigemEncomenda = 'presencial' | 'telefone' | 'whatsapp' | 'site_online';

export interface Encomenda {
  id: string;
  numero_sequencial: number;
  codigo: string;
  loja_id: string;
  loja_nome?: string;
  cliente: Cliente;
  tipo: TipoEntrega;
  canal_origem?: CanalOrigemEncomenda;
  carrinha_id?: string;
  carrinha_nome?: string;
  data_agendamento: string; // YYYY-MM-DD
  hora_agendamento: string; // HH:MM
  estado: EstadoEncomenda;
  estado_pagamento?: EstadoPagamento;
  metodo_pagamento?: MetodoPagamento;
  total?: number;
  notas_cliente?: string;
  data_entrega_real?: string; // YYYY-MM-DD real da entrega/levantamento
  hora_entrega_real?: string; // HH:MM real da entrega
  ordem_rota?: number; // Sequência manual ou otimizada da carrinha
  itens: ItemEncomenda[];
  criado_em: string;
}

export type EstadoRota = 'nao_iniciada' | 'em_curso' | 'concluida';

export interface RotaCarrinhaControlo {
  carrinha_id: string;
  data: string;
  estado: EstadoRota;
  hora_inicio?: string;
  hora_fim?: string;
  paragem_atual_index: number;
}

export interface PedidoWhatsAppEstruturado {
  nomeCliente: string;
  telefoneCliente: string;
  tipoEntrega: TipoEntrega;
  moradaOuLoja: string;
  dataAgendamento: string;
  horaAgendamento: string;
  notas: string;
  itens: { nome: string; quantidade: number; notas?: string }[];
}

export type NivelAcesso = 'sem_acesso' | 'leitura' | 'edicao';

export interface PerfilUtilizador {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  password?: string;
  role: Role;
  loja_id?: string;
  loja_nome?: string;
  acesso_encomendas: NivelAcesso;
  acesso_producao: NivelAcesso;
  acesso_loja: NivelAcesso;
  acesso_entregas: NivelAcesso;
  acesso_gestao: NivelAcesso;
  // Compatibilidade legada
  painel_encomendas?: boolean;
  painel_producao?: boolean;
  painel_loja?: boolean;
  painel_entregas?: boolean;
  painel_gestao?: boolean;
  ativo: boolean;
  atualizado_em?: string;
}

export type ModuloApp = 'encomendas' | 'producao' | 'loja' | 'entregas' | 'gestao';

export interface LogAuditoria {
  id: string;
  encomenda_id?: string;
  codigo_encomenda?: string;
  cliente_nome?: string;
  utilizador_id: string;
  utilizador_nome: string;
  utilizador_role: Role | string;
  loja_id?: string;
  loja_nome?: string;
  painel: ModuloApp | string;
  acao: string;
  detalhes: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM:SS ou HH:MM
  criado_em: string; // ISO 8601
}

export type CockpitSelecionado = 'loja' | 'producao' | 'carrinhas' | 'gestao';

export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface BaseFixaCarrinha {
  carrinha_id: string; // ex: 'carrinha-1' a 'carrinha-4'
  quantidades_por_produto: Record<string, number>; // nome do produto -> quantidade base diária
}

export interface ClienteEmpresarialB2B {
  id: string;
  nome: string; // ex: 'Gamarão', 'Patronato', 'Hospital', etc.
  telefone?: string;
  morada?: string;
  carrinha_id: string; // predefinido 'carrinha-5'
  ativo: boolean;
  quantidades_semanais: Record<DiaSemana, Record<string, number>>; // dia da semana -> { [produto_nome]: quantidade }
}

export interface ItemAlocadoForno {
  id: string;
  produto_nome: string;
  setor: 'padaria' | 'pastelaria';
  quantidade: number;
}

export interface RegistoFornada {
  id: string;
  forno_id: string;
  forno_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  duracao_segundos: number;
  itens: ItemAlocadoForno[];
}

export interface CartaoFornoProducao {
  id: 'forno-1' | 'forno-2' | 'forno-3';
  nome: string;
  estado: 'livre' | 'em_preparacao';
  itens: ItemAlocadoForno[];
  inicio_timestamp?: number;
  hora_inicio_str?: string;
}


