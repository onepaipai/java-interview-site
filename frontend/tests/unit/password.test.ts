import { describe, it, expect } from 'vitest';
import { passwordError } from '../../src/lib/password';

describe('UTF-8 password limits', () => {
  it('accepts the byte boundary and rejects multibyte overflow', () => {
    expect(passwordError('汉'.repeat(24))).toBe('');
    expect(passwordError('汉'.repeat(25))).toContain('72 字节');
    expect(passwordError('😀'.repeat(18))).toBe('');
    expect(passwordError('😀'.repeat(19))).toContain('72 字节');
    expect(passwordError('a'.repeat(64))).toBe('');
    expect(passwordError('a'.repeat(65))).toContain('12–64');
  });
});
