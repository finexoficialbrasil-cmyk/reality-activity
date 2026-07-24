import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { link } = await req.json();

    if (!link) {
      return Response.json({ error: 'Link é obrigatório' }, { status: 400 });
    }

    // Extrai o domínio da URL
    let urlObj;
    try {
      urlObj = new URL(link.startsWith('http') ? link : `https://${link}`);
    } catch {
      return Response.json({ 
        valid: false, 
        message: 'URL inválida' 
      });
    }

    const domain = urlObj.hostname;

    // Busca domínios aprovados
    const approvedDomains = await base44.asServiceRole.entities.ApprovedDomain.filter({
      is_active: true
    });

    const isDomainApproved = approvedDomains.some(ad => {
      const approved = ad.domain.toLowerCase().replace(/^www\./, '');
      const host = domain.toLowerCase().replace(/^www\./, '');
      return host === approved || host.endsWith('.' + approved);
    });

    if (!isDomainApproved) {
      // Registra tentativa de uso de link inválido
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentAttempts = await base44.asServiceRole.entities.PointsTransaction.filter({
        user_email: user.email,
        type: 'invalid_link_attempt'
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const recentCount = recentAttempts.filter(a => new Date(a.created_date) >= today).length;

      // Se 3 ou mais tentativas hoje, bloqueia
      if (recentCount >= 2) {
        // Bloqueia o usuário
        await base44.asServiceRole.entities.User.update(user.id, {
          role: 'blocked'
        });

        return Response.json({
          valid: false,
          message: 'Sua conta foi bloqueada por tentativas repetidas de usar links não autorizados.',
          blocked: true
        });
      }

      // Registra a tentativa inválida
      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'invalid_link_attempt',
        points: 0,
        description: `Tentativa de usar domínio não autorizado: ${domain}`
      });

      const warningCount = recentCount + 1;

      return Response.json({
        valid: false,
        message: `❌ Link não autorizado! Domínios aceitos: mercadolivre.com, shopee.com, tiktok.com e seus parceiros. ${warningCount >= 2 ? 'Próxima tentativa vai bloquear sua conta!' : 'Aviso ' + warningCount + ' de 3'}`,
        attemptNumber: warningCount,
        domain
      });
    }

    return Response.json({
      valid: true,
      domain,
      message: 'Link validado com sucesso'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});