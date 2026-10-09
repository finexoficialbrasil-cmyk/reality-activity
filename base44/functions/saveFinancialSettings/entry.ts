import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { recordAudit } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/userGuard.ts';

// Proteção financeira definitiva: impede configurar um valor de recompra/saque
// superior ao preço pelo qual o ponto foi efetivamente financiado (venda).
// Isso evita que a plataforma pague mais do que recebeu.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado — apenas administradores' }, { status: 403 });
    }

    const body = await req.json();
    const { purchase_settings, withdrawal_settings } = body;

    // Carrega configurações atuais para mesclar com o que está sendo salvo
    const purchaseList = await base44.asServiceRole.entities.PurchaseSettings.list();
    const withdrawalList = await base44.asServiceRole.entities.WithdrawalSettings.list();
    const currentPurchase = purchaseList[0] || {};
    const currentWithdrawal = withdrawalList[0] || {};

    // Mescla: valores enviados sobrepõem os atuais
    const effectivePurchase = { ...currentPurchase, ...(purchase_settings || {}) };
    const effectiveWithdrawal = { ...currentWithdrawal, ...(withdrawal_settings || {}) };

    const pricePerPoint = Number(effectivePurchase.price_per_point) || 0;

    // Validação: cada método de saque HABILITADO deve ter buyback <= price_per_point
    const violations = [];
    if (effectiveWithdrawal.pix_enabled && Number(effectiveWithdrawal.pix_buyback_rate) > pricePerPoint) {
      violations.push({
        method: 'pix',
        buyback_rate: Number(effectiveWithdrawal.pix_buyback_rate),
        price_per_point: pricePerPoint
      });
    }
    if (effectiveWithdrawal.bch_enabled && Number(effectiveWithdrawal.bch_buyback_rate) > pricePerPoint) {
      violations.push({
        method: 'bitcoin_cash',
        buyback_rate: Number(effectiveWithdrawal.bch_buyback_rate),
        price_per_point: pricePerPoint
      });
    }

    if (violations.length > 0) {
      return Response.json({
        error: 'Configuração financeiramente inviável',
        violations,
        message: `O valor de recompra não pode ser maior que o preço de venda do ponto (R$ ${pricePerPoint.toFixed(2)}/pto). Ajuste o preço de venda ou a taxa de recompra.`
      }, { status: 400 });
    }

    // Salva PurchaseSettings (se enviadas)
    if (purchase_settings) {
      if (currentPurchase.id) {
        await base44.asServiceRole.entities.PurchaseSettings.update(currentPurchase.id, purchase_settings);
      } else {
        await base44.asServiceRole.entities.PurchaseSettings.create(purchase_settings);
      }
    }

    // Salva WithdrawalSettings (se enviadas)
    if (withdrawal_settings) {
      if (currentWithdrawal.id) {
        await base44.asServiceRole.entities.WithdrawalSettings.update(currentWithdrawal.id, withdrawal_settings);
      } else {
        await base44.asServiceRole.entities.WithdrawalSettings.create(withdrawal_settings);
      }
    }

    // Recarrega para retornar o estado final
    const finalPurchase = (await base44.asServiceRole.entities.PurchaseSettings.list())[0] || {};
    const finalWithdrawal = (await base44.asServiceRole.entities.WithdrawalSettings.list())[0] || {};

    // === TRILHA DE AUDITORIA ===
    await recordAudit(base44, user, 'financial_settings_update', {
      target_type: 'PurchaseSettings',
      target_id: currentPurchase.id || finalPurchase.id || '',
      value_before: { purchase: currentPurchase, withdrawal: currentWithdrawal },
      value_after: { purchase: finalPurchase, withdrawal: finalWithdrawal },
      ip: getClientIp(req),
      metadata: { purchase_sent: !!purchase_settings, withdrawal_sent: !!withdrawal_settings }
    });

    const finalPrice = Number(finalPurchase.price_per_point) || 0;
    const pixRate = Number(finalWithdrawal.pix_buyback_rate) || 0;
    const bchRate = Number(finalWithdrawal.bch_buyback_rate) || 0;

    // Análise financeira
    const maxBuyback = Math.max(
      finalWithdrawal.pix_enabled ? pixRate : 0,
      finalWithdrawal.bch_enabled ? bchRate : 0
    );
    const diffPct = finalPrice > 0 ? ((maxBuyback - finalPrice) / finalPrice) * 100 : 0;
    let situation = 'equilíbrio';
    if (maxBuyback > finalPrice) situation = 'prejuízo';
    else if (maxBuyback < finalPrice) situation = 'lucro';

    return Response.json({
      success: true,
      message: 'Configurações salvas com validação financeira',
      financial_summary: {
        price_per_point: finalPrice,
        pix_buyback_rate: pixRate,
        bch_buyback_rate: bchRate,
        pix_enabled: !!finalWithdrawal.pix_enabled,
        bch_enabled: !!finalWithdrawal.bch_enabled,
        max_buyback_rate: maxBuyback,
        diff_pct: diffPct,
        situation
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}