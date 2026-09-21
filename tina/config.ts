import { defineConfig } from "tinacms";

// TinaCMS Configuration para App de Encomendas & Produção de Padaria
export default defineConfig({
  branch: process.env.HEAD || process.env.VERCEL_GIT_COMMIT_REF || "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",

  build: {
    outputFolder: "cms",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },
  schema: {
    collections: [
      {
        name: "configuracao",
        label: "Configuração da Marca & Talão",
        path: "content/config",
        format: "json",
        ui: {
          global: true,
        },
        fields: [
          {
            type: "string",
            name: "nomeEmpresa",
            label: "Nome da Empresa / Padaria",
            required: true,
          },
          {
            type: "string",
            name: "slogan",
            label: "Slogan / Assinatura da Marca",
          },
          {
            type: "string",
            name: "telefoneGeral",
            label: "Telefone Geral de Contacto",
          },
          {
            type: "string",
            name: "nif",
            label: "NIF da Empresa",
          },
          {
            type: "string",
            name: "email",
            label: "Email de Apoio ao Cliente",
          },
          {
            type: "string",
            name: "rodapeTalao",
            label: "Mensagem de Rodapé do Talão Térmico",
          },
          {
            type: "string",
            name: "modeloWhatsApp",
            label: "Modelo de Pedido WhatsApp",
            ui: {
              component: "textarea",
            },
          },
        ],
      },
      {
        name: "lojas",
        label: "Rede de Lojas Físicas",
        path: "content/lojas",
        format: "json",
        fields: [
          {
            type: "string",
            name: "codigo",
            label: "Código da Loja (ex: LOJA-1)",
            required: true,
          },
          {
            type: "string",
            name: "nome",
            label: "Nome da Loja",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "morada",
            label: "Morada / Localização",
            required: true,
          },
          {
            type: "string",
            name: "telefone",
            label: "Telefone de Contacto",
          },
          {
            type: "string",
            name: "horario",
            label: "Horário de Funcionamento",
          },
          {
            type: "string",
            name: "nif",
            label: "NIF da Loja",
          },
          {
            type: "image",
            name: "foto",
            label: "Fotografia da Loja / Fachada",
          },
          {
            type: "boolean",
            name: "ativo",
            label: "Loja Ativa",
          },
        ],
      },
      {
        name: "produtos",
        label: "Catálogo de Montra & Bolos",
        path: "content/produtos",
        format: "json",
        fields: [
          {
            type: "string",
            name: "nome",
            label: "Nome do Artigo",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "categoria",
            label: "Setor / Categoria",
            options: [
              { value: "padaria", label: "Padaria (Pães e Fornada)" },
              { value: "pastelaria", label: "Pastelaria (Bolos e Sortidos)" },
            ],
            required: true,
          },
          {
            type: "string",
            name: "unidade",
            label: "Unidade de Medida",
            options: [
              { value: "unidade", label: "Unidade (un)" },
              { value: "kg", label: "Quilograma (kg)" },
              { value: "cento", label: "Cento" },
            ],
          },
          {
            type: "string",
            name: "descricao",
            label: "Descrição Comercial & Fabrico",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "string",
            name: "alergenios",
            label: "Alergénios & Informação Alimentar",
          },
          {
            type: "image",
            name: "foto",
            label: "Fotografia do Produto",
          },
          {
            type: "boolean",
            name: "destaqueMontra",
            label: "Destaque na Montra Principal",
          },
        ],
      },
    ],
  },
});
