import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { transfer_key } = body;

    if (!transfer_key) {
      return Response.json({ error: 'Chave não informada' }, { status: 400 });
    }

    const keys = await base44.asServiceRole.entities.UserTransferKey.filter({ transfer_key });
    const keyRecord = keys[0];

    if (!keyRecord) {
      return Response.json({ error: 'Chave não encontrada' }, { status: 404 });
    }

    if (keyRecord.user_email === user.email) {
      return Response.json({ error: 'Esta é a sua própria chave' }, { status: 400 });
    }

    if (keyRecord.is_blocked) {
      return Response.json({ error: 'Esta chave está bloqueada' }, { status: 403 });
    }

    // Return only safe info - no email, no sensitive data
    return Response.json({
      receiver_name: keyRecord.user_name,
      receiver_key: keyRecord.transfer_key,
      is_valid: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}