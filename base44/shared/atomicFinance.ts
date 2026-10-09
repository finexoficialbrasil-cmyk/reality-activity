// Operações financeiras atômicas à prova de race condition.
//
// Usa updateMany condicional (filtro balance >= amount + $inc) que o MongoDB
// aplica atomicamente por documento. O retorno { updated: N } indica quantos
// registros foram efetivamente modificados:
//   updated === 1 → débito aplicado com sucesso
//   updated === 0 → saldo insuficiente OU concorrência venceu (não aplicar)
//
// Isso impede saldo negativo e consumo de orçamento acima do disponível,
// mesmo sob duas requisições simultâneas.

// Débito atômico do campo `balance` (com total_spent e last_activity).
// Retorna { ok, record, error }.
export async function atomicDebitBalance(base44, entityName, id, amount) {
  const ents = base44.asServiceRole.entities[entityName];
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) return { ok: false, error: 'Quantidade inválida' };

  const res = await ents.updateMany(
    { id, balance: { $gte: amt } },
    {
      $inc: { balance: -amt, total_spent: amt },
      $set: { last_activity: new Date().toISOString() }
    }
  );

  if (res && res.updated === 1) {
    const after = await ents.get(id);
    return { ok: true, record: after };
  }

  // Não aplicou — ler para diferenciar saldo insuficiente de concorrência.
  const rec = await ents.get(id).catch(() => null);
  const current = Number(rec?.balance) || 0;
  return {
    ok: false,
    error: current < amt ? 'Saldo insuficiente' : 'Concorrência detectada — tente novamente',
    record: rec
  };
}

// Crédito atômico no campo `balance` (com total_earned e last_activity).
// Sem condição — crédito sempre é aplicado. Retorna o registro atualizado.
export async function atomicCreditBalance(base44, entityName, id, amount) {
  const ents = base44.asServiceRole.entities[entityName];
  const amt = Math.max(0, Number(amount) || 0);
  await ents.updateMany(
    { id },
    {
      $inc: { balance: amt, total_earned: amt },
      $set: { last_activity: new Date().toISOString() }
    }
  );
  return await ents.get(id);
}

// Débito atômico de um campo numérico genérico (ex: budget_remaining de anúncio/vídeo).
// extraInc permite incrementar contadores adicionais no mesmo update atômico.
// Retorna { ok, record, error }.
export async function atomicDebitField(base44, entityName, id, field, amount, extraInc = {}) {
  const ents = base44.asServiceRole.entities[entityName];
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) return { ok: false, error: 'Quantidade inválida' };

  const res = await ents.updateMany(
    { id, [field]: { $gte: amt } },
    { $inc: { [field]: -amt, ...extraInc } }
  );

  if (res && res.updated === 1) {
    const after = await ents.get(id);
    return { ok: true, record: after };
  }

  const rec = await ents.get(id).catch(() => null);
  const current = Number(rec?.[field]) || 0;
  return {
    ok: false,
    error: current < amt ? 'Orçamento insuficiente' : 'Concorrência detectada — tente novamente',
    record: rec
  };
}

// Transferência atômica com reversão compensatória.
//
// Debita o remetente (condicional: só se balance >= amount) e credita o
// destinatário (atômico). Se o crédito falhar (erro de rede/API/DB), ESTORNA
// o débito do remetente creditando o valor de volta — garantindo que nunca
// fique débito sem o crédito correspondente.
//
// Retorna { ok, senderRecord, error }:
//   ok=true  → transferência concluída (senderRecord = remetente após débito)
//   ok=false → nada alterado (saldo insuficiente, ou crédito falhou e débito foi estornado)
export async function atomicTransferPoints(base44, senderId, receiverEmail, amount, receiverName) {
  const ents = base44.asServiceRole.entities;
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) return { ok: false, error: 'Quantidade inválida' };

  // 1. Débito atômico do remetente (só aplica se balance >= amt)
  const debit = await atomicDebitBalance(base44, 'UserPoints', senderId, amt);
  if (!debit.ok) return { ok: false, error: debit.error, phase: 'debit_failed' };

  // 2. Crédito do destinatário. Se falhar, estorna o débito do remetente.
  try {
    const receiverArr = await ents.UserPoints.filter({ user_email: receiverEmail });
    if (receiverArr[0]) {
      await atomicCreditBalance(base44, 'UserPoints', receiverArr[0].id, amt);
    } else {
      await ents.UserPoints.create({
        user_email: receiverEmail,
        user_name: receiverName || 'Usuário',
        balance: amt,
        total_earned: amt,
        last_activity: new Date().toISOString()
      });
    }
    return { ok: true, senderRecord: debit.record, phase: 'done' };
  } catch (creditError) {
    // Compensação: estorna o débito para zerar o efeito (nunca débito sem crédito)
    try {
      await atomicCreditBalance(base44, 'UserPoints', senderId, amt);
    } catch (reverseError) { /* melhor esforço */ }
    return { ok: false, error: 'Falha ao creditar destinatário — débito estornado.', phase: 'credit_failed' };
  }
}