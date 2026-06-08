import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { link } = await req.json();

    if (!link) {
      return Response.json({ error: 'Link é obrigatório' }, { status: 400 });
    }

    // Resolve link curto meli.la para obter ID real
    let realLink = link;
    if (link.includes('meli.la/')) {
      try {
        const redirectResponse = await fetch(link, { redirect: 'follow' });
        realLink = redirectResponse.url;
      } catch (e) {
        console.error('Erro ao resolver link curto:', e);
      }
    }

    // Extrai o ID do produto (MLB + números)
    const idMatch = realLink.match(/MLB(\d+)/);
    if (!idMatch) {
      return Response.json({ error: 'ID do produto não encontrado no link' }, { status: 400 });
    }

    const productId = idMatch[1];

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