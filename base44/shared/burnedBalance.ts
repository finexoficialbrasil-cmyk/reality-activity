// base44/shared/burnedBalance.ts
// Resumo financeiro consolidado — contador O(1) de pontos queimados em saques.
//
// O getPublicData lê apenas o registro único de FinancialSummary (1 query),
// sem varrer milhares de saques. As atualizações incrementais em
// processWithdrawal (create) e processWithdrawalDecision (reject) mantêm o
// contador sincronizado em tempo real.
//
// Idempotência: cada WithdrawalRequest carrega a flag `burned_counted`.
// O contador só é ajustado quando a flag muda de estado, impedindo dupla
// contagem ou dupla subtração em retries. A flag é atualizada PRIMEIRO (claim)
// para que um retry veja o novo estado e não repita o ajuste.

// Lê o registro único de FinancialSummary e retorna o burned_balance (default 0).
export async function getBurnedBalance(base44: any): Promise<number> {
  const records = await base44.asServiceRole.entities.FinancialSummary.list('', 1);
  if (!records || records.length === 0) return 0;
  return Number(records[0].burned_balance) || 0;
}

// Garante que o registro único de FinancialSummary exista (get-or-create).
async function getOrCreateSummary(base44: any): Promise<{ id: string }> {
  const records = await base44.asServiceRole.entities.FinancialSummary.list('', 1);
  if (records && records.length > 0) return records[0];
  return await base44.asServiceRole.entities.FinancialSummary.create({ burned_balance: 0 });
}

// Ajusta o contador de forma atômica (incrementa ou decrementa).
export async function adjustBurnedBalance(base44: any, delta: number): Promise<void> {
  const summary = await getOrCreateSummary(base44);
  await base44.asServiceRole.entities.FinancialSummary.updateMany(
    { id: summary.id },
    { $inc: { burned_balance: delta } }
  );
}

// Ajuste idempotente baseado na flag burned_counted do saque.
// add=true : se o saque ainda não foi contado, marca flag=true e adiciona points ao contador.
// add=false : se o saque foi contado, marca flag=false e subtrai points do contador.
// Não faz nada se o saque já está no estado desejado (idempotente).
// A flag é atualizada PRIMEIRO (claim) para evitar dupla contagem em retries.
export async function adjustWithdrawalBurned(
  base44: any,
  withdrawal: { id: string; burned_counted?: boolean },
  points: number,
  add: boolean
): Promise<void> {
  const currentlyCounted = withdrawal.burned_counted === true;

  if (add && !currentlyCounted) {
    await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal.id, { burned_counted: true });
    await adjustBurnedBalance(base44, points);
  } else if (!add && currentlyCounted) {
    await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal.id, { burned_counted: false });
    await adjustBurnedBalance(base44, -points);
  }
}