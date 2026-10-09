// Trilha de auditoria para ações administrativas.
// Registra admin responsável, data/hora, ação, alvo, valores anterior/posterior,
// motivo e identificador único da operação.

import { secrets } from "base44:runtime";

function genId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return String(obj);
  }
}

// Registra uma entrada de auditoria. Não lança — falha de log não derruba a operação.
export async function recordAudit(base44, adminUser, action, details = {}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      operation_id: details.operation_id || genId(),
      admin_email: adminUser?.email || 'system',
      admin_name: adminUser?.full_name || 'Sistema',
      action,
      target_type: details.target_type || '',
      target_id: details.target_id || '',
      target_email: details.target_email || '',
      value_before: details.value_before != null ? safeStringify(details.value_before) : '',
      value_after: details.value_after != null ? safeStringify(details.value_after) : '',
      reason: details.reason || '',
      request_id: details.request_id || '',
      ip: details.ip || '',
      metadata: details.metadata || {}
    });
  } catch (e) {
    // Log de auditoria é melhor-esforço: não derruba a operação principal.
  }
}