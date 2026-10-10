import { describe, it, expect } from 'vitest';
import { normalizeWebsiteUrl } from '../../src/lib/utils/url';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const schema = z.preprocess(normalizeWebsiteUrl, z.string().url().optional());
const wizardContent = fs.readFileSync(path.join(__dirname, '../../src/app/onboarding/Wizard.tsx'), 'utf-8');

describe('Phase 10F - Website URL Normalization', () => {
  it('cazzatrend.it -> valid normalized URL', () => {
    const result = normalizeWebsiteUrl('cazzatrend.it');
    expect(result).toBe('https://cazzatrend.it');
    expect(schema.parse('cazzatrend.it')).toBe('https://cazzatrend.it');
  });

  it('www.cazzatrend.it -> valid normalized URL', () => {
    const result = normalizeWebsiteUrl('www.cazzatrend.it');
    expect(result).toBe('https://www.cazzatrend.it');
    expect(schema.parse('www.cazzatrend.it')).toBe('https://www.cazzatrend.it');
  });

  it('https:// URL remains valid', () => {
    const result = normalizeWebsiteUrl('https://example.com/path');
    expect(result).toBe('https://example.com/path');
    expect(schema.parse('https://example.com/path')).toBe('https://example.com/path');
  });

  it('http:// URL remains valid', () => {
    const result = normalizeWebsiteUrl('http://example.com');
    expect(result).toBe('http://example.com');
    expect(schema.parse('http://example.com')).toBe('http://example.com');
  });

  it('path is preserved', () => {
    const result = normalizeWebsiteUrl('example.com/foo/bar?q=1');
    expect(result).toBe('https://example.com/foo/bar?q=1');
    expect(schema.parse('example.com/foo/bar?q=1')).toBe('https://example.com/foo/bar?q=1');
  });

  it('surrounding whitespace is removed', () => {
    const result = normalizeWebsiteUrl('   example.com   ');
    expect(result).toBe('https://example.com');
    expect(schema.parse('   example.com   ')).toBe('https://example.com');
  });

  it('empty optional website remains allowed', () => {
    const result1 = normalizeWebsiteUrl('');
    expect(result1).toBeUndefined();
    expect(schema.parse('')).toBeUndefined();

    const result2 = normalizeWebsiteUrl('   ');
    expect(result2).toBeUndefined();
    expect(schema.parse('   ')).toBeUndefined();
  });

  it('malformed website is rejected', () => {
    // "not a domain" contains spaces and cannot be parsed as a URL
    const parsed = schema.safeParse('not a domain');
    expect(parsed.success).toBe(false);
  });

  it('onboarding field no longer uses browser-native URL validation that blocks common domains', () => {
    expect(wizardContent).toContain('name="websiteUrl" type="text"');
    expect(wizardContent).not.toContain('name="websiteUrl" type="url"');
  });
});
