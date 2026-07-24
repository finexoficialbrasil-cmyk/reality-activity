import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_id, redemption_id } = await req.json();

    if (!product_id || !redemption_id) {
      return Response.json({ error: 'product_id e redemption_id são obrigatórios' }, { status: 400 });
    }

    // Busca o resgate e valida propriedade antes de qualquer ação
    const redemptions = await base44.asServiceRole.entities.Redemption.filter({ id: redemption_id });
    const redemption = redemptions[0];
    if (!redemption) {
      return Response.json({ error: 'Resgate não encontrado' }, { status: 404 });
    }

    // Verifica se o resgate pertence ao usuário autenticado
    if (redemption.user_email !== user.email) {
      return Response.json({ error: 'Acesso negado a este resgate' }, { status: 403 });
    }

    // Verifica se o product_id informado corresponde ao resgate original
    if (redemption.product_id !== product_id) {
      return Response.json({ error: 'Produto não corresponde ao resgate' }, { status: 403 });
    }

    // Busca o produto
    const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    if (products.length === 0) {
      return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const product = products[0];

    // Se for produto digital, atualiza o resgate com status "delivered" e inclui o conteúdo
    if (product.type === 'digital') {
      await base44.asServiceRole.entities.Redemption.update(redemption_id, {
        status: 'delivered',
        delivery_info: product.digital_content || 'Produto digital disponibilizado'
      });

      // Incrementa contador de resgates
      await base44.asServiceRole.entities.Product.update(product_id, {
        redemptions_count: (product.redemptions_count || 0) + 1
      });

      return Response.json({
        success: true,
        type: 'digital',
        product_name: product.name,
        digital_content: product.digital_content,
        message: 'Produto digital entregue com sucesso!'
      });
    }

    // Se for físico, apenas marca como pending (empresa irá entregar)
    return Response.json({
      success: true,
      type: 'physical',
      product_name: product.name,
      message: 'Resgate pendente. A empresa entrará em contato.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});