import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { video_id, watch_seconds } = await req.json();
    if (!video_id) return Response.json({ error: 'video_id é obrigatório' }, { status: 400 });

    // Busca o vídeo no servidor (fonte confiável de pontos/duração)
    const videos = await base44.asServiceRole.entities.Video.filter({ id: video_id });
    const video = videos[0];
    if (!video || !video.is_active) {
      return Response.json({ error: 'Vídeo indisponível' }, { status: 404 });
    }

    // Calcula pontos no servidor — ignora valores enviados pelo cliente
    const duration = video.duration_seconds || 30;
    const pps = video.points_per_second || 1;
    const bonus = video.bonus_points || 50;

    const secs = Math.max(0, Math.min(Number(watch_seconds) || 0, duration));
    if (secs <= 0) return Response.json({ error: 'Tempo insuficiente' }, { status: 400 });

    const completed = secs >= duration;
    const pts = Math.floor(secs * pps) + (completed ? bonus : 0);
    if (pts <= 0) return Response.json({ error: 'Pontos insuficientes' }, { status: 400 });

    // Trava de 24h: valida no servidor (filtro de data delegado ao banco)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await base44.asServiceRole.entities.PointsTransaction.filter({
      user_email: user.email,
      type: 'earned_watch',
      video_id,
      created_date: { $gte: since24h }
    });
    const watchedRecently = recent.length > 0;
    if (watchedRecently) {
      return Response.json({
        success: false,
        reason: 'cooldown',
        message: 'Você já ganhou pontos assistindo este vídeo nas últimas 24h.'
      });
    }

    // Registra a transação
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'earned_watch',
      points: pts,
      video_id,
      company_id: video.company_id,
      description: `Assistiu "${video.title}" por ${secs}s`,
      watch_seconds: secs
    });

    // Atualiza saldo do usuário (upsert)
    const existing = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.UserPoints.update(existing[0].id, {
        balance: (existing[0].balance || 0) + pts,
        total_earned: (existing[0].total_earned || 0) + pts,
        videos_watched: (existing[0].videos_watched || 0) + 1,
        last_activity: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name,
        balance: pts,
        total_earned: pts,
        videos_watched: 1,
        last_activity: new Date().toISOString()
      });
    }

    // Atualiza contadores do vídeo
    await base44.asServiceRole.entities.Video.update(video_id, {
      views_count: (video.views_count || 0) + 1,
      total_points_awarded: (video.total_points_awarded || 0) + pts
    });

    return Response.json({
      success: true,
      points: pts,
      watch_seconds: secs,
      completed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});