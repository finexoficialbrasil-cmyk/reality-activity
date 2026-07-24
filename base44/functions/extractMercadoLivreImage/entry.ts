import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { link } = await req.json();

    if (!link) {
      return Response.json({ error: 'Link é obrigatório' }, { status: 400 });
    }

    // Resolve link curto meli.la para obter ID real
    let productId = null;

    let parsedUrl;
    try {
      parsedUrl = new URL(link);
    } catch {
      return Response.json({ error: 'URL inválida' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    const isMeliLa = hostname === 'meli.la' || hostname.endsWith('.meli.la');
    const isMercadoLivre = hostname === 'mercadolivre.com.br' || hostname.endsWith('.mercadolivre.com.br') ||
                           hostname === 'mercadolibre.com' || hostname.endsWith('.mercadolibre.com');

    if (isMeliLa) {
      try {
        // Tenta fazer fetch direto do link com redirecionamento
        const htmlResponse = await fetch(parsedUrl.href, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        const html = await htmlResponse.text();
        
        // Procura pelo ID do produto na URL ou no HTML
        let idMatch = html.match(/item_id["\s:]*(\d+)/);
        if (!idMatch) {
          idMatch = html.match(/MLB(\d+)/);
        }
        if (!idMatch) {
          // Procura em padrões de metatags
          idMatch = html.match(/item["\s:]+MLB(\d+)/);
        }
        
        if (idMatch) {
          productId = idMatch[1];
          // Remove "MLB" se estiver incluído
          if (productId.startsWith('MLB')) {
            productId = productId.replace('MLB', '');
          }
        }
      } catch (e) {
        console.error('Erro ao resolver link curto:', e);
        return Response.json({ error: 'Erro ao resolver link do Mercado Livre' }, { status: 400 });
      }
    } else if (isMercadoLivre) {
      // Extrai o ID do produto (MLB + números) de link completo
      const idMatch = link.match(/MLB(\d+)/);
      if (idMatch) {
        productId = idMatch[1];
      }
    } else {
      return Response.json({ error: 'Domínio não autorizado' }, { status: 400 });
    }

    if (!productId) {
      console.error('Não conseguiu extrair ID do link:', link);
      return Response.json({ error: 'ID do produto não encontrado no link' }, { status: 400 });
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