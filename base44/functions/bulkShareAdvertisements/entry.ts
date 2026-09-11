import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { processSingleShare } from '../../shared/advertisementShare.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { platform, max_ads } = await req.json();

    if (!platform) {
      return Response.json({ error: 'Plataforma de compartilhamento é obrigatória' }, { status: 400 });
    }

    // Fetch all approved, active, bulk-shareable ads with remaining budget
    const allAds = await base44.asServiceRole.entities.Advertisement.list('-created_date', 500);

    const eligibleAds = allAds.filter(ad =>
      ad.status === 'approved' &&
      ad.is_active !== false &&
      ad.is_bulk_shareable !== false &&
      (ad.budget_remaining || 0) > 0 &&
      ad.user_email !== user.email
    );

    if (eligibleAds.length === 0) {
      return Response.json({
        success: true,
        totalPoints: 0,
        sharedCount: 0,
        message: 'Nenhum anúncio elegível para compartilhamento em massa no momento.'
      });
    }

    // Apply platform-specific limit if provided
    const adsToShare = (typeof max_ads === 'number' && max_ads > 0)
      ? eligibleAds.slice(0, max_ads)
      : eligibleAds;

    let totalPoints = 0;
    const sharedAds = [];
    const errors = [];

    for (const ad of adsToShare) {
      try {
        const result = await processSingleShare(base44, user, ad, platform);
        if (result.ok) {
          totalPoints += result.pointsCost;
          sharedAds.push({
            id: ad.id,
            title: ad.title,
            points: result.pointsCost
          });
        } else {
          errors.push({ id: ad.id, title: ad.title, error: result.error });
        }
      } catch (err) {
        errors.push({ id: ad.id, title: ad.title, error: err.message });
      }
    }

    return Response.json({
      success: true,
      totalPoints,
      sharedCount: sharedAds.length,
      sharedAds,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}