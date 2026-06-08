import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { link } = await req.json();

    if (!link) {
      return Response.json({ error: 'Link é obrigatório' }, { status: 400 });
    }

    // Extrai o domínio da URL
    let urlObj;
    try {
      urlObj = new URL(link.startsWith('http') ? link : `https://${link}`);
    } catch {
      return Response.json({ error: 'URL inválida' }, { status: 400 });
    }

    const domain = urlObj.hostname;

    // Busca domínios aprovados
    const approvedDomains = await base44.asServiceRole.entities.ApprovedDomain.filter({
      is_active: true
    });

    const isDomainApproved = approvedDomains.some(ad => 
      domain.includes(ad.domain) || ad.domain.includes(domain)
    );

    if (!isDomainApproved) {
      return Response.json({
        valid: false,
        message: 'Domínio não aprovado. Apenas domínios pré-aprovados são permitidos.'
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