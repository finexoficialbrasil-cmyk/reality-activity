// Idempotência: proteção contra reprocessamento da mesma requisição.
// Cada operação financeira recebe um request_id único (gerado pelo cliente).
// Se a mesma requisição for reenviada (duplo clique, retry após queda de rede,
// atualização de página), o backend reconhece que já foi processada e retorna
// a resposta armazenada, sem executar a operação novamente.

// Verifica se a requisição já foi processada. Retorna o registro armazenado ou null.
export async function getIdempotentResult(base44, request_id, operation) {
  if (!request_id) return null;
  try {
    const existing = await base44.asServiceRole.entities.ProcessedRequest.filter(
      { request_id, operation },
      '-created_date',
      1
    );
    return existing[0] || null;
  } catch (e) {
    // Se a consulta falhar, não bloqueamos a operação (fail-open controlado).
    return null;
  }
}

// Registra o resultado de uma requisição processada para futuros replays.
export async function recordIdempotency(base44, request_id, operation, user_email, body, status = 200) {
  if (!request_id) return;
  try {
    await base44.asServiceRole.entities.ProcessedRequest.create({
      request_id,
      operation,
      user_email: user_email || '',
      result: { body, status },
      result_status: status
    });
  } catch (e) {
    // Ignora duplicidade — a proteção atômica já garantiu consistência.
  }
}