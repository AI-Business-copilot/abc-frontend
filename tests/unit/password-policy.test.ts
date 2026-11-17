import { describe, expect, it } from 'vitest';
import { isStrongPassword } from '@/lib/password-policy';

describe('password policy', () => {
  it('accepts the minimum length with all required character classes', () => {
    expect(isStrongPassword('Abcdefghij1!')).toBe(true);
  });
  it.each(['', 'Abcdefghi1!', 'abcdefghij1!', 'ABCDEFGHIJ1!', 'Abcdefghijk!', 'Abcdefghij12', 'Abcdefghij1 '])('rejects an incomplete password: %s', password => {
    expect(isStrongPassword(password)).toBe(false);
  });
});
