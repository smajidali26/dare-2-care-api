import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeNullableHtml } from '../sanitizeHtml.util';

/**
 * DARE2CARE-23 / ADR-0007 — write-boundary sanitiser. Mirrors
 * dare2care/lib/utils/sanitize.ts exactly; these tests exercise the
 * neutralisation cases called out in the spec plus the nullable-safety
 * contract managementBio depends on.
 */
describe('sanitizeHtml', () => {
  it('strips a <script> tag entirely', () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(');
    expect(result).toContain('<p>Hello</p>');
  });

  it('neutralises an onerror= handler on an <img>', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert(1)');
  });

  it('neutralises a javascript: href on an <a>', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click me</a>');
    expect(result).not.toContain('javascript:');
  });

  it('lets benign formatting survive (p, strong, lists, https link)', () => {
    const input =
      '<p>Some <strong>bold</strong> text.</p><ul><li>one</li><li>two</li></ul>' +
      '<a href="https://example.com">link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<li>one</li>');
    expect(result).toContain('<li>two</li>');
    expect(result).toContain('href="https://example.com"');
  });

  it('adds rel="noopener noreferrer" and a target to an allowed link', () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it('preserves an explicit target instead of overwriting it', () => {
    const result = sanitizeHtml('<a href="https://example.com" target="_self">link</a>');
    expect(result).toContain('target="_self"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('normalises &nbsp; to a regular space', () => {
    const result = sanitizeHtml('<p>Hello&nbsp;World</p>');
    expect(result).toBe('<p>Hello World</p>');
  });

  it('normalises a literal non-breaking space character to a regular space', () => {
    const result = sanitizeHtml('<p>Hello World</p>');
    expect(result).toBe('<p>Hello World</p>');
  });

  it('drops a disallowed tag (e.g. <iframe>) but keeps its safe siblings', () => {
    const result = sanitizeHtml('<p>Before</p><iframe src="https://evil.example"></iframe><p>After</p>');
    expect(result).not.toContain('<iframe');
    expect(result).toContain('<p>Before</p>');
    expect(result).toContain('<p>After</p>');
  });
});

describe('sanitizeNullableHtml', () => {
  it('passes null through untouched', () => {
    expect(sanitizeNullableHtml(null)).toBeNull();
  });

  it('passes undefined through untouched', () => {
    expect(sanitizeNullableHtml(undefined)).toBeUndefined();
  });

  it('never turns null into an empty string', () => {
    expect(sanitizeNullableHtml(null)).not.toBe('');
  });

  it('does not throw on null or undefined', () => {
    expect(() => sanitizeNullableHtml(null)).not.toThrow();
    expect(() => sanitizeNullableHtml(undefined)).not.toThrow();
  });

  it('sanitises a real string exactly like sanitizeHtml', () => {
    const input = '<p>Hi</p><script>alert(1)</script>';
    expect(sanitizeNullableHtml(input)).toBe(sanitizeHtml(input));
  });
});
