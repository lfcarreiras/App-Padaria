import { NextResponse } from 'next/server';
import { 
  obterConfiguracaoMarca, 
  obterLojasTina, 
  obterProdutosMontra, 
  obterLayoutBlocos 
} from '../../../lib/tinaContent';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = obterConfiguracaoMarca();
    const lojas = obterLojasTina();
    const produtos = obterProdutosMontra();
    const layout = obterLayoutBlocos();

    return NextResponse.json({
      success: true,
      data: {
        config,
        lojas,
        produtos,
        layout,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar conteúdos do CMS.' },
      { status: 500 }
    );
  }
}
