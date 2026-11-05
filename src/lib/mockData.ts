import { Loja, Carrinha, Produto, Encomenda, LogAuditoria, BaseFixaCarrinha, ClienteEmpresarialB2B, DiaSemana } from '../types';

export const LOJAS_MOCK: Loja[] = [
  {
    "id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "codigo": "LOJA-1",
    "nome": "Padaria da Vila I (Praça)",
    "morada": "Praça Brandão de Vasconcelos, 4540-102 Arouca",
    "telefone": "210000001",
    "nif": "500100201",
    "ativo": true,
    "criado_em": "2026-09-12T14:49:25.355379+00:00"
  },
  {
    "id": "778dae33-00ea-4ae7-8e36-e1f5fb067dab",
    "codigo": "LOJA-2",
    "nome": "Padaria da Vila II (Av. 25 de Abril)",
    "morada": "Av. 25 de Abril, 4540-102 Arouca",
    "telefone": "210000002",
    "nif": "500100202",
    "ativo": true,
    "criado_em": "2026-09-12T14:49:25.355379+00:00"
  },
  {
    "id": "4d475863-af72-4349-bd4a-66eb7a90304b",
    "codigo": "LOJA-3",
    "nome": "Padaria da Vila III (Loja Carocha)",
    "morada": "Arouca (Ponto de Venda)",
    "telefone": "210000003",
    "nif": "500100203",
    "ativo": true,
    "criado_em": "2026-09-12T14:49:25.355379+00:00"
  },
  {
    "id": "fabbbb00-0000-0000-0000-000000000001",
    "codigo": "FABRICO",
    "nome": "Centro de Fabrico",
    "morada": "Zona Operacional / Fabrico, Arouca",
    "telefone": "210000000",
    "nif": "500100200",
    "ativo": true,
    "criado_em": "2026-09-12T14:49:25.355379+00:00"
  }
];

export const CARRINHAS_MOCK: Carrinha[] = [
  {
    "id": "1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 1",
    "rota": "Rota 1",
    "nome_carro": "Carro 1",
    "matricula": "42-AB-90",
    "nome_condutor": "Manuel Silva",
    "numero": 1,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-09-12T15:48:41.304463+00:00"
  },
  {
    "id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 2",
    "rota": "Rota 2",
    "nome_carro": "Carro 2",
    "matricula": "77-ZX-12",
    "nome_condutor": "António Ferreira",
    "numero": 2,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-09-12T15:48:41.304463+00:00"
  },
  {
    "id": "e062fea7-97da-4b2a-8607-da6a9ea8e668",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 3",
    "rota": "Rota 3",
    "nome_carro": "Carro 3",
    "matricula": "15-TR-33",
    "nome_condutor": "Carlos Rocha",
    "numero": 3,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-09-12T15:48:41.304463+00:00"
  },
  {
    "id": "a282db95-c427-4ed5-83fc-01403bd24cfc",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 4",
    "rota": "Rota 4",
    "nome_carro": "Carro 4",
    "matricula": "90-KL-55",
    "nome_condutor": "José Oliveira",
    "numero": 4,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-09-12T15:48:41.304463+00:00"
  },
  {
    "id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 5",
    "rota": "Rota 5",
    "nome_carro": "Carro 5",
    "matricula": "55-EM-26",
    "nome_condutor": "Vítor Teixeira",
    "numero": 5,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-10-10T10:30:00.000000+00:00"
  },
  {
    "id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 6",
    "rota": "Rota 6",
    "nome_carro": "Carro 6",
    "matricula": "23-QD-78",
    "nome_condutor": "Rui Azevedo",
    "numero": 6,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-10-19T10:00:00.000000+00:00"
  },
  {
    "id": "d777db95-c427-4ed5-83fc-01403bd24cf7",
    "loja_id": "a9982e9f-7899-4a7c-8ce3-bc30f16c99a2",
    "identificador": "Rota 7",
    "rota": "Rota 7",
    "nome_carro": "Carro 7",
    "matricula": "61-HN-44",
    "nome_condutor": "Fernando Pinho",
    "numero": 7,
    "motorista_id": null,
    "ativo": true,
    "criado_em": "2026-10-19T10:00:00.000000+00:00"
  }
];

export const COLUNAS_MAPA_DIARIO_OFICIAL: string[] = [
  "Pão Normal",
  "Pão Integral",
  "Pão de Centeio",
  "Padas Normais",
  "Padas de Centeio",
  "Padinhas",
  "Pão de Leite",
  "Pão Saloio",
  "Pão Italiano",
  "Pão de Sementes",
  "Pão de Alfarroba",
  "Pão 7 Grãos Pequeno",
  "Pão de Canela",
  "Pão Croissant",
  "Pão de Forma Pequeno",
  "Pão de Forma Grande",
  "Pão de Forma Grande (Corte Fino)",
      "Broa Amarela 1 kg",
  "Broa Amarela 2 kg",
  "Broa Amarela 0,5 kg",
  "Broa Branca 1 kg",
  "Broa Branca 0,5 kg",
  "Broa de Centeio 0,5 kg",
  "Broa de Mistura",
  "Broa com Chouriço",
  "Mini Broa com Chouriço",
  "Triga Milha 0,3 kg",
  "Triga Milha 0,5 kg",
  "Triga Milha 1 kg",
  "Triga Milha Saloio",
  "Regueifa Doce",
  "Regueifa de Côco",
  "Regueifa de Canela",
  "Mini Pão de Centeio",
  "Mini Pão Saloio",
  "Regueifa Branca",
  "Trança Regueifa Branca",
  "Trança de Chocolate",
  "Trança de Creme",
  "Pasteis",
  "Pastel de Nata",
  "Pastel Miniatura",
  "Lanche Misto",
  "Lanche de Fiambre",
  "Lanche de Chocolate",
  "Croissant Simples",
  "Croissant de Chocolate",
  "Meia Lua",
  "Meia Bola de Carne",
  "Fatia de Pizza",
  "Pão Pizza",
  "Merendas",
  "Pão com Chouriço",
  "Pão de Bico",
  "Pão de Cachorro",
  "Pão de Hamburguer",
  "Baguete",
  "Broa Centeio",
  "Canilha",
  "Tosta",
  "Cacete"
];

export const BASE_FIXA_CARRINHAS_INICIAL: BaseFixaCarrinha[] = [
  {
    "carrinha_id": "1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75",
    "carrinha_nome": "Rota 1",
    "quantidades_por_produto": {
      "Pão Normal": 260,
      "Pão Integral": 43,
      "Pão de Centeio": 38,
      "Padas Normais": 330,
      "Padas de Centeio": 4,
      "Padinhas": 7,
      "Pão de Leite": 1,
      "Triga Milha 0,5 kg": 2,
      "Broa Amarela 2 kg": 4,
      "Broa Amarela 1 kg": 6,
      "Pão de Forma Pequeno": 5,
      "Pasteis": 40,
      "Lanche Misto": 3,
      "Pão Saloio": 1,
      "Pão Italiano": 40,
      "Pão de Sementes": 10,
      "Pão de Forma Grande": 1,
      "Pão de Alfarroba": 6,
      "Tosta": 5,
      "Pão de Canela": 3
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 260,
        "Pão Integral": 43,
        "Pão de Centeio": 38,
        "Padas Normais": 330,
        "Padas de Centeio": 4,
        "Padinhas": 7,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 2,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 6,
        "Pão de Forma Pequeno": 5,
        "Pasteis": 40,
        "Lanche Misto": 3,
        "Pão Saloio": 1,
        "Pão Italiano": 40,
        "Pão de Sementes": 10,
        "Pão de Forma Grande": 1,
        "Pão de Alfarroba": 6,
        "Tosta": 5,
        "Pão de Canela": 3
      },
      "ter": {
        "Pão Normal": 260,
        "Pão Integral": 33,
        "Pão de Centeio": 38,
        "Padas Normais": 330,
        "Padas de Centeio": 4,
        "Padinhas": 7,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 2,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 5,
        "Pão de Forma Pequeno": 5,
        "Pasteis": 50,
        "Lanche Misto": 3,
        "Pão Saloio": 9,
        "Pão Italiano": 40,
        "Pão de Sementes": 10,
        "Pão de Forma Grande": 1,
        "Pão de Alfarroba": 6,
        "Tosta": 5,
        "Pão de Canela": 3
      },
      "qua": {
        "Pão Normal": 262,
        "Pão Integral": 43,
        "Pão de Centeio": 38,
        "Padas Normais": 330,
        "Padas de Centeio": 4,
        "Padinhas": 7,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 2,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 5,
        "Pão de Forma Pequeno": 5,
        "Pasteis": 50,
        "Lanche Misto": 3,
        "Pão Saloio": 9,
        "Pão Italiano": 40,
        "Pão de Sementes": 10,
        "Pão de Forma Grande": 1,
        "Pão de Alfarroba": 6,
        "Tosta": 5,
        "Pão de Canela": 3
      },
      "qui": {
        "Pão Normal": 262,
        "Pão Integral": 43,
        "Pão de Centeio": 38,
        "Padas Normais": 330,
        "Padas de Centeio": 4,
        "Padinhas": 7,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 2,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 5,
        "Pão de Forma Pequeno": 5,
        "Pasteis": 40,
        "Lanche Misto": 3,
        "Pão Saloio": 9,
        "Pão Italiano": 40,
        "Pão de Sementes": 10,
        "Pão de Forma Grande": 1,
        "Pão de Alfarroba": 6,
        "Tosta": 5,
        "Pão de Canela": 3
      },
      "sex": {
        "Pão Normal": 257,
        "Pão Integral": 33,
        "Pão de Centeio": 38,
        "Padas Normais": 330,
        "Padas de Centeio": 4,
        "Padinhas": 7,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 2,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 6,
        "Pão de Forma Pequeno": 5,
        "Pasteis": 40,
        "Lanche Misto": 3,
        "Pão Saloio": 9,
        "Pão Italiano": 40,
        "Pão de Sementes": 10,
        "Pão de Forma Grande": 1,
        "Pão de Alfarroba": 6,
        "Tosta": 5,
        "Pão de Canela": 3,
        "Regueifa de Canela": 1
      },
      "sab": {
        "Pão Normal": 280,
        "Pão Integral": 56,
        "Pão de Centeio": 38,
        "Padas Normais": 380,
        "Padas de Centeio": 5,
        "Padinhas": 8,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 6,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 6,
        "Pão de Forma Pequeno": 8,
        "Pasteis": 50,
        "Lanche Misto": 3,
        "Pão Saloio": 9,
        "Pão Italiano": 40,
        "Pão de Sementes": 10,
        "Regueifa de Côco": 1,
        "Regueifa Doce": 2,
        "Meia Lua": 1,
        "Regueifa de Canela": 2,
        "Pão de Forma Grande": 1,
        "Pão de Alfarroba": 6,
        "Broa de Centeio 0,5 kg": 2,
        "Trança de Chocolate": 1,
        "Trança de Creme": 1,
        "Regueifa Branca": 6,
        "Trança Regueifa Branca": 5
      },
      "dom": {
        "Pão Normal": 80,
        "Pão Integral": 15,
        "Pão de Centeio": 12,
        "Padas Normais": 145,
        "Padas de Centeio": 4,
        "Padinhas": 6,
        "Pão de Leite": 1,
        "Triga Milha 0,5 kg": 1,
        "Broa Amarela 2 kg": 4,
        "Broa Amarela 1 kg": 3,
        "Pasteis": 60,
        "Pão Saloio": 4,
        "Pão Italiano": 35,
        "Regueifa de Côco": 4,
        "Regueifa Doce": 5,
        "Meia Lua": 3,
        "Trança de Chocolate": 3,
        "Trança de Creme": 3,
        "Regueifa Branca": 18,
        "Trança Regueifa Branca": 32
      }
    }
  },
  {
    "carrinha_id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "carrinha_nome": "Rota 2",
    "quantidades_por_produto": {
      "Pão Integral": 48,
      "Pão de Centeio": 53,
      "Pão Normal": 270,
      "Padas de Centeio": 27,
      "Padas Normais": 170,
      "Padinhas": 88,
      "Triga Milha 0,5 kg": 1,
      "Pão de Bico": 10,
      "Broa Branca 1 kg": 3,
      "Broa Amarela 1 kg": 2,
      "Pão de Forma Pequeno": 2,
      "Pasteis": 15,
      "Lanche Misto": 2,
      "Pão Italiano": 37,
      "Pão de Sementes": 8,
      "Pão 7 Grãos Pequeno": 1,
      "Tosta": 2,
      "Pão Croissant": 3
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 48,
        "Pão de Centeio": 53,
        "Pão Normal": 270,
        "Padas de Centeio": 27,
        "Padas Normais": 170,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 1,
        "Pão de Bico": 10,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 15,
        "Lanche Misto": 2,
        "Pão Italiano": 37,
        "Pão de Sementes": 8,
        "Pão 7 Grãos Pequeno": 1,
        "Tosta": 2,
        "Pão Croissant": 3
      },
      "ter": {
        "Pão Integral": 48,
        "Pão de Centeio": 53,
        "Pão Normal": 270,
        "Padas de Centeio": 27,
        "Padas Normais": 170,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 1,
        "Pão de Bico": 10,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 15,
        "Lanche Misto": 2,
        "Pão Italiano": 37,
        "Pão de Sementes": 8,
        "Pão 7 Grãos Pequeno": 1,
        "Tosta": 2,
        "Pão Croissant": 3
      },
      "qua": {
        "Pão Integral": 48,
        "Pão de Centeio": 53,
        "Pão Normal": 270,
        "Padas de Centeio": 27,
        "Padas Normais": 170,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 1,
        "Pão de Bico": 10,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 15,
        "Lanche Misto": 2,
        "Pão Italiano": 37,
        "Pão de Sementes": 8,
        "Pão 7 Grãos Pequeno": 1,
        "Tosta": 2,
        "Pão Croissant": 3
      },
      "qui": {
        "Pão Integral": 48,
        "Pão de Centeio": 53,
        "Pão Normal": 270,
        "Padas de Centeio": 27,
        "Padas Normais": 170,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 1,
        "Pão de Bico": 10,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 15,
        "Lanche Misto": 2,
        "Pão Italiano": 37,
        "Pão de Sementes": 8,
        "Pão 7 Grãos Pequeno": 1,
        "Tosta": 2,
        "Pão Croissant": 3
      },
      "sex": {
        "Pão Integral": 48,
        "Pão de Centeio": 53,
        "Pão Normal": 270,
        "Padas de Centeio": 27,
        "Padas Normais": 170,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 1,
        "Pão de Bico": 10,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 15,
        "Lanche Misto": 2,
        "Pão Italiano": 37,
        "Pão de Sementes": 8,
        "Pão 7 Grãos Pequeno": 1,
        "Tosta": 2,
        "Pão Croissant": 3,
        "Pão de Forma Grande": 5
      },
      "sab": {
        "Pão Integral": 75,
        "Pão de Centeio": 75,
        "Pão Normal": 340,
        "Padas de Centeio": 41,
        "Padas Normais": 250,
        "Padinhas": 100,
        "Triga Milha 0,5 kg": 3,
        "Pão de Bico": 10,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 1 kg": 5,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 21,
        "Lanche Misto": 2,
        "Pão Italiano": 45,
        "Pão de Sementes": 9,
        "Regueifa de Côco": 8,
        "Regueifa Doce": 5,
        "Regueifa de Canela": 1,
        "Pão Croissant": 3
      },
      "dom": {}
    }
  },
  {
    "carrinha_id": "e062fea7-97da-4b2a-8607-da6a9ea8e668",
    "carrinha_nome": "Rota 3",
    "quantidades_por_produto": {
      "Pão Integral": 38,
      "Pão de Centeio": 85,
      "Pão Normal": 520,
      "Padas de Centeio": 32,
      "Padas Normais": 125,
      "Padinhas": 44,
      "Triga Milha 0,5 kg": 2,
      "Broa Branca 1 kg": 1,
      "Broa Branca 0,5 kg": 1,
      "Broa Amarela 1 kg": 2,
      "Pão de Forma Pequeno": 2,
      "Pasteis": 5,
      "Pão Saloio": 22,
      "Pão Italiano": 57,
      "Pão de Sementes": 15,
      "Pão de Alfarroba": 1,
      "Pão 7 Grãos Pequeno": 4,
      "Canilha": 1,
      "Broa de Mistura": 1
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 38,
        "Pão de Centeio": 85,
        "Pão Normal": 520,
        "Padas de Centeio": 32,
        "Padas Normais": 125,
        "Padinhas": 44,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 1,
        "Broa Branca 0,5 kg": 1,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 5,
        "Pão Saloio": 22,
        "Pão Italiano": 57,
        "Pão de Sementes": 15,
        "Pão de Alfarroba": 1,
        "Pão 7 Grãos Pequeno": 4,
        "Canilha": 1,
        "Broa de Mistura": 1
      },
      "ter": {
        "Pão Integral": 38,
        "Pão de Centeio": 85,
        "Pão Normal": 520,
        "Padas de Centeio": 32,
        "Padas Normais": 125,
        "Padinhas": 44,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 1,
        "Broa Branca 0,5 kg": 1,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 5,
        "Pão Saloio": 22,
        "Pão Italiano": 57,
        "Pão de Sementes": 15,
        "Pão de Alfarroba": 1,
        "Pão 7 Grãos Pequeno": 4,
        "Canilha": 1,
        "Broa de Mistura": 1
      },
      "qua": {
        "Pão Integral": 38,
        "Pão de Centeio": 85,
        "Pão Normal": 520,
        "Padas de Centeio": 32,
        "Padas Normais": 125,
        "Padinhas": 44,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 1,
        "Broa Branca 0,5 kg": 1,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 5,
        "Pão Saloio": 22,
        "Pão Italiano": 57,
        "Pão de Sementes": 15,
        "Pão de Alfarroba": 1,
        "Pão 7 Grãos Pequeno": 4,
        "Canilha": 1,
        "Broa de Mistura": 1,
        "Regueifa Branca": 1
      },
      "qui": {
        "Pão Integral": 38,
        "Pão de Centeio": 85,
        "Pão Normal": 520,
        "Padas de Centeio": 32,
        "Padas Normais": 125,
        "Padinhas": 44,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 1,
        "Broa Branca 0,5 kg": 1,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 5,
        "Pão Saloio": 22,
        "Pão Italiano": 57,
        "Pão de Sementes": 15,
        "Pão de Alfarroba": 1,
        "Pão 7 Grãos Pequeno": 4,
        "Canilha": 1,
        "Broa de Mistura": 1
      },
      "sex": {
        "Pão Integral": 38,
        "Pão de Centeio": 85,
        "Pão Normal": 520,
        "Padas de Centeio": 32,
        "Padas Normais": 125,
        "Padinhas": 44,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 1,
        "Broa Branca 0,5 kg": 1,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 5,
        "Pão Saloio": 22,
        "Pão Italiano": 57,
        "Pão de Sementes": 15,
        "Pão de Alfarroba": 1,
        "Pão 7 Grãos Pequeno": 4,
        "Canilha": 1,
        "Broa de Mistura": 1
      },
      "sab": {
        "Pão Integral": 45,
        "Pão de Centeio": 35,
        "Pão Normal": 620,
        "Padas de Centeio": 90,
        "Padas Normais": 160,
        "Padinhas": 44,
        "Triga Milha 0,5 kg": 3,
        "Broa Branca 1 kg": 2,
        "Broa Branca 0,5 kg": 1,
        "Broa Amarela 1 kg": 2,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 15,
        "Pão Saloio": 23,
        "Pão Italiano": 70,
        "Pão de Sementes": 15,
        "Regueifa Doce": 3,
        "Pão de Alfarroba": 1,
        "Pão 7 Grãos Pequeno": 4,
        "Trança de Chocolate": 1,
        "Regueifa Branca": 11,
        "Canilha": 2,
        "Broa de Mistura": 1
      },
      "dom": {}
    }
  },
  {
    "carrinha_id": "a282db95-c427-4ed5-83fc-01403bd24cfc",
    "carrinha_nome": "Rota 4",
    "quantidades_por_produto": {
      "Pão Integral": 31,
      "Pão de Centeio": 60,
      "Pão Normal": 240,
      "Padas de Centeio": 8,
      "Padas Normais": 13,
      "Padinhas": 24,
      "Broa Amarela 0,5 kg": 1,
      "Pão Saloio": 2,
      "Pão Italiano": 23,
      "Pão de Sementes": 10,
      "Pão de Alfarroba": 2,
      "Pão 7 Grãos Pequeno": 4,
      "Pão Croissant": 4
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 31,
        "Pão de Centeio": 60,
        "Pão Normal": 240,
        "Padas de Centeio": 8,
        "Padas Normais": 13,
        "Padinhas": 24,
        "Broa Amarela 0,5 kg": 1,
        "Pão Saloio": 2,
        "Pão Italiano": 23,
        "Pão de Sementes": 10,
        "Pão de Alfarroba": 2,
        "Pão 7 Grãos Pequeno": 4,
        "Pão Croissant": 4
      },
      "ter": {
        "Pão Integral": 31,
        "Pão de Centeio": 60,
        "Pão Normal": 240,
        "Padas de Centeio": 8,
        "Padas Normais": 13,
        "Padinhas": 24,
        "Broa Amarela 0,5 kg": 1,
        "Pão Saloio": 2,
        "Pão Italiano": 23,
        "Pão de Sementes": 10,
        "Pão de Alfarroba": 2,
        "Pão 7 Grãos Pequeno": 4,
        "Pão Croissant": 4
      },
      "qua": {
        "Pão Integral": 31,
        "Pão de Centeio": 60,
        "Pão Normal": 240,
        "Padas de Centeio": 8,
        "Padas Normais": 13,
        "Padinhas": 24,
        "Broa Amarela 0,5 kg": 1,
        "Pão Saloio": 2,
        "Pão Italiano": 23,
        "Pão de Sementes": 10,
        "Pão de Alfarroba": 2,
        "Pão 7 Grãos Pequeno": 4,
        "Pão Croissant": 4
      },
      "qui": {
        "Pão Integral": 31,
        "Pão de Centeio": 60,
        "Pão Normal": 240,
        "Padas de Centeio": 8,
        "Padas Normais": 13,
        "Padinhas": 24,
        "Broa Amarela 0,5 kg": 1,
        "Pão Saloio": 2,
        "Pão Italiano": 23,
        "Pão de Sementes": 10,
        "Pão de Alfarroba": 2,
        "Pão 7 Grãos Pequeno": 4,
        "Pão Croissant": 4
      },
      "sex": {
        "Pão Integral": 31,
        "Pão de Centeio": 60,
        "Pão Normal": 240,
        "Padas de Centeio": 8,
        "Padas Normais": 13,
        "Padinhas": 24,
        "Broa Amarela 0,5 kg": 1,
        "Pão Saloio": 2,
        "Pão Italiano": 23,
        "Pão de Sementes": 10,
        "Pão de Alfarroba": 2,
        "Pão 7 Grãos Pequeno": 4,
        "Pão Croissant": 4
      },
      "sab": {
        "Pão Integral": 32,
        "Pão de Centeio": 50,
        "Pão Normal": 220,
        "Padas de Centeio": 14,
        "Padas Normais": 13,
        "Padinhas": 24,
        "Broa Amarela 0,5 kg": 1,
        "Pão Saloio": 2,
        "Pão Italiano": 23,
        "Pão de Sementes": 10,
        "Pão de Alfarroba": 2,
        "Pão 7 Grãos Pequeno": 4,
        "Pão Croissant": 4
      },
      "dom": {}
    }
  },
  {
    "carrinha_id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "carrinha_nome": "Rota 5",
    "quantidades_por_produto": {
      "Pão Integral": 2,
      "Pão de Centeio": 20,
      "Pão Normal": 113,
      "Padas de Centeio": 2,
      "Padas Normais": 70,
      "Padinhas": 2,
      "Pão Italiano": 6
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 2,
        "Pão de Centeio": 20,
        "Pão Normal": 113,
        "Padas de Centeio": 2,
        "Padas Normais": 70,
        "Padinhas": 2,
        "Pão Italiano": 6
      },
      "ter": {
        "Pão Integral": 2,
        "Pão de Centeio": 20,
        "Pão Normal": 113,
        "Padas de Centeio": 2,
        "Padas Normais": 70,
        "Padinhas": 2,
        "Pão Italiano": 6
      },
      "qua": {
        "Pão Integral": 2,
        "Pão de Centeio": 20,
        "Pão Normal": 113,
        "Padas de Centeio": 2,
        "Padas Normais": 70,
        "Padinhas": 2,
        "Pão Italiano": 6
      },
      "qui": {
        "Pão Integral": 2,
        "Pão de Centeio": 20,
        "Pão Normal": 113,
        "Padas de Centeio": 2,
        "Padas Normais": 70,
        "Padinhas": 2,
        "Pão Italiano": 6
      },
      "sex": {
        "Pão Integral": 2,
        "Pão de Centeio": 20,
        "Pão Normal": 113,
        "Padas de Centeio": 2,
        "Padas Normais": 70,
        "Padinhas": 2,
        "Pão Italiano": 6
      },
      "sab": {
        "Pão Integral": 2,
        "Pão de Centeio": 25,
        "Pão Normal": 130,
        "Padas de Centeio": 4,
        "Padas Normais": 100,
        "Padinhas": 2,
        "Pão Italiano": 6
      },
      "dom": {}
    }
  },
  {
    "carrinha_id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "carrinha_nome": "Rota 6",
    "quantidades_por_produto": {
      "Pão Normal": 150,
      "Pão Integral": 20,
      "Pão de Centeio": 25,
      "Padas Normais": 60,
      "Padinhas": 30,
      "Pão Italiano": 20,
      "Pão Saloio": 15,
      "Broa Amarela 1 kg": 5,
      "Pasteis": 20,
      "Lanche Misto": 5
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 150,
        "Pão Integral": 20,
        "Pão de Centeio": 25,
        "Padas Normais": 60,
        "Padinhas": 30,
        "Pão Italiano": 20,
        "Pão Saloio": 15,
        "Broa Amarela 1 kg": 5,
        "Pasteis": 20,
        "Lanche Misto": 5
      },
      "ter": {
        "Pão Normal": 150,
        "Pão Integral": 20,
        "Pão de Centeio": 25,
        "Padas Normais": 60,
        "Padinhas": 30,
        "Pão Italiano": 20,
        "Pão Saloio": 15,
        "Broa Amarela 1 kg": 5,
        "Pasteis": 20,
        "Lanche Misto": 5
      },
      "qua": {
        "Pão Normal": 150,
        "Pão Integral": 20,
        "Pão de Centeio": 25,
        "Padas Normais": 60,
        "Padinhas": 30,
        "Pão Italiano": 20,
        "Pão Saloio": 15,
        "Broa Amarela 1 kg": 5,
        "Pasteis": 20,
        "Lanche Misto": 5
      },
      "qui": {
        "Pão Normal": 150,
        "Pão Integral": 20,
        "Pão de Centeio": 25,
        "Padas Normais": 60,
        "Padinhas": 30,
        "Pão Italiano": 20,
        "Pão Saloio": 15,
        "Broa Amarela 1 kg": 5,
        "Pasteis": 20,
        "Lanche Misto": 5
      },
      "sex": {
        "Pão Normal": 150,
        "Pão Integral": 20,
        "Pão de Centeio": 25,
        "Padas Normais": 60,
        "Padinhas": 30,
        "Pão Italiano": 20,
        "Pão Saloio": 15,
        "Broa Amarela 1 kg": 5,
        "Pasteis": 20,
        "Lanche Misto": 5
      },
      "sab": {
        "Pão Normal": 150,
        "Pão Integral": 20,
        "Pão de Centeio": 25,
        "Padas Normais": 60,
        "Padinhas": 30,
        "Pão Italiano": 20,
        "Pão Saloio": 15,
        "Broa Amarela 1 kg": 5,
        "Pasteis": 20,
        "Lanche Misto": 5
      },
      "dom": {}
    }
  },
  {
    "carrinha_id": "d777db95-c427-4ed5-83fc-01403bd24cf7",
    "carrinha_nome": "Rota 7",
    "quantidades_por_produto": {
      "Pão Integral": 20,
      "Pão de Centeio": 40,
      "Pão Normal": 520,
      "Padas Normais": 30,
      "Padinhas": 88,
      "Triga Milha 0,5 kg": 2,
      "Broa Branca 1 kg": 3,
      "Broa Amarela 1 kg": 14,
      "Pão de Forma Pequeno": 2,
      "Pasteis": 25,
      "Lanche Misto": 2,
      "Pão Saloio": 10,
      "Pão Italiano": 30,
      "Pão de Sementes": 15,
      "Tosta": 3,
      "Pão Croissant": 5,
      "Broa de Mistura": 5
    },
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 20,
        "Pão de Centeio": 40,
        "Pão Normal": 520,
        "Padas Normais": 30,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 14,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 25,
        "Lanche Misto": 2,
        "Pão Saloio": 10,
        "Pão Italiano": 30,
        "Pão de Sementes": 15,
        "Tosta": 3,
        "Pão Croissant": 5,
        "Broa de Mistura": 5
      },
      "ter": {
        "Pão Integral": 20,
        "Pão de Centeio": 40,
        "Pão Normal": 520,
        "Padas Normais": 30,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 14,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 25,
        "Lanche Misto": 2,
        "Pão Saloio": 10,
        "Pão Italiano": 30,
        "Pão de Sementes": 15,
        "Tosta": 3,
        "Pão Croissant": 5,
        "Broa de Mistura": 5
      },
      "qua": {
        "Pão Integral": 20,
        "Pão de Centeio": 40,
        "Pão Normal": 520,
        "Padas Normais": 30,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 14,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 25,
        "Lanche Misto": 2,
        "Pão Saloio": 10,
        "Pão Italiano": 30,
        "Pão de Sementes": 15,
        "Tosta": 3,
        "Pão Croissant": 5,
        "Broa de Mistura": 5
      },
      "qui": {
        "Pão Integral": 20,
        "Pão de Centeio": 40,
        "Pão Normal": 520,
        "Padas Normais": 30,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 14,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 25,
        "Lanche Misto": 2,
        "Pão Saloio": 10,
        "Pão Italiano": 30,
        "Pão de Sementes": 15,
        "Tosta": 3,
        "Pão Croissant": 5,
        "Broa de Mistura": 5
      },
      "sex": {
        "Pão Integral": 20,
        "Pão de Centeio": 40,
        "Pão Normal": 520,
        "Padas Normais": 30,
        "Padinhas": 88,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 14,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 25,
        "Lanche Misto": 2,
        "Pão Saloio": 10,
        "Pão Italiano": 30,
        "Pão de Sementes": 15,
        "Tosta": 3,
        "Pão Croissant": 5,
        "Broa de Mistura": 5
      },
      "sab": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Pão Normal": 50,
        "Padas Normais": 25,
        "Padinhas": 100,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 3,
        "Broa Amarela 1 kg": 14,
        "Pão de Forma Pequeno": 2,
        "Pasteis": 25,
        "Lanche Misto": 2,
        "Pão Saloio": 10,
        "Pão Italiano": 30,
        "Pão de Sementes": 15,
        "Tosta": 3,
        "Pão Croissant": 5,
        "Broa de Mistura": 5
      },
      "dom": {}
    }
  }
];

export const CLIENTES_EMPRESARIAIS_B2B_INICIAIS: ClienteEmpresarialB2B[] = [
  {
    "id": "b2b-lanterna",
    "nome": "Lanterna",
    "telefone": "910111222",
    "telemovel": "910111222",
    "email": "lanterna@padaria.pt",
    "morada": "Arouca",
    "carrinha_id": "1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Broa Amarela 1 kg": 3
      },
      "ter": {
        "Broa Amarela 1 kg": 3
      },
      "qua": {
        "Broa Amarela 1 kg": 3
      },
      "qui": {
        "Broa Amarela 1 kg": 3
      },
      "sex": {
        "Broa Amarela 1 kg": 3
      },
      "sab": {
        "Broa Amarela 1 kg": 3,
        "Regueifa de Côco": 2,
        "Trança de Chocolate": 2
      },
      "dom": {
        "Broa Amarela 1 kg": 4,
        "Regueifa de Côco": 4,
        "Trança de Chocolate": 2
      }
    }
  },
  {
    "id": "b2b-cavadinha-cabecais",
    "nome": "Cavadinha Cabeçais",
    "telefone": "910222333",
    "telemovel": "910222333",
    "email": "cavadinha.cabecais@padaria.pt",
    "morada": "Cabeçais, Arouca",
    "carrinha_id": "1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 80,
        "Padas Normais": 20,
        "Pão Integral": 5,
        "Pão de Centeio": 10,
        "Pão Italiano": 50,
        "Pão de Sementes": 5,
        "Pão Saloio": 20,
        "Padinhas": 50,
        "Pasteis": 10,
        "Broa Amarela 1 kg": 4,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Regueifa de Canela": 1,
        "Pão Croissant": 8,
        "Meia Bola de Carne": 1
      },
      "ter": {
        "Pão Normal": 100,
        "Padas Normais": 20,
        "Pão Integral": 5,
        "Pão de Centeio": 5,
        "Pão Italiano": 80,
        "Pão de Sementes": 5,
        "Pão Saloio": 20,
        "Padinhas": 50,
        "Pasteis": 10,
        "Broa Amarela 1 kg": 4,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Regueifa de Canela": 1,
        "Pão Croissant": 8,
        "Meia Bola de Carne": 1
      },
      "qua": {
        "Pão Normal": 80,
        "Padas Normais": 20,
        "Pão Integral": 5,
        "Pão de Centeio": 10,
        "Pão Italiano": 50,
        "Pão de Sementes": 5,
        "Pão Saloio": 20,
        "Padinhas": 50,
        "Pasteis": 10,
        "Broa Amarela 1 kg": 4,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Regueifa de Canela": 1,
        "Pão Croissant": 1,
        "Meia Bola de Carne": 1
      },
      "qui": {
        "Pão Normal": 80,
        "Padas Normais": 20,
        "Pão Integral": 5,
        "Pão de Centeio": 10,
        "Pão Italiano": 50,
        "Pão de Sementes": 5,
        "Pão Saloio": 20,
        "Padinhas": 50,
        "Pasteis": 10,
        "Broa Amarela 1 kg": 4,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Regueifa de Canela": 1,
        "Pão Croissant": 1,
        "Meia Bola de Carne": 1
      },
      "sex": {
        "Pão Normal": 80,
        "Padas Normais": 20,
        "Pão Integral": 5,
        "Pão de Centeio": 10,
        "Pão Italiano": 50,
        "Pão de Sementes": 5,
        "Pão Saloio": 20,
        "Padinhas": 50,
        "Pasteis": 10,
        "Broa Amarela 1 kg": 4,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Regueifa de Canela": 1,
        "Pão Croissant": 1,
        "Meia Bola de Carne": 1
      },
      "sab": {
        "Pão Normal": 80,
        "Padas Normais": 20,
        "Pão Integral": 5,
        "Pão de Centeio": 10,
        "Pão Italiano": 50,
        "Pão de Sementes": 5,
        "Pão Saloio": 20,
        "Padinhas": 50,
        "Pasteis": 10,
        "Broa Amarela 1 kg": 4,
        "Regueifa Doce": 2,
        "Regueifa de Côco": 3,
        "Regueifa de Canela": 1,
        "Pão Croissant": 8,
        "Meia Bola de Carne": 1,
        "Trança de Chocolate": 2,
        "Trança de Creme": 1,
        "Meia Lua": 1,
        "Regueifa Branca": 2
      },
      "dom": {
        "Pão Normal": 80,
        "Padas Normais": 10,
        "Pão Integral": 5,
        "Pão Italiano": 30,
        "Pão de Sementes": 10,
        "Pão Saloio": 20,
        "Padinhas": 60,
        "Pasteis": 5,
        "Broa Amarela 1 kg": 3,
        "Regueifa Doce": 3,
        "Regueifa de Côco": 2,
        "Regueifa de Canela": 2,
        "Trança de Chocolate": 2,
        "Regueifa Branca": 2
      }
    }
  },
  {
    "id": "b2b-escola-escariz",
    "nome": "Escola de Escariz",
    "telefone": "256940010",
    "telemovel": "910333444",
    "email": "escola.escariz@padaria.pt",
    "morada": "Escariz, Arouca",
    "carrinha_id": "1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Saloio": 30,
        "Pão de Sementes": 10,
        "Padinhas": 15,
        "Pão de Leite": 15,
        "Pão de Forma Grande (Corte Fino)": 2,
        "Croissant Simples": 40,
        "Croissant de Chocolate": 15,
        "Lanche de Fiambre": 10,
        "Lanche de Chocolate": 6,
        "Pastel de Nata": 1
      },
      "ter": {
        "Pão Saloio": 30,
        "Pão de Sementes": 10,
        "Padinhas": 15,
        "Pão de Leite": 15,
        "Pão de Forma Grande (Corte Fino)": 2,
        "Croissant Simples": 40,
        "Croissant de Chocolate": 15,
        "Lanche de Fiambre": 10,
        "Lanche de Chocolate": 6,
        "Pastel de Nata": 1
      },
      "qua": {
        "Pão Saloio": 30,
        "Pão de Sementes": 10,
        "Padinhas": 15,
        "Pão de Leite": 15,
        "Pão de Forma Grande (Corte Fino)": 2,
        "Croissant Simples": 40,
        "Croissant de Chocolate": 15,
        "Lanche de Fiambre": 10,
        "Lanche de Chocolate": 6,
        "Pastel de Nata": 1
      },
      "qui": {
        "Pão Saloio": 30,
        "Pão de Sementes": 10,
        "Padinhas": 15,
        "Pão de Leite": 15,
        "Pão de Forma Grande (Corte Fino)": 2,
        "Croissant Simples": 40,
        "Croissant de Chocolate": 15,
        "Lanche de Fiambre": 10,
        "Lanche de Chocolate": 6,
        "Pastel de Nata": 1
      },
      "sex": {
        "Pão Saloio": 30,
        "Pão de Sementes": 10,
        "Padinhas": 15,
        "Pão de Leite": 15,
        "Pão de Forma Grande (Corte Fino)": 2,
        "Croissant Simples": 40,
        "Croissant de Chocolate": 15,
        "Lanche de Fiambre": 10,
        "Lanche de Chocolate": 6,
        "Pastel de Nata": 1
      },
      "sab": {
        "Pão Saloio": 30,
        "Pão de Sementes": 10,
        "Padinhas": 15,
        "Pão de Leite": 15,
        "Pão de Forma Grande (Corte Fino)": 2,
        "Croissant Simples": 40,
        "Croissant de Chocolate": 15,
        "Lanche de Fiambre": 10,
        "Lanche de Chocolate": 6,
        "Pastel de Nata": 1
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-mercearia-ribeiro",
    "nome": "Mercearia Ribeiro",
    "telefone": "910444555",
    "telemovel": "910444555",
    "email": "mercearia.ribeiro@padaria.pt",
    "morada": "Chave, Arouca",
    "carrinha_id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 12,
        "Padas Normais": 20,
        "Padas de Centeio": 2,
        "Pão Integral": 2,
        "Pão Italiano": 8
      },
      "ter": {
        "Pão Normal": 12,
        "Padas Normais": 20,
        "Padas de Centeio": 2,
        "Pão Integral": 2,
        "Pão Italiano": 8
      },
      "qua": {
        "Pão Normal": 28,
        "Padas Normais": 20,
        "Padas de Centeio": 2,
        "Pão Integral": 22,
        "Pão Italiano": 8
      },
      "qui": {
        "Pão Normal": 12,
        "Padas Normais": 20,
        "Padas de Centeio": 2,
        "Pão Integral": 2,
        "Pão Italiano": 8
      },
      "sex": {
        "Pão Normal": 12,
        "Padas Normais": 20,
        "Padas de Centeio": 2,
        "Pão Integral": 2,
        "Pão Italiano": 8
      },
      "sab": {
        "Pão Normal": 16,
        "Padas Normais": 28,
        "Padas de Centeio": 1,
        "Pão Integral": 2,
        "Pão Italiano": 8
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-cafe-ribeiro",
    "nome": "Café Ribeiro",
    "telefone": "910555666",
    "telemovel": "910555666",
    "email": "cafe.ribeiro@padaria.pt",
    "morada": "Chave, Arouca",
    "carrinha_id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pasteis": 15
      },
      "ter": {
        "Pasteis": 15
      },
      "qua": {
        "Pasteis": 15
      },
      "qui": {
        "Pasteis": 15
      },
      "sex": {
        "Pasteis": 15
      },
      "sab": {
        "Pasteis": 15
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-restaurante-chao-de-ave",
    "nome": "Restaurante Chão de Ave",
    "telefone": "910666777",
    "telemovel": "910666777",
    "email": "chaodeave@padaria.pt",
    "morada": "Chão de Ave, Arouca",
    "carrinha_id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 12,
        "Pasteis": 13
      },
      "ter": {
        "Pão Normal": 12,
        "Pasteis": 13
      },
      "qua": {
        "Pão Normal": 12,
        "Pasteis": 13,
        "Broa Amarela 1 kg": 4,
        "Padinhas": 80
      },
      "qui": {
        "Pão Normal": 12,
        "Pasteis": 13
      },
      "sex": {
        "Pão Normal": 12,
        "Pasteis": 13
      },
      "sab": {
        "Pão Normal": 12,
        "Pasteis": 13
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-ass-pais-chave",
    "nome": "Associação de Pais de Chave",
    "telefone": "256940020",
    "telemovel": "910777888",
    "email": "pais.chave@padaria.pt",
    "morada": "Escola de Chave, Arouca",
    "carrinha_id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Mini Pão de Centeio": 30
      },
      "ter": {
        "Mini Pão de Centeio": 30
      },
      "qua": {
        "Mini Pão de Centeio": 30
      },
      "qui": {
        "Mini Pão de Centeio": 30
      },
      "sex": {
        "Mini Pão de Centeio": 30
      },
      "sab": {},
      "dom": {}
    }
  },
  {
    "id": "b2b-cavadinha-vale-cambra",
    "nome": "Cavadinha de Vale de Cambra",
    "telefone": "256940030",
    "telemovel": "910888999",
    "email": "cavadinha.valecambra@padaria.pt",
    "morada": "Vale de Cambra",
    "carrinha_id": "5ebae97d-593f-4f54-81c5-b200dd04258b",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 30,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 2,
        "Pão Italiano": 35,
        "Pão Saloio": 20,
        "Pão Croissant": 8,
        "Pasteis": 10,
        "Padas Normais": 30,
        "Pão de Centeio": 10,
        "Pão de Sementes": 5,
        "Pão de Leite": 6,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Meia Lua": 1,
        "Regueifa de Canela": 2,
        "Trança de Chocolate": 1,
        "Meia Bola de Carne": 1
      },
      "ter": {
        "Pão Normal": 30,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 2,
        "Pão Italiano": 35,
        "Pão Saloio": 20,
        "Pão Croissant": 8,
        "Pasteis": 10,
        "Padas Normais": 30,
        "Pão de Centeio": 10,
        "Pão de Sementes": 5,
        "Pão de Leite": 6,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Meia Lua": 1,
        "Regueifa de Canela": 2,
        "Trança de Chocolate": 1,
        "Meia Bola de Carne": 1
      },
      "qua": {
        "Pão Normal": 30,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 2,
        "Pão Italiano": 35,
        "Pão Saloio": 20,
        "Pão Croissant": 8,
        "Pasteis": 10,
        "Padas Normais": 30,
        "Pão de Centeio": 10,
        "Pão de Sementes": 5,
        "Pão de Leite": 6,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Meia Lua": 1,
        "Regueifa de Canela": 2,
        "Trança de Chocolate": 1,
        "Meia Bola de Carne": 1
      },
      "qui": {
        "Pão Normal": 30,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 2,
        "Pão Italiano": 35,
        "Pão Saloio": 20,
        "Pão Croissant": 8,
        "Pasteis": 10,
        "Padas Normais": 30,
        "Pão de Centeio": 10,
        "Pão de Sementes": 5,
        "Pão de Leite": 6,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Meia Lua": 1,
        "Regueifa de Canela": 2,
        "Trança de Chocolate": 1,
        "Meia Bola de Carne": 1
      },
      "sex": {
        "Pão Normal": 30,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 2,
        "Pão Italiano": 35,
        "Pão Saloio": 20,
        "Pão Croissant": 8,
        "Pasteis": 10,
        "Padas Normais": 30,
        "Pão de Centeio": 10,
        "Pão de Sementes": 5,
        "Pão de Leite": 6,
        "Regueifa Doce": 1,
        "Regueifa de Côco": 1,
        "Meia Lua": 1,
        "Regueifa de Canela": 2,
        "Trança de Chocolate": 1,
        "Meia Bola de Carne": 1
      },
      "sab": {
        "Pão Normal": 30,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 2,
        "Pão Italiano": 35,
        "Pão Saloio": 20,
        "Pão Croissant": 8,
        "Pasteis": 10,
        "Padas Normais": 30,
        "Pão de Centeio": 10,
        "Pão de Sementes": 5,
        "Pão de Leite": 6,
        "Regueifa Doce": 2,
        "Regueifa de Côco": 6,
        "Meia Lua": 2,
        "Regueifa de Canela": 3,
        "Trança de Chocolate": 8,
        "Meia Bola de Carne": 1
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-cafe-sto-antonio",
    "nome": "Café Sto. António",
    "telefone": "910999000",
    "telemovel": "910999000",
    "email": "sto.antonio@padaria.pt",
    "morada": "Sto. António, Arouca",
    "carrinha_id": "e062fea7-97da-4b2a-8607-da6a9ea8e668",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 10,
        "Pasteis": 10
      },
      "ter": {
        "Pão Normal": 10,
        "Pasteis": 10
      },
      "qua": {
        "Pão Normal": 10,
        "Pasteis": 10
      },
      "qui": {
        "Pão Normal": 10,
        "Pasteis": 10
      },
      "sex": {
        "Pão Normal": 10,
        "Pasteis": 10
      },
      "sab": {
        "Pão Normal": 10,
        "Pasteis": 10
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-quinta-anterronde",
    "nome": "Quinta de Anterronde",
    "telefone": "256940040",
    "telemovel": "911000111",
    "email": "anterronde@padaria.pt",
    "morada": "Anterronde, Arouca",
    "carrinha_id": "e062fea7-97da-4b2a-8607-da6a9ea8e668",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Padinhas": 20,
        "Pão Italiano": 8
      },
      "ter": {
        "Padinhas": 20,
        "Pão Italiano": 8
      },
      "qua": {
        "Padinhas": 20,
        "Pão Italiano": 8
      },
      "qui": {
        "Padinhas": 20,
        "Pão Italiano": 8
      },
      "sex": {
        "Padinhas": 20,
        "Pão Italiano": 8
      },
      "sab": {
        "Padinhas": 20,
        "Pão Italiano": 8
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-belavista",
    "nome": "Belavista",
    "telefone": "911111222",
    "telemovel": "911111222",
    "email": "belavista@padaria.pt",
    "morada": "Belavista, Arouca",
    "carrinha_id": "e062fea7-97da-4b2a-8607-da6a9ea8e668",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Broa Amarela 1 kg": 2,
        "Padas Normais": 5,
        "Padinhas": 20,
        "Pão Normal": 70,
        "Pão de Sementes": 5,
        "Pão Saloio": 8,
        "Triga Milha Saloio": 1
      },
      "ter": {
        "Broa Amarela 1 kg": 2,
        "Padas Normais": 5,
        "Padinhas": 20,
        "Pão Normal": 70,
        "Pão de Sementes": 5,
        "Pão Saloio": 8,
        "Triga Milha Saloio": 1
      },
      "qua": {
        "Broa Amarela 1 kg": 2,
        "Padas Normais": 5,
        "Padinhas": 20,
        "Pão Normal": 70,
        "Pão de Sementes": 5,
        "Pão Saloio": 8,
        "Triga Milha Saloio": 1
      },
      "qui": {
        "Broa Amarela 1 kg": 2,
        "Padas Normais": 5,
        "Padinhas": 20,
        "Pão Normal": 70,
        "Pão de Sementes": 5,
        "Pão Saloio": 8,
        "Triga Milha Saloio": 1
      },
      "sex": {
        "Broa Amarela 1 kg": 2,
        "Padas Normais": 5,
        "Padinhas": 20,
        "Pão Normal": 70,
        "Pão de Sementes": 5,
        "Pão Saloio": 8,
        "Triga Milha Saloio": 1
      },
      "sab": {
        "Broa Amarela 1 kg": 2,
        "Padas Normais": 5,
        "Padinhas": 10,
        "Pão Normal": 80,
        "Pão de Sementes": 5,
        "Pão Saloio": 9,
        "Triga Milha Saloio": 1,
        "Meia Lua": 1,
        "Pão Italiano": 5,
        "Pasteis": 4,
        "Regueifa Doce": 1,
        "Trança de Chocolate": 1
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-ponte-telhe",
    "nome": "Ponte Telhe",
    "telefone": "911222333",
    "telemovel": "911222333",
    "email": "pontetelhe@padaria.pt",
    "morada": "Ponte de Telhe, Arouca",
    "carrinha_id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 50,
        "Pão Integral": 2,
        "Broa Amarela 1 kg": 1
      },
      "ter": {
        "Pão Normal": 50,
        "Pão Integral": 2,
        "Broa Amarela 1 kg": 1
      },
      "qua": {
        "Pão Normal": 50,
        "Pão Integral": 2,
        "Broa Amarela 1 kg": 1
      },
      "qui": {
        "Pão Normal": 50,
        "Pão Integral": 2,
        "Broa Amarela 1 kg": 1
      },
      "sex": {
        "Pão Normal": 50,
        "Pão Integral": 2,
        "Broa Amarela 1 kg": 1
      },
      "sab": {
        "Pão Normal": 160,
        "Pão Integral": 2,
        "Pasteis": 4,
        "Broa Amarela 2 kg": 1,
        "Pão de Forma Pequeno": 1
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-aicia",
    "nome": "AICIA",
    "telefone": "256940050",
    "telemovel": "911333444",
    "email": "aicia@padaria.pt",
    "morada": "Arouca",
    "carrinha_id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão de Centeio": 120
      },
      "ter": {
        "Pão de Centeio": 120
      },
      "qua": {
        "Pão de Centeio": 120
      },
      "qui": {
        "Pão de Centeio": 120
      },
      "sex": {
        "Pão de Centeio": 120
      },
      "sab": {
        "Pão de Centeio": 80
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-cs-burgo-atl",
    "nome": "Centro Social Burgo ATL",
    "telefone": "256940060",
    "telemovel": "911444555",
    "email": "burgo.atl@padaria.pt",
    "morada": "Burgo, Arouca",
    "carrinha_id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 55
      },
      "ter": {
        "Pão Normal": 55
      },
      "qua": {
        "Pão Normal": 55
      },
      "qui": {
        "Pão Normal": 55
      },
      "sex": {
        "Pão Normal": 55
      },
      "sab": {},
      "dom": {}
    }
  },
  {
    "id": "b2b-creche-burgo",
    "nome": "Creche (Burgo)",
    "telefone": "256940070",
    "telemovel": "911555666",
    "email": "creche.burgo@padaria.pt",
    "morada": "Burgo, Arouca",
    "carrinha_id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão de Centeio": 15
      },
      "ter": {
        "Pão Normal": 11
      },
      "qua": {
        "Pão de Centeio": 15
      },
      "qui": {
        "Pão Normal": 11
      },
      "sex": {
        "Pão de Centeio": 15
      },
      "sab": {},
      "dom": {}
    }
  },
  {
    "id": "b2b-centro-dia-burgo",
    "nome": "Centro de Dia (Burgo)",
    "telefone": "256940080",
    "telemovel": "911666777",
    "email": "centrodia.burgo@padaria.pt",
    "morada": "Burgo, Arouca",
    "carrinha_id": "b555db95-c427-4ed5-83fc-01403bd24cf5",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão de Centeio": 45
      },
      "ter": {
        "Pão de Centeio": 45
      },
      "qua": {
        "Pão de Centeio": 45
      },
      "qui": {
        "Pão de Centeio": 45
      },
      "sex": {
        "Pão de Centeio": 45
      },
      "sab": {},
      "dom": {}
    }
  },
  {
    "id": "b2b-carocha",
    "nome": "Carocha",
    "telefone": "911777888",
    "telemovel": "911777888",
    "email": "carocha@padaria.pt",
    "morada": "Arouca",
    "carrinha_id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 25,
        "Pão de Centeio": 40,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 8,
        "Padinhas": 44,
        "Pão Italiano": 35,
        "Pão Saloio": 35,
        "Mini Pão Saloio": 15,
        "Padas Normais": 15,
        "Pão de Sementes": 15,
        "Broa com Chouriço": 1,
        "Pasteis": 55,
        "Pastel Miniatura": 25,
        "Pão com Chouriço": 8,
        "Lanche Misto": 6,
        "Pão Pizza": 2,
        "Merendas": 2,
        "Meia Bola de Carne": 3
      },
      "ter": {
        "Pão Integral": 25,
        "Pão de Centeio": 40,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 8,
        "Padinhas": 44,
        "Pão Italiano": 35,
        "Pão Saloio": 35,
        "Mini Pão Saloio": 15,
        "Padas Normais": 15,
        "Pão de Sementes": 15,
        "Broa com Chouriço": 1,
        "Pasteis": 55,
        "Pastel Miniatura": 25,
        "Pão com Chouriço": 8,
        "Lanche Misto": 6,
        "Pão Pizza": 2,
        "Merendas": 2,
        "Meia Bola de Carne": 3
      },
      "qua": {
        "Pão Integral": 25,
        "Pão de Centeio": 40,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 8,
        "Padinhas": 44,
        "Pão Italiano": 35,
        "Pão Saloio": 35,
        "Mini Pão Saloio": 15,
        "Padas Normais": 15,
        "Pão de Sementes": 15,
        "Broa com Chouriço": 1,
        "Pasteis": 55,
        "Pastel Miniatura": 25,
        "Pão com Chouriço": 8,
        "Lanche Misto": 6,
        "Pão Pizza": 2,
        "Merendas": 2,
        "Meia Bola de Carne": 3
      },
      "qui": {
        "Pão Integral": 25,
        "Pão de Centeio": 40,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 8,
        "Padinhas": 44,
        "Pão Italiano": 35,
        "Pão Saloio": 35,
        "Mini Pão Saloio": 15,
        "Padas Normais": 15,
        "Pão de Sementes": 15,
        "Broa com Chouriço": 1,
        "Pasteis": 55,
        "Pastel Miniatura": 25,
        "Pão com Chouriço": 8,
        "Lanche Misto": 6,
        "Pão Pizza": 2,
        "Merendas": 2,
        "Meia Bola de Carne": 3
      },
      "sex": {
        "Pão Integral": 25,
        "Pão de Centeio": 40,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 8,
        "Padinhas": 44,
        "Pão Italiano": 35,
        "Pão Saloio": 35,
        "Mini Pão Saloio": 15,
        "Padas Normais": 15,
        "Pão de Sementes": 15,
        "Broa com Chouriço": 1,
        "Pasteis": 55,
        "Pastel Miniatura": 25,
        "Pão com Chouriço": 8,
        "Lanche Misto": 6,
        "Pão Pizza": 2,
        "Merendas": 2,
        "Meia Bola de Carne": 3
      },
      "sab": {
        "Pão Integral": 25,
        "Pão de Centeio": 40,
        "Triga Milha 0,5 kg": 2,
        "Broa Branca 1 kg": 2,
        "Broa Amarela 1 kg": 8,
        "Padinhas": 44,
        "Pão Italiano": 35,
        "Pão Saloio": 35,
        "Mini Pão Saloio": 15,
        "Padas Normais": 15,
        "Pão de Sementes": 15,
        "Broa com Chouriço": 1,
        "Pasteis": 55,
        "Pastel Miniatura": 25,
        "Pão com Chouriço": 8,
        "Lanche Misto": 6,
        "Pão Pizza": 2,
        "Merendas": 2,
        "Meia Bola de Carne": 3
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-pompeu",
    "nome": "Pompeu",
    "telefone": "911888999",
    "telemovel": "911888999",
    "email": "pompeu@padaria.pt",
    "morada": "Arouca",
    "carrinha_id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 50,
        "Pão Italiano": 15,
        "Padas de Centeio": 15,
        "Pasteis": 4,
        "Lanche Misto": 1,
        "Fatia de Pizza": 1,
        "Broa Amarela 1 kg": 3,
        "Triga Milha Saloio": 2
      },
      "ter": {
        "Pão Normal": 50,
        "Pão Italiano": 15,
        "Padas de Centeio": 15,
        "Pasteis": 4,
        "Lanche Misto": 1,
        "Fatia de Pizza": 1,
        "Broa Amarela 1 kg": 3,
        "Triga Milha Saloio": 2
      },
      "qua": {
        "Pão Normal": 50,
        "Pão Italiano": 15,
        "Padas de Centeio": 15,
        "Pasteis": 4,
        "Lanche Misto": 1,
        "Fatia de Pizza": 1,
        "Broa Amarela 1 kg": 3,
        "Triga Milha Saloio": 2
      },
      "qui": {
        "Pão Normal": 50,
        "Pão Italiano": 15,
        "Padas de Centeio": 15,
        "Pasteis": 4,
        "Lanche Misto": 1,
        "Fatia de Pizza": 1,
        "Broa Amarela 1 kg": 3,
        "Triga Milha Saloio": 2
      },
      "sex": {
        "Pão Normal": 50,
        "Pão Italiano": 15,
        "Padas de Centeio": 15,
        "Pasteis": 4,
        "Lanche Misto": 1,
        "Fatia de Pizza": 1,
        "Broa Amarela 1 kg": 3,
        "Triga Milha Saloio": 2
      },
      "sab": {
        "Pão Normal": 50,
        "Pão Italiano": 15,
        "Padas de Centeio": 15,
        "Pasteis": 4,
        "Lanche Misto": 1,
        "Fatia de Pizza": 1,
        "Broa Amarela 1 kg": 3,
        "Triga Milha Saloio": 2
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-taberna-toita",
    "nome": "Taberna da Toita",
    "telefone": "911999111",
    "telemovel": "911999111",
    "email": "toita@padaria.pt",
    "morada": "Toita, Arouca",
    "carrinha_id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pasteis": 6,
        "Meia Bola de Carne": 1
      },
      "ter": {
        "Pasteis": 6,
        "Meia Bola de Carne": 1
      },
      "qua": {
        "Pasteis": 6,
        "Meia Bola de Carne": 1
      },
      "qui": {
        "Pasteis": 6,
        "Meia Bola de Carne": 1
      },
      "sex": {
        "Pasteis": 6,
        "Meia Bola de Carne": 1
      },
      "sab": {
        "Pasteis": 6,
        "Meia Bola de Carne": 1
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-pretexto-paralelo",
    "nome": "Pretexto Paralelo",
    "telefone": "912000222",
    "telemovel": "912000222",
    "email": "pretexto@padaria.pt",
    "morada": "Arouca",
    "carrinha_id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Normal": 65,
        "Broa Amarela 1 kg": 3
      },
      "ter": {
        "Pão Normal": 65,
        "Broa Amarela 1 kg": 3
      },
      "qua": {
        "Pão Normal": 65,
        "Broa Amarela 1 kg": 3
      },
      "qui": {
        "Pão Normal": 65,
        "Broa Amarela 1 kg": 3
      },
      "sex": {
        "Pão Normal": 65,
        "Broa Amarela 1 kg": 3
      },
      "sab": {
        "Pão Normal": 65,
        "Broa Amarela 1 kg": 3
      },
      "dom": {}
    }
  },
  {
    "id": "b2b-cavadinha-arouca",
    "nome": "Cavadinha Arouca",
    "telefone": "912111333",
    "telemovel": "912111333",
    "email": "cavadinha.arouca@padaria.pt",
    "morada": "Arouca",
    "carrinha_id": "c666db95-c427-4ed5-83fc-01403bd24cf6",
    "ativo": true,
    "quantidades_semanais": {
      "seg": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Triga Milha 1 kg": 1,
        "Triga Milha 0,5 kg": 1,
        "Triga Milha 0,3 kg": 1,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 2 kg": 2,
        "Broa Amarela 1 kg": 12,
        "Pão Saloio": 20,
        "Triga Milha Saloio": 2,
        "Padas Normais": 5,
        "Padas de Centeio": 5,
        "Pão de Sementes": 10,
        "Pasteis": 21,
        "Lanche Misto": 4,
        "Fatia de Pizza": 2
      },
      "ter": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Triga Milha 1 kg": 1,
        "Triga Milha 0,5 kg": 1,
        "Triga Milha 0,3 kg": 1,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 2 kg": 2,
        "Broa Amarela 1 kg": 12,
        "Pão Saloio": 20,
        "Triga Milha Saloio": 2,
        "Padas Normais": 5,
        "Padas de Centeio": 5,
        "Pão de Sementes": 10,
        "Pasteis": 21,
        "Lanche Misto": 4,
        "Fatia de Pizza": 2
      },
      "qua": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Triga Milha 1 kg": 1,
        "Triga Milha 0,5 kg": 1,
        "Triga Milha 0,3 kg": 1,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 2 kg": 2,
        "Broa Amarela 1 kg": 12,
        "Pão Saloio": 20,
        "Triga Milha Saloio": 2,
        "Padas Normais": 5,
        "Padas de Centeio": 5,
        "Pão de Sementes": 10,
        "Pasteis": 21,
        "Lanche Misto": 4,
        "Fatia de Pizza": 2
      },
      "qui": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Triga Milha 1 kg": 1,
        "Triga Milha 0,5 kg": 1,
        "Triga Milha 0,3 kg": 1,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 2 kg": 2,
        "Broa Amarela 1 kg": 12,
        "Pão Saloio": 20,
        "Triga Milha Saloio": 2,
        "Padas Normais": 5,
        "Padas de Centeio": 5,
        "Pão de Sementes": 10,
        "Pasteis": 21,
        "Lanche Misto": 4,
        "Fatia de Pizza": 2
      },
      "sex": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Triga Milha 1 kg": 1,
        "Triga Milha 0,5 kg": 1,
        "Triga Milha 0,3 kg": 1,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 2 kg": 2,
        "Broa Amarela 1 kg": 12,
        "Pão Saloio": 20,
        "Triga Milha Saloio": 2,
        "Padas Normais": 5,
        "Padas de Centeio": 5,
        "Pão de Sementes": 10,
        "Pasteis": 21,
        "Lanche Misto": 4,
        "Fatia de Pizza": 2
      },
      "sab": {
        "Pão Integral": 15,
        "Pão de Centeio": 40,
        "Triga Milha 1 kg": 1,
        "Triga Milha 0,5 kg": 1,
        "Triga Milha 0,3 kg": 1,
        "Broa Branca 1 kg": 4,
        "Broa Amarela 2 kg": 2,
        "Broa Amarela 1 kg": 12,
        "Pão Saloio": 20,
        "Triga Milha Saloio": 2,
        "Padas Normais": 5,
        "Padas de Centeio": 5,
        "Pão de Sementes": 10,
        "Pasteis": 21,
        "Lanche Misto": 4,
        "Fatia de Pizza": 2
      },
      "dom": {}
    }
  }
];

export const PRODUTOS_MOCK: Produto[] = [
  {
    "id": "prod-p-o-normal",
    "nome": "Pão Normal",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-p-o-de-centeio",
    "nome": "Pão de Centeio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-padas-normais",
    "nome": "Padas Normais",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-padas-de-centeio",
    "nome": "Padas de Centeio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-p-o-de-sementes",
    "nome": "Pão de Sementes",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-p-o-croissant",
    "nome": "Pão Croissant",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-p-o-de-forma-grande",
    "nome": "Pão de Forma Grande",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-p-o-de-forma-grande-corte-fino",
    "nome": "Pão de Forma Grande (Corte Fino)",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-1-kg",
    "nome": "Broa Amarela 1 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-2-kg",
    "nome": "Broa Amarela 2 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-amarela-0-5-kg",
    "nome": "Broa Amarela 0,5 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-branca-1-kg",
    "nome": "Broa Branca 1 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-branca-0-5-kg",
    "nome": "Broa Branca 0,5 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-de-centeio-0-5-kg",
    "nome": "Broa de Centeio 0,5 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-broa-de-mistura",
    "nome": "Broa de Mistura",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-triga-milha-0-3-kg",
    "nome": "Triga Milha 0,3 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-triga-milha-0-5-kg",
    "nome": "Triga Milha 0,5 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-triga-milha-1-kg",
    "nome": "Triga Milha 1 kg",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-triga-milha-saloio",
    "nome": "Triga Milha Saloio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-regueifa-de-coco",
    "nome": "Regueifa de Côco",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-regueifa-de-canela",
    "nome": "Regueifa de Canela",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-tran-a-regueifa-branca",
    "nome": "Trança Regueifa Branca",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-tran-a-de-chocolate",
    "nome": "Trança de Chocolate",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-tran-a-de-creme",
    "nome": "Trança de Creme",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-pastel-de-nata",
    "nome": "Pastel de Nata",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-pastel-miniatura",
    "nome": "Pastel Miniatura",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-lanche",
    "nome": "Lanche",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-lanche-de-fiambre",
    "nome": "Lanche de Fiambre",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-lanche-de-chocolate",
    "nome": "Lanche de Chocolate",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-croissant-simples",
    "nome": "Croissant Simples",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-croissant-de-chocolate",
    "nome": "Croissant de Chocolate",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-fatia-de-pizza",
    "nome": "Fatia de Pizza",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-merendas",
    "nome": "Merendas",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-p-o-de-bico",
    "nome": "Pão de Bico",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-canilha",
    "nome": "Canilha",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-tosta",
    "nome": "Tosta",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-mini-p-o-centeio",
    "nome": "Mini Pão de Centeio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "prod-mini-p-o-saloio",
    "nome": "Mini Pão Saloio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-10-20T10:00:00.000000+00:00"
  },
  {
    "id": "13c7cd7e-43ae-462d-8822-a23b917181ed",
    "nome": "Almendrado",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "18900043-ae36-4a74-b5cd-fb5b4f8ce109",
    "nome": "Baguete",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "760d70c4-eeaa-4613-812c-c9a8cfccdf1c",
    "nome": "Bola de Carne",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "7d72b412-371a-4c22-a5d4-a984e9b0ab83",
    "nome": "Bolo c/ Sardinhas",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "ede288e0-9ab2-4808-b313-b81a6eaad854",
    "nome": "Bolo de Aniversário",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "973aeeda-a967-4a04-9171-b99e8548b35a",
    "nome": "Bolo de Casamento",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "b5265bc7-1d64-407d-82b5-465750e8d4d1",
    "nome": "Bolo de Comunhão",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "e2b97eb6-8c28-42ea-bc92-0729eb386a87",
    "nome": "Bolo Rei",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "b8b62528-c374-435f-9b89-4bda4f156f05",
    "nome": "Bolo Rei Escangalhado",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "f016598c-2024-49db-bd07-7effc8ca7201",
    "nome": "Bolo Rei Folhado",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "01a58bef-1587-45a5-abeb-1e839ba8235c",
    "nome": "Brigadeiros",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "5a0b42ce-4e7b-4629-8c58-a3d2de065afc",
    "nome": "Broa",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "18d2eb00-f11c-4865-a975-7ee9746121db",
    "nome": "Broa Centeio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "763750ac-6167-4637-96e8-bbc8dce6194d",
    "nome": "Broa com Chouriço",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "413a9168-c3c6-43f8-9f8b-98ce961f6618",
    "nome": "Broas de Mel",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "7c3fa4bd-3570-489b-9090-8d9b49d5db62",
    "nome": "Broinha de Mistura",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "d39830a9-82cd-4d40-80f8-807e1e70bdf7",
    "nome": "Cacete",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "5f633c41-7b50-4356-bbf4-54c97b27b687",
    "nome": "Carcaça",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "e1694cc6-eb86-418e-a445-f520bc95c8f7",
    "nome": "Castanhas Doces",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "1f3e1e2f-d437-4c26-98dd-6cdd0f9cbc18",
    "nome": "Cavacas",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "f13b5274-a257-4bb8-985e-7cd42274be83",
    "nome": "Chá Hungaro",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "8b1f5edb-cdc9-4842-bb64-d21e488ecf6e",
    "nome": "Crocante de Ovo",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "43750423-88ef-4eb6-accb-ce91ec24e743",
    "nome": "Farinha",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "e9f1ac0f-5e43-4d44-90d5-f0844b7948af",
    "nome": "Fatia Bola de Carne",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "d075f44e-da7d-442c-8758-e58e987652f6",
    "nome": "Fatia de Bolo",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "53df5098-7d17-4d41-9738-c01b14363cf4",
    "nome": "Fatia Pão de Ló",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "6f9ef3b0-d0e2-483f-bf1f-b18b3ce06654",
    "nome": "Fermento de Padeiro",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "c71d6135-a6a6-49a6-af5f-d2cd69f3fa4a",
    "nome": "Fios D'ovos",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "318643dc-3772-4d81-a554-6b5ed2790311",
    "nome": "Fogaça",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "ffa1654f-604c-441a-ade6-a362d403597e",
    "nome": "Lanche Misto",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "9e926846-a0db-4db0-83e3-0328da2279b6",
    "nome": "Massa Folhada",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "bc2a1035-0e0b-45eb-bd92-158e68bbe074",
    "nome": "Meia Bola de Carne",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "e176b6ac-58e9-48d0-8ffc-cb682e2883fb",
    "nome": "Meia Lua",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "56059b6d-06c3-46d5-952d-2e33a21a2922",
    "nome": "Melindres",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "4d5b2947-0858-4e8a-8be4-201d0e341a58",
    "nome": "Mini Broa com Chouriço",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "398cb1e9-19df-477d-bb4e-c99a451d206f",
    "nome": "Ovo de Páscoa",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "17cef10f-0498-4cee-bb1f-88a6bea44aea",
    "nome": "Padas",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "6c99a29d-46c1-4925-a281-827ed82017ef",
    "nome": "Padinhas",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "368ad493-fd3a-4ab5-b5e7-259ba4e04eea",
    "nome": "Padinhas Alfarroba",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "b22aa2cb-aab2-480b-b448-fc8362d1be14",
    "nome": "Panettone",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "efcf6c84-e29f-43ab-8236-7138292a38d6",
    "nome": "Pão",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "ce0bb303-7b7a-4e00-bbf2-8cf4d081d454",
    "nome": "Pão 7 Grãos Pequeno",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "034c0563-440d-4ee8-bb1b-464458efd3ca",
    "nome": "Pão Cereais Fatiado",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "be759f4c-f6fd-4ac8-b424-2762e4c6f231",
    "nome": "Pão com Chouriço",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "4966d5c0-7eb7-42ac-8be6-9c56785ef855",
    "nome": "Pão Saloio",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "82f0c100-81e9-489b-9377-9e5dc48ff312",
    "nome": "Pão da Mealhada",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "43648ed7-6e34-4929-a530-7c1a1f998a3f",
    "nome": "Pão de Alfarroba",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "ac7b605d-ba59-431d-8f83-f0bb0189b44a",
    "nome": "Pão de Alfarroba Pequeno",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "9a355c4b-8758-4d94-828c-d5ebb7563b77",
    "nome": "Pão de Alho",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "bf83f1b8-cae1-4623-81a3-2291ad9f570e",
    "nome": "Pão de Beterraba",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "ce9636e2-dbe4-41f2-87de-a0f7b5fbad9b",
    "nome": "Pão de Beterraba Pequeno",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "313b9c76-01a6-445c-89c8-9e9ca4888307",
    "nome": "Pão de Cachorro",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "154690ff-0395-4545-90b1-0ca4d7ccdec4",
    "nome": "Pão de Canela",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "9083a4ac-715e-4708-8a16-45bcd0a7028d",
    "nome": "Pão de Forma",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "9dc5b77b-71e3-4c85-b042-9c6acc697317",
    "nome": "Pão de Forma Cereais",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "bc9b4c3f-ba07-4bdf-9da5-af41869f6700",
    "nome": "Pão de Forma Pequeno",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "f4d2b8a4-0646-4542-9128-84959726fda8",
    "nome": "Pão de Hanburger",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "25039971-deb7-490f-8634-20e7719c0b99",
    "nome": "Pão de Leite",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "067fb587-f1ff-40af-8b7c-94890127ce46",
    "nome": "Pão de Ló",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "8fa0d571-c22b-40d5-88ab-258f2fd66fac",
    "nome": "Pão de Ló de Ovar",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "48036f45-d227-4e27-8472-793b10d95a70",
    "nome": "Pão Doce",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "230e1426-14b4-4697-9921-14601ae09f4f",
    "nome": "Pão Integral",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "6e255632-0f13-4998-87e1-cd680b9fb2f7",
    "nome": "Pão Italiano",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "024009c9-e4df-4bc1-ab4c-7025a2d7e373",
    "nome": "Pão Mistura",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "c1a421f7-2da6-4714-bdb9-f11a1b0c5d26",
    "nome": "Pão Pizza",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "5c08ccef-1408-4169-b4d3-aa6856e1f402",
    "nome": "Pão Ralado",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "1cd4b73f-f75f-49c0-9a34-b665375dc164",
    "nome": "Pasteis",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "9801a217-4d18-469c-ac02-36b8d308f015",
    "nome": "Pasteis Miniatura Kg",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "kg",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "6052a0b5-9a40-4fa0-a18f-14cd9ea76d5b",
    "nome": "Pastel Miniatura Uni",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "1eecf267-b7f4-4c10-ab11-67e0e33ea87d",
    "nome": "Pastel Recheado",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "08e7dab3-1768-4ea8-932c-f86885f5aa94",
    "nome": "Pizza Grande",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "382df3c8-bbec-4785-a451-877136620fc5",
    "nome": "Pizza Média",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "7bf261c4-dc6d-4f3f-bef3-0415e7cd49d2",
    "nome": "Pizza Pequena",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "479cfb8a-1d70-4ea9-9953-086f18649192",
    "nome": "Pudim",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "2ee0cd98-3c6d-4ac1-bd5c-782be4958bbc",
    "nome": "Rabanadas",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "8e450646-7681-447f-9930-4ac9325107a0",
    "nome": "Raspas de Chocolate",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "c328eda2-bf66-4b38-96b0-f3b9809a039a",
    "nome": "Regueifa Branca",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  },
  {
    "id": "893530d5-ef2d-4c40-a1e0-39bf3e6d617a",
    "nome": "Regueifa Doce",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "0f3e6f65-ee9b-43bd-a8d8-897fbc4c6f7e",
    "nome": "Regueifa Miniatura",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "8c913441-6b0f-4ca8-a5e2-3c724226ccc0",
    "nome": "Rosca",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "4fc071f3-53a6-4719-b8d4-496ce67226cf",
    "nome": "Rosca de Amêndoa",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "35955671-7c02-42a5-bf89-4223c39f364c",
    "nome": "Semi-frio",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "f6e98e77-8e58-43e6-a722-684339d85ec7",
    "nome": "Sonhos",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "08af0d35-85ec-4b35-8edc-3cdf81581cc1",
    "nome": "Tabuleiro de Pizza",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "2e213c12-5698-4de3-9e85-bcbdae9d721b",
    "nome": "Tarte de Fruta",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "1f8c24a7-0152-49b9-8bce-205ce409940b",
    "nome": "Tartes de Fruta",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "fd8adf34-89a2-4216-9ae0-3abd4e7e4fe2",
    "nome": "Telha",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "d52f51ee-e38f-4555-b1d5-a2c9b51e162c",
    "nome": "Teste",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-16T18:31:10.589474+00:00"
  },
  {
    "id": "e1c23a54-7027-4bc6-9998-0eb0adc970ce",
    "nome": "Torre Profiteroles",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "059aac54-1ae3-4121-94d9-af7160cd866d",
    "nome": "Tosta Teste",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-16T18:29:50.995686+00:00"
  },
  {
    "id": "7e63af46-d1a3-4885-b661-c76caa5cdbb0",
    "nome": "Trança",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "beb635fb-f94c-4d55-8780-f082072d44b9",
    "nome": "Trança de Amendoa",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.879667+00:00"
  },
  {
    "id": "91baf8ae-17ca-45d9-899d-ac0367cdc717",
    "nome": "Trança Folhada Frutos Secos",
    "categoria": "pastelaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 90,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.979687+00:00"
  },
  {
    "id": "882a046c-1937-4c5b-8c92-51e12aa49d9d",
    "nome": "Triga Milha",
    "categoria": "padaria",
    "preco": 0,
    "unidade": "unidade",
    "tempo_preparo_minutos": 60,
    "ativo": true,
    "criado_em": "2026-09-14T19:32:26.772605+00:00"
  }
];

export const ENCOMENDAS_MOCK: Encomenda[] = [];

export const LOGS_AUDITORIA_MOCK: LogAuditoria[] = [];
