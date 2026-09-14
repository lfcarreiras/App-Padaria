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

export interface Encomenda {
  id: string;
  numero_sequencial: number;
  codigo: string;
  loja_id: string;
  loja_nome?: string;
  cliente: Cliente;
  tipo: TipoEntrega;
  carrinha_id?: string;
  carrinha_nome?: string;
  data_agendamento: string; // YYYY-MM-DD
  hora_agendamento: string; // HH:MM
  estado: EstadoEncomenda;
  estado_pagamento?: EstadoPagamento;
  metodo_pagamento?: MetodoPagamento;
  total?: number;
  notas_cliente?: string;
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

