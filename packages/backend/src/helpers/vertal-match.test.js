import { describe, it, expect } from 'vitest';
import { matchesProviderUser } from './vertal-match.js';

describe('matchesProviderUser', () => {
  it('compara o userId guardado no login', () => {
    expect(matchesProviderUser({ userId: '123' }, '123')).toBe(true);
    expect(matchesProviderUser({ userId: 123 }, '123')).toBe(true);
    expect(matchesProviderUser({ userId: '1234' }, '123')).toBe(false);
    expect(matchesProviderUser(undefined, '123')).toBe(false);
    expect(matchesProviderUser({}, '')).toBe(false);
  });
});
