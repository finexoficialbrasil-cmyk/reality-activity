import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const {
      seller_name, points_amount, price_per_point, total_price, whatsapp_number
    } = await req.json();

    const seller_email = user.email;

    if (!points_amount || points_amount < 1) {
      return Response.json({ success: false, error: 'Quantidade de pontos inválida' }, { status: 400 });
    }
    if (!total_price || total_price <= 0) {
      return Response.json({ success: false, error: 'Valor da venda inválido' }, { status: 400 });
    }
    const wa = (whatsapp_number || '').replace(/\D/g, '');
    if (wa.length < 10) {
      return Response.json({ success: false, error: 'WhatsApp inválido' }, { status: 400 });
    }

    // Saldo do vendedor (service role para acesso total ao UserPoints)
    const sellerArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: seller_email });
    const sp = sellerArr[0];
    if (!sp || (sp.balance || 0) < points_amount) {
      return Response.json({ success: false, error: 'Saldo insuficiente' }, { status: 400 });
    }

    // Deduz do vendedor imediatamente (pontos reservados para a venda)
    const newBalance = sp.balance - points_amount;
    await base44.asServiceRole.entities.UserPoints.update(sp.id, {
      balance: newBalance,
      total_spent: (sp.total_spent || 0) + points_amount,
      last_activity: new Date().toISOString()
    });

    // Cria o anúncio de venda
    const listing = await base44.asServiceRole.entities.PointsListing.create({
      seller_email,
      seller_name: seller_name || user.full_name || 'Usuário',
      points_amount,
      price_per_point,
      total_price,
      whatsapp_number: wa,
      status: 'active'
    });

    // Registra a transação no extrato do vendedor
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: seller_email,
      user_name: seller_name || user.full_name || 'Usuário',
      type: 'marketplace_listed',
      points: -points_amount,
      description: 'Pontos reservados para venda no marketplace',
      listing_id: listing.id
    });

    return Response.json({
      success: true,
      message: 'Anúncio criado e pontos descontados do saldo!',
      data: { listing_id: listing.id, new_balance: newBalance }
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});