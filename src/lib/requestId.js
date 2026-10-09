import { useRef, useCallback } from 'react';

// Gera um identificador único de requisição para idempotência no backend.
export function newRequestId() {
  return 'req-' + (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));
}

// Hook que mantém um request_id estável durante uma operação pendente.
// Reutiliza o mesmo id em retries (ex.: queda de rede) para que o backend
// reconheça a requisição como duplicada e não a processe duas vezes.
// Limpa o id após sucesso, para que a próxima operação gere um novo.
export function useRequestId() {
  const ref = useRef(null);
  const get = useCallback(() => {
    if (!ref.current) ref.current = newRequestId();
    return ref.current;
  }, []);
  const clear = useCallback(() => { ref.current = null; }, []);
  return { get, clear };
}