import { randomInt } from 'node:crypto';

// Change reference formatting here; keep legacy formats accepted by the shared schema.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LENGTH = 12;
export function generateVisitReference(): string {
  return (
    'DI-' +
    Array.from(
      { length: LENGTH },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join('')
  );
}
