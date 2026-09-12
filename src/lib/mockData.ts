import { Loja, Produto, Encomenda, Carrinha } from '../types';

export const LOJAS_MOCK: Loja[] = [
  {
    id: 'loja-1',
    codigo: 'LOJA-1',
    nome: 'Padaria & Pastelaria Central (Matriz)',
    morada: 'Av. Principal 100, Lisboa',
    telefone: '210 000 001',
    nif: '500100201',
    ativo: true,
  },
  {
    id: 'loja-2',
    codigo: 'LOJA-2',
    nome: 'Padaria & Pastelaria Baixa',
    morada: 'Rua Augusta 45, Lisboa',
    telefone: '210 000 002',
    nif: '500100202',
    ativo: true,
  },
  {
    id: 'loja-3',
    codigo: 'LOJA-3',
    nome: 'Padaria & Pastelaria do Parque',
    morada: 'Alameda das Flores 12, Lisboa',
    telefone: '210 000 003',
    nif: '500100203',
    ativo: true,
  },
  {
    id: 'loja-4',
    codigo: 'LOJA-4',
    nome: 'Padaria & Pastelaria Estação',
    morada: 'Praça da Estação 8, Lisboa',
    telefone: '210 000 004',
    nif: '500100204',
    ativo: true,
  },
];

export const CARRINHAS_MOCK: Carrinha[] = [
  { id: 'car-1', loja_id: 'loja-1', identificador: 'Carrinha 1 - Matriz', matricula: '42-AB-89', ativo: true },
  { id: 'car-2', loja_id: 'loja-2', identificador: 'Carrinha 2 - Baixa', matricula: '77-ZX-12', ativo: true },
  { id: 'car-3', loja_id: 'loja-3', identificador: 'Carrinha 3 - Parque', matricula: '15-TR-33', ativo: true },
  { id: 'car-4', loja_id: 'loja-4', identificador: 'Carrinha 4 - Estação', matricula: '90-KL-55', ativo: true },
];

export const PRODUTOS_MOCK: Produto[] = [
  // Padaria
  { id: 'prod-1', nome: 'Pão Alentejano Tradicional', categoria: 'padaria', preco: 1.60, unidade: 'unidade', ativo: true },
  { id: 'prod-2', nome: 'Pão de Mafra', categoria: 'padaria', preco: 1.40, unidade: 'unidade', ativo: true },
  { id: 'prod-3', nome: 'Broa de Milho Tradicional', categoria: 'padaria', preco: 2.20, unidade: 'unidade', ativo: true },
  { id: 'prod-4', nome: 'Baguete Rústica de Cereais', categoria: 'padaria', preco: 1.10, unidade: 'unidade', ativo: true },
  { id: 'prod-5', nome: 'Pão de Forma Artesanal', categoria: 'padaria', preco: 2.80, unidade: 'unidade', ativo: true },
  { id: 'prod-6', nome: 'Regueifa Doce com Canela', categoria: 'padaria', preco: 7.50, unidade: 'unidade', ativo: true },

  // Pastelaria
  { id: 'prod-7', nome: 'Pastel de Nata (Caixa 6 un)', categoria: 'pastelaria', preco: 6.90, unidade: 'unidade', ativo: true },
  { id: 'prod-8', nome: 'Bolo de Aniversário Personalizado', categoria: 'pastelaria', preco: 18.50, unidade: 'kg', ativo: true },
  { id: 'prod-9', nome: 'Croissant Francês Manteiga', categoria: 'pastelaria', preco: 1.35, unidade: 'unidade', ativo: true },
  { id: 'prod-10', nome: 'Bola de Berlim com Creme de Ovos', categoria: 'pastelaria', preco: 1.50, unidade: 'unidade', ativo: true },
  { id: 'prod-11', nome: 'Mil-Folhas Crocante com Ovos Moles', categoria: 'pastelaria', preco: 1.70, unidade: 'unidade', ativo: true },
  { id: 'prod-12', nome: 'Tarte de Fruta Fresca', categoria: 'pastelaria', preco: 16.00, unidade: 'unidade', ativo: true },

  // Outros
  { id: 'prod-13', nome: 'Sumo de Laranja Natural 500ml', categoria: 'bebidas_outros', preco: 2.90, unidade: 'unidade', ativo: true },
];

// Encomendas iniciais vazias (agora carregadas exclusivamente do Supabase em tempo real)
export const ENCOMENDAS_INICIAIS: Encomenda[] = [];
