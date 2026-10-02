export function gql(strings, ...args) {
  let str = "";
  strings.forEach((string, i) => {
    str += string + (args[i] || "");
  });
  return str;
}
export const ConfiguracaoPartsFragmentDoc = gql`
    fragment ConfiguracaoParts on Configuracao {
  __typename
  nomeEmpresa
  slogan
  telefoneGeral
  nif
  email
  rodapeTalao
  modeloWhatsApp
}
    `;
export const LojasPartsFragmentDoc = gql`
    fragment LojasParts on Lojas {
  __typename
  codigo
  nome
  morada
  telefone
  horario
  nif
  foto
  ativo
}
    `;
export const ProdutosPartsFragmentDoc = gql`
    fragment ProdutosParts on Produtos {
  __typename
  nome
  categoria
  unidade
  descricao
  alergenios
  foto
  destaqueMontra
}
    `;
export const ConfiguracaoDocument = gql`
    query configuracao($relativePath: String!) {
  configuracao(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...ConfiguracaoParts
  }
}
    ${ConfiguracaoPartsFragmentDoc}`;
export const ConfiguracaoConnectionDocument = gql`
    query configuracaoConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: ConfiguracaoFilter) {
  configuracaoConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...ConfiguracaoParts
      }
    }
  }
}
    ${ConfiguracaoPartsFragmentDoc}`;
export const LojasDocument = gql`
    query lojas($relativePath: String!) {
  lojas(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...LojasParts
  }
}
    ${LojasPartsFragmentDoc}`;
export const LojasConnectionDocument = gql`
    query lojasConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: LojasFilter) {
  lojasConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...LojasParts
      }
    }
  }
}
    ${LojasPartsFragmentDoc}`;
export const ProdutosDocument = gql`
    query produtos($relativePath: String!) {
  produtos(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...ProdutosParts
  }
}
    ${ProdutosPartsFragmentDoc}`;
export const ProdutosConnectionDocument = gql`
    query produtosConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: ProdutosFilter) {
  produtosConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...ProdutosParts
      }
    }
  }
}
    ${ProdutosPartsFragmentDoc}`;
export function getSdk(requester) {
  return {
    configuracao(variables, options) {
      return requester(ConfiguracaoDocument, variables, options);
    },
    configuracaoConnection(variables, options) {
      return requester(ConfiguracaoConnectionDocument, variables, options);
    },
    lojas(variables, options) {
      return requester(LojasDocument, variables, options);
    },
    lojasConnection(variables, options) {
      return requester(LojasConnectionDocument, variables, options);
    },
    produtos(variables, options) {
      return requester(ProdutosDocument, variables, options);
    },
    produtosConnection(variables, options) {
      return requester(ProdutosConnectionDocument, variables, options);
    }
  };
}
import { createClient } from "tinacms/dist/client";
const generateRequester = (client) => {
  const requester = async (doc, vars, options) => {
    let url = client.apiUrl;
    if (options?.branch) {
      const index = client.apiUrl.lastIndexOf("/");
      url = client.apiUrl.substring(0, index + 1) + options.branch;
    }
    const data = await client.request({
      query: doc,
      variables: vars,
      url
    }, options);
    return { data: data?.data, errors: data?.errors, query: doc, variables: vars || {} };
  };
  return requester;
};
export const ExperimentalGetTinaClient = () => getSdk(
  generateRequester(
    createClient({
      url: "http://localhost:4001/graphql",
      queries
    })
  )
);
export const queries = (client) => {
  const requester = generateRequester(client);
  return getSdk(requester);
};
