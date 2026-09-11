import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { processSingleShare } from '../../shared/advertisementShare.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { advertisement_id, platform } = await req.json();

    if (!advertisement_id || !platform) {
      return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    // Fetch the ad
    const advertisement = await base44.asServiceRole.entities.Advertisement.get(advertisement_id);

    const result = await processSingleShare(base44, user, advertisement, platform);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      success: true,
      pointsCost: result.pointsCost,
      message: `-${result.pointsCost} pontos debitados do criador`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}