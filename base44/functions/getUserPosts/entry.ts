import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Retorna os anúncios do usuário autenticado.
 * Roteado via função backend para evitar que ad-blockers bloqueiem
 * requisições diretas a /entities/Advertisement no cliente.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userAds = await base44.asServiceRole.entities.Advertisement.filter(
      { user_email: user.email },
      '-created_date',
      50
    );

    return Response.json({ success: true, ads: userAds });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}