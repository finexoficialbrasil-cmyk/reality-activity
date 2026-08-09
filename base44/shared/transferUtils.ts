// Shared utilities for the points transfer system

const CHARSET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export function generateTransferKey(): string {
  const segment = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return s;
  };
  return `FCP-${segment()}-${segment()}-${segment()}`;
}

export function generateTransferId(): string {
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return `TRF-${s}`;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}