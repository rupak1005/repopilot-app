import crypto from 'crypto';

export function deriveRepositoryId(fullName: string): string {
  const hash = crypto.createHash('sha256').update(fullName.toLowerCase()).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
