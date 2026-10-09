import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Migração segura do burnedBalance: computa o total atual a partir dos saques
// existentes, cria/atualiza o FinancialSummary com esse valor, e marca a flag
// burned_counted em todos os saques para alinhar com o contador incremental.
//
// Idempotente: pode ser executada múltiplas vezes — sempre sobrescreve o
// contador com o valor correto e re-marca as flags.
//
// Preserva o valor atual (ex: 2000) porque recalcula a partir dos dados reais.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado — apenas administradores' }, { status: 403 });
    }

    // 1. Carrega TODOS os saques (paginação por skip)
    let allWithdrawals: any[] = [];
    let skip = 0;
    const batchSize = 5000;
    while (true) {
      const batch = await base44.asServiceRole.entities.WithdrawalRequest.list('-created_date', batchSize, skip);
      allWithdrawals = allWithdrawals.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    // 2. Calcula soma dos não-rejeitados (valor correto do burned_balance)
    let totalBurned = 0;
    for (const w of allWithdrawals) {
      if (w.status !== 'rejected') {
        totalBurned += (Number(w.points_amount) || 0);
      }
    }

    // 3. Cria ou sobrescreve o FinancialSummary com o total correto
    const existing = await base44.asServiceRole.entities.FinancialSummary.list('', 1);
    let summaryId: string;
    if (existing.length > 0) {
      await base44.asServiceRole.entities.FinancialSummary.update(existing[0].id, {
        burned_balance: totalBurned,
        last_reconciled_at: new Date().toISOString()
      });
      summaryId = existing[0].id;
    } else {
      const created = await base44.asServiceRole.entities.FinancialSummary.create({
        burned_balance: totalBurned,
        last_reconciled_at: new Date().toISOString()
      });
      summaryId = created.id;
    }

    // 4. Marca burned_counted em todos os saques (loteado — updateMany limita a 500)
    //    Não-rejeitados: burned_counted=true
    //    Rejeitados: burned_counted=false
    let nonRejectedDone = false;
    while (!nonRejectedDone) {
      const res1 = await base44.asServiceRole.entities.WithdrawalRequest.updateMany(
        { status: { $ne: 'rejected' }, burned_counted: { $ne: true } },
        { $set: { burned_counted: true } }
      );
      nonRejectedDone = !res1?.has_more;
    }

    let rejectedDone = false;
    while (!rejectedDone) {
      const res2 = await base44.asServiceRole.entities.WithdrawalRequest.updateMany(
        { status: 'rejected', burned_counted: { $ne: false } },
        { $set: { burned_counted: false } }
      );
      rejectedDone = !res2?.has_more;
    }

    return Response.json({
      success: true,
      total_withdrawals: allWithdrawals.length,
      burned_balance: totalBurned,
      summary_id: summaryId,
      message: 'Migração concluída — FinancialSummary atualizado e flags alinhadas'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}