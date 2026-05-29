import { describe, it, expect } from 'vitest';

function parseCsatScore(msgBody: string): number {
  const starsCount = (msgBody.match(/⭐/g) || []).length;
  if (starsCount >= 1 && starsCount <= 5) return starsCount;

  const ratingMatch = msgBody.trim().match(/^[1-5]$/) || msgBody.match(/\(?([1-5])\/5\)?/);
  if (ratingMatch) return parseInt(ratingMatch[1] ? ratingMatch[1] : ratingMatch[0], 10);

  return 0;
}

describe('parseCsatScore', () => {
  it('parses star ratings', () => {
    expect(parseCsatScore('⭐⭐⭐⭐⭐ Excellent')).toBe(5);
    expect(parseCsatScore('⭐⭐⭐ Good')).toBe(3);
    expect(parseCsatScore('⭐ Poor')).toBe(1);
  });

  it('parses numeric ratings 1-5', () => {
    expect(parseCsatScore('5')).toBe(5);
    expect(parseCsatScore('3')).toBe(3);
    expect(parseCsatScore('1')).toBe(1);
  });

  it('parses fractional ratings like 4/5', () => {
    expect(parseCsatScore('4/5')).toBe(4);
    expect(parseCsatScore('(3/5)')).toBe(3);
  });

  it('returns 0 for invalid input', () => {
    expect(parseCsatScore('not a rating')).toBe(0);
    expect(parseCsatScore('')).toBe(0);
    expect(parseCsatScore('0')).toBe(0);
    expect(parseCsatScore('10')).toBe(0);
  });
});
