import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateTransferKey } from '../../shared/transferUtils.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    // Check if user already has a key
    const existingKeys = await base44.asServiceRole.entities.UserTransferKey.filter({ user_email: user.email });
    if (existingKeys[0]) {
      return Response.json({
        transfer_key: existingKeys[0].transfer_key,
        is_blocked: existingKeys[0].is_blocked,
        transfers_count: existingKeys[0].transfers_count || 0,
        total_volume: existingKeys[0].total_volume || 0
      });
    }

    // Generate unique key (check for collisions)
    let key = generateTransferKey();
    let existing = await base44.asServiceRole.entities.UserTransferKey.filter({ transfer_key: key });
    let attempts = 0;
    while (existing.length > 0 && attempts < 10) {
      key = generateTransferKey();
      existing = await base44.asServiceRole.entities.UserTransferKey.filter({ transfer_key: key });
      attempts++;
    }

    // Create key record
    await base44.asServiceRole.entities.UserTransferKey.create({
      user_email: user.email,
      user_name: user.full_name,
      transfer_key: key
    });

    return Response.json({
      transfer_key: key,
      is_blocked: false,
      transfers_count: 0,
      total_volume: 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}