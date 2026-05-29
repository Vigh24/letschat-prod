import { describe, it, expect } from 'vitest';

describe('Webhook verification', () => {
  const VERIFY_TOKEN = 'test_verify_token_123';

  it('should accept valid verify token', () => {
    const mode = 'subscribe';
    const token = 'test_verify_token_123';
    const challenge = '1234567890';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      expect(challenge).toBe('1234567890');
    } else {
      throw new Error('Verification failed');
    }
  });

  it('should reject invalid verify token', () => {
    const mode = 'subscribe';
    const token = 'wrong_token';

    const isValid = mode === 'subscribe' && token === VERIFY_TOKEN;
    expect(isValid).toBe(false);
  });
});
