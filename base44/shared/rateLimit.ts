// Rate limiting baseado em bucket por janela temporal.
//
// Cada operação sensível chama checkRateLimit() com:
//   - operation: nome da operação
//   - identifier: email do usuário (autenticado) ou IP (anônimo)
//   - max: máximo de requisições permitidas na janela
//   - windowSeconds: duração da janela em segundos
//
// A contagem é persistida na entidade RateLimit (chave única por bucket).
// O incremento é condicional (count < max) para evitar estourar o limite mesmo
// sob concorrência. Em caso de falha de infra, abre fail-open (não bloqueia
// uso legítimo por erro interno).

export async function checkRateLimit(base44, operation, identifier, max, windowSeconds) {
  if (!identifier) return { allowed: true, count: 0, skipped: true };
  const now = Date.now();
  const bucketSizeMs = windowSeconds * 1000;
  const bucket = Math.floor(now / bucketSizeMs);
  const key = `${operation}:${identifier}:${bucket}`;
  const windowStart = new Date(bucket * bucketSizeMs).toISOString();

  try {
    const existing = await base44.asServiceRole.entities.RateLimit.filter({ key }, '-created_date', 1);
    if (!existing || existing.length === 0) {
      try {
        await base44.asServiceRole.entities.RateLimit.create({
          key, operation, identifier, count: 1, window_start: windowStart
        });
        return { allowed: true, count: 1 };
      } catch (createErr) {
        // Race: outro worker criou o bucket no mesmo instante — incrementa.
        const upd = await base44.asServiceRole.entities.RateLimit.updateMany(
          { key, count: { $lt: max } },
          { $inc: { count: 1 } }
        );
        if (upd && upd.updated === 1) return { allowed: true, count: 2 };
        return { allowed: false, count: max, retry_after_seconds: windowSeconds - Math.floor((now - bucket * bucketSizeMs) / 1000) };
      }
    }

    const rec = existing[0];
    const current = Number(rec.count) || 0;
    if (current >= max) {
      return { allowed: false, count: current, retry_after_seconds: windowSeconds - Math.floor((now - bucket * bucketSizeMs) / 1000) };
    }

    const upd = await base44.asServiceRole.entities.RateLimit.updateMany(
      { id: rec.id, count: { $lt: max } },
      { $inc: { count: 1 } }
    );
    if (upd && upd.updated === 1) {
      return { allowed: true, count: current + 1 };
    }
    return { allowed: false, count: max, retry_after_seconds: windowSeconds - Math.floor((now - bucket * bucketSizeMs) / 1000) };
  } catch (e) {
    // Fail-open controlado: erro de infra não bloqueia uso legítimo.
    return { allowed: true, count: 0, error: e.message };
  }
}

// Limites equilibrados por operação (não bloqueiam uso legítimo normal).
export const RATE_LIMITS = {
  withdrawal: { max: 5, windowSeconds: 600 },        // 5 saques / 10 min
  transfer: { max: 8, windowSeconds: 600 },           // 8 transferências / 10 min
  share: { max: 25, windowSeconds: 600 },             // 25 compartilhamentos / 10 min
  mega_link: { max: 40, windowSeconds: 600 },         // 40 cliques mega-link / 10 min (por IP)
  create_listing: { max: 8, windowSeconds: 3600 },    // 8 ofertas marketplace / hora
  declare_interest: { max: 15, windowSeconds: 600 },  // 15 manifestações de interesse / 10 min
  confirm_sale: { max: 10, windowSeconds: 600 },      // 10 confirmações de venda / 10 min
  twofa_attempt: { max: 6, windowSeconds: 600 }       // 6 tentativas 2FA / 10 min
};