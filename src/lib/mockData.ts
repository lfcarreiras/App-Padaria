import { Loja, Produto, Encomenda, Carrinha } from '../types';

export const LOJAS_MOCK: Loja[] = [
  {
    id: 'loja-1',
    codigo: 'LOJA-1',
    nome: 'Padaria da Vila I (Praça)',
    morada: 'Praça Brandão de Vasconcelos, 4540-102 Arouca',
    telefone: '256 944 179',
    nif: '500123456',
    ativo: true,
  },
  {
    id: 'loja-2',
    codigo: 'LOJA-2',
    nome: 'Padaria da Vila II (Av. 25 de Abril)',
    morada: 'Av. 25 de Abril, 4540-102 Arouca',
    telefone: '256 941 154',
    nif: '500123456',
    ativo: true,
  },
  {
    id: 'loja-3',
    codigo: 'LOJA-3',
    nome: 'Padaria da Vila III',
    morada: 'Arouca (Ponto de Venda)',
    telefone: '256 944 321',
    nif: '500123456',
    ativo: true,
  },
  {
    id: 'loja-4',
    codigo: 'LOJA-4',
    nome: 'Unidade Central de Fabrico & Sede (Futura Loja IV)',
    morada: 'Rua Dr. Teixeira de Brito, 8 (Lavandeira), 4540-137 Arouca',
    telefone: '256 944 321',
    nif: '500123456',
    ativo: true,
  },
];

export const CARRINHAS_MOCK: Carrinha[] = [
  { id: 'car-1', loja_id: 'loja-4', identificador: 'Carrinha 1 (Fabrico Central)', matricula: '42-AB-89', ativo: true },
  { id: 'car-2', loja_id: 'loja-4', identificador: 'Carrinha 2 (Fabrico Central)', matricula: '77-ZX-12', ativo: true },
  { id: 'car-3', loja_id: 'loja-4', identificador: 'Carrinha 3 (Fabrico Central)', matricula: '15-TR-33', ativo: true },
];

export const PRODUTOS_MOCK: Produto[] = [
  // Padaria (Fabrico Tradicional a Lenha)
  { id: 'prod-1', nome: 'Broa de Milho Tradicional (Forno a Lenha)', categoria: 'padaria', unidade: 'unidade', ativo: true },
  { id: 'prod-2', nome: 'Pão Tradicional de Arouca', categoria: 'padaria', unidade: 'unidade', ativo: true },
  { id: 'prod-3', nome: 'Pão de Centeio Regional', categoria: 'padaria', unidade: 'unidade', ativo: true },
  { id: 'prod-4', nome: 'Baguete Rústica Tradicional', categoria: 'padaria', unidade: 'unidade', ativo: true },
  { id: 'prod-5', nome: 'Pão de Forma Artesanal', categoria: 'padaria', unidade: 'unidade', ativo: true },
  { id: 'prod-6', nome: 'Regueifa Tradicional de Arouca', categoria: 'padaria', unidade: 'unidade', ativo: true },

  // Pastelaria
  { id: 'prod-7', nome: 'Pastéis de Nata da Vila', categoria: 'pastelaria', unidade: 'unidade', ativo: true },
  { id: 'prod-8', nome: 'Bolo de Aniversário Personalizado', categoria: 'pastelaria', unidade: 'kg', ativo: true },
  { id: 'prod-9', nome: 'Castanhas Doces de Arouca', categoria: 'pastelaria', unidade: 'unidade', ativo: true },
  { id: 'prod-10', nome: 'Broinhas Doces Tradicionais', categoria: 'pastelaria', unidade: 'unidade', ativo: true },
  { id: 'prod-11', nome: 'Croissant Francês Folhado', categoria: 'pastelaria', unidade: 'unidade', ativo: true },
  { id: 'prod-12', nome: 'Torta Tradicional com Creme de Ovos', categoria: 'pastelaria', unidade: 'kg', ativo: true },
];

// Encomendas iniciais vazias (carregadas exclusivamente do Supabase em tempo real)
export const ENCOMENDAS_INICIAIS: Encomenda[] = [];
