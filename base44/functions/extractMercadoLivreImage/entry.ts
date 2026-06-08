import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { link } = await req.json();

    if (!link) {
      return Response.json({ error: 'Link é obrigatório' }, { status: 400 });
    }

    // Extrai o ID do produto do link
    let productId = link;
    
    // Se for um link curto (meli.la/)
    if (link.includes('meli.la/')) {
      productId = link.split('meli.la/')[1];
    }
    // Se for um link completo
    else if (link.includes('mercadolivre.com.br')) {
      const match = link.match(/MLB(\d+)/);
      if (match) {
        productId = match[1];
      }
    }

    // Busca a imagem do produto via API do Mercado Livre
    const response = await fetch(`https://api.mercadolibre.com/items/MLB${productId}`);
    
    if (!response.ok) {
      return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const data = await response.json();
    const imageUrl = data.pictures?.[0]?.url || data.thumbnail;

    if (!imageUrl) {
      return Response.json({ error: 'Imagem não disponível' }, { status: 404 });
    }

    return Response.json({ image_url: imageUrl });
  } catch (error) {
    console.error('Erro ao extrair imagem:', error);
    return Response.json({ error: 'Erro ao buscar imagem' }, { status: 500 });
  }
});