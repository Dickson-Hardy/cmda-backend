import { createHmac, timingSafeEqual } from 'crypto';

const getSecret = (): string =>
  process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'cmda-unsubscribe-secret';

const sign = (email: string): string =>
  createHmac('sha256', getSecret()).update(email).digest('hex');

export function createUnsubscribeToken(email: string): string {
  const normalized = String(email || '').trim().toLowerCase();
  const payload = Buffer.from(normalized, 'utf8').toString('base64url');
  return `${payload}.${sign(normalized)}`;
}

export function verifyUnsubscribeToken(token?: string): string | null {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const email = Buffer.from(payload, 'base64url').toString('utf8');
    const expected = sign(email);
    const actualBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}
