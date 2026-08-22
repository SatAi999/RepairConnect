import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Auth Security Unit Tests', () => {
  it('should hash a password and verify it correctly', async () => {
    const password = 'securepassword123';
    const hash = await bcrypt.hash(password, 10);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('wrongpassword', hash);
    expect(isWrongMatch).toBe(false);
  });
});
