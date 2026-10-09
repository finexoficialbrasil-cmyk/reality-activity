// Ledger enriquecido: cria PointsTransaction com balance_before / balance_after
// e metadados de origem/destino/request_id/referência original.
//
// balance_before é derivado de balance_after - points (points é assinado:
// crédito = +amount, débito = -amount). Isso é preciso no instante da operação
// atômica que devolveu o registro com o saldo já atualizado.

export async function createLedgerEntry(base44, entry) {
  const points = Number(entry.points) || 0;
  const balanceAfter = entry.balance_after != null ? Number(entry.balance_after) : null;
  const balanceBefore = entry.balance_before != null
    ? Number(entry.balance_before)
    : (balanceAfter != null ? balanceAfter - points : null);

  const record = {
    user_email: entry.user_email,
    user_name: entry.user_name || '',
    type: entry.type,
    points,
    description: entry.description || '',
    transfer_email: entry.transfer_email || '',
    transfer_name: entry.transfer_name || '',
    transaction_value: Number(entry.transaction_value) || 0,
    video_id: entry.video_id || '',
    product_id: entry.product_id || '',
    company_id: entry.company_id || '',
    advertisement_id: entry.advertisement_id || '',
    listing_id: entry.listing_id || '',
    watch_seconds: entry.watch_seconds || 0,
    request_id: entry.request_id || '',
    origin: entry.origin || '',
    destination: entry.destination || '',
    original_reference: entry.original_reference || ''
  };

  if (balanceBefore != null) record.balance_before = balanceBefore;
  if (balanceAfter != null) record.balance_after = balanceAfter;

  return base44.asServiceRole.entities.PointsTransaction.create(record);
}