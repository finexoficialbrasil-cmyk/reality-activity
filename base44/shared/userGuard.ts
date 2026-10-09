// Guardas de segurança reutilizáveis: IP do cliente, bloqueio de usuário.

export function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip && ip !== 'unknown') return ip;
  }
  return req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || '';
}

// Verifica se o usuário autenticado está bloqueado.
// O campo is_blocked vem direto do objeto retornado por base44.auth.me().
export function isActorBlocked(user) {
  return !!(user && user.is_blocked);
}

// Mensagem padrão de bloqueio.
export const BLOCKED_MESSAGE = 'Sua conta está bloqueada. Entre em contato com o suporte.';

// Verifica se um usuário (por email) está bloqueado — usado para contrapartes
// (destinatário de transferência, dono do mega-link) que não são o usuário autenticado.
// Retorna true se bloqueado, false caso contrário (inclui falha de consulta → false).
export async function isEmailBlocked(base44, email) {
  if (!email) return false;
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    return !!(users && users[0] && users[0].is_blocked);
  } catch (e) {
    // Fail-open: não bloqueia a operação se não conseguir consultar.
    return false;
  }
}