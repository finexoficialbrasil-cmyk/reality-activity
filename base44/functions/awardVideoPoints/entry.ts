import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicDebitField, atomicCreditBalance } from '../../shared/atomicFinance.ts';
import { checkRateLimit, RATE_LIMITS } from '../../shared/rateLimit.ts';
import { isActorBlocked, BLOCKED_MESSAGE } from '../../shared/userGuard.ts';
import { createLedgerEntry } from '../../shared/ledger.ts';

const OP = 'video_points';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (isActorBlocked(user)) return Response.json({ error: BLOCKED_MESSAGE }, { status: 403 });

    const { video_id, watch_seconds, request_id } = await req.json();

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    // === RATE LIMIT ===
    const rl = await checkRateLimit(base44, 'share', user.email, RATE_LIMITS.share.max, RATE_LIMITS.share.windowSeconds);
    if (!rl.allowed) {
      const errBody = { error: `Muitas solicitações. Tente novamente em ${rl.retry_after_seconds || 600}s.`, rate_limited: true };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 429);
      return Response.json(errBody, { status: 429 });
    }

    if (!video_id) {
      const errBody = { error: 'video_id é obrigatório' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Busca o vídeo no servidor (fonte confiável de pontos/duração/orçamento)
    const videos = await base44.asServiceRole.entities.Video.filter({ id: video_id });
    const video = videos[0];
    if (!video || !video.is_active) {
      const errBody = { error: 'Vídeo indisponível' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 404);
      return Response.json(errBody, { status: 404 });
    }

    // Calcula pontos no servidor — ignora valores enviados pelo cliente
    const duration = video.duration_seconds || 30;
    const pps = video.points_per_second || 1;
    const bonus = video.bonus_points || 50;

    const secs = Math.max(0, Math.min(Number(watch_seconds) || 0, duration));
    if (secs <= 0) {
      const errBody = { error: 'Tempo insuficiente' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    const completed = secs >= duration;
    const pts = Math.floor(secs * pps) + (completed ? bonus : 0);
    if (pts <= 0) {
      const errBody = { error: 'Pontos insuficientes' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === FINANCIAMENTO OBRIGATÓRIO ===
    // Pontos de vídeo só podem ser creditados se houver orçamento financiado no vídeo.
    // Sem orçamento, o vídeo NÃO gera pontos (impede passivo financeiro ilimitado).
    const videoBudget = Number(video.budget_remaining) || 0;
    if (videoBudget <= 0) {
      const errBody = {
        success: false,
        error: 'Este vídeo não possui orçamento disponível para distribuir pontos. Aguarde o administrador abastecer a campanha.'
      };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Limita os pontos ao orçamento disponível (paga o que restar)
    const ptsToAward = Math.min(pts, videoBudget);
    if (ptsToAward <= 0) {
      const errBody = { error: 'Orçamento do vídeo esgotado' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Trava de 24h: busca transações recentes do usuário+vídeo
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await base44.asServiceRole.entities.PointsTransaction.filter(
      { user_email: user.email, type: 'earned_watch', video_id },
      '-created_date',
      10
    );
    const watchedRecently = recent.some(t => {
      const d = t.created_date ? new Date(t.created_date) : null;
      return d && d >= since24h;
    });
    if (watchedRecently) {
      const body = {
        success: false,
        reason: 'cooldown',
        message: 'Você já ganhou pontos assistindo este vídeo nas últimas 24h.'
      };
      await recordIdempotency(base44, request_id, OP, user.email, body, 200);
      return Response.json(body);
    }

    // === DÉBITO ATÔMICO DO ORÇAMENTO DO VÍDEO ===
    // Só debita se budget_remaining >= ptsToAward (impede orçamento negativo e duplo crédito)
    const debit = await atomicDebitField(
      base44,
      'Video',
      video_id,
      'budget_remaining',
      ptsToAward,
      { views_count: 1, total_points_awarded: ptsToAward }
    );
    if (!debit.ok) {
      const errBody = { success: false, error: 'Orçamento do vídeo esgotado durante o processamento. Tente novamente.' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Atualiza saldo do usuário (atômico, ou cria se primeira vez)
    const existing = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    let videoBalanceBefore = null;
    let videoBalanceAfter = null;
    if (existing.length > 0) {
      videoBalanceBefore = Number(existing[0].balance) || 0;
      const credited = await atomicCreditBalance(base44, 'UserPoints', existing[0].id, ptsToAward);
      videoBalanceAfter = Number(credited?.balance) || 0;
      // incrementa videos_watched
      await base44.asServiceRole.entities.UserPoints.update(existing[0].id, {
        videos_watched: (existing[0].videos_watched || 0) + 1
      });
    } else {
      await base44.asServiceRole.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name,
        balance: ptsToAward,
        total_earned: ptsToAward,
        videos_watched: 1,
        last_activity: new Date().toISOString()
      });
      videoBalanceBefore = 0;
      videoBalanceAfter = ptsToAward;
    }

    // Registra a transação (ledger enriquecido)
    await createLedgerEntry(base44, {
      user_email: user.email,
      user_name: user.full_name,
      type: 'earned_watch',
      points: ptsToAward,
      balance_before: videoBalanceBefore,
      balance_after: videoBalanceAfter,
      video_id,
      company_id: video.company_id,
      description: `Assistiu "${video.title}" por ${secs}s`,
      watch_seconds: secs,
      origin: 'video',
      destination: video_id,
      original_reference: video_id,
      request_id: request_id || ''
    });

    const resultBody = {
      success: true,
      points: ptsToAward,
      watch_seconds: secs,
      completed
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});