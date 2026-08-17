import { describe, it, expect } from 'vitest';
import { createPageSchema, updatePageSchema } from '../page.validator';

/**
 * DARE2CARE-23 / ADR-0007 — createPageSchema/updatePageSchema must sanitise
 * `content` via the write-boundary sanitiser before it ever reaches the
 * service.
 */
describe('createPageSchema — content is sanitised', () => {
  it('strips a <script> tag from content', () => {
    const result = createPageSchema.safeParse({
      body: {
        slug: 'about-us',
        title: 'About Us',
        content: '<p>Hello</p><script>alert(1)</script>',
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('<script');
      expect(result.data.body.content).toContain('<p>Hello</p>');
    }
  });

  it('neutralises an onerror= handler in content', () => {
    const result = createPageSchema.safeParse({
      body: { slug: 'about-us', title: 'About Us', content: '<img src="x" onerror="alert(1)">' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('onerror');
    }
  });

  it('neutralises a javascript: href in content', () => {
    const result = createPageSchema.safeParse({
      body: { slug: 'about-us', title: 'About Us', content: '<a href="javascript:alert(1)">click</a>' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('javascript:');
    }
  });

  it('lets benign formatting survive and adds rel to a real link', () => {
    const result = createPageSchema.safeParse({
      body: {
        slug: 'about-us',
        title: 'About Us',
        content: '<p><strong>Bold</strong></p><a href="https://example.com">link</a>',
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).toContain('<strong>Bold</strong>');
      expect(result.data.body.content).toContain('rel="noopener noreferrer"');
    }
  });
});

describe('updatePageSchema — content is sanitised', () => {
  it('strips a <script> tag from content on update', () => {
    const result = updatePageSchema.safeParse({
      body: { title: 'About Us', content: '<p>Updated</p><script>alert(1)</script>' },
      params: { slug: 'about-us' },
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('<script');
      expect(result.data.body.content).toContain('<p>Updated</p>');
    }
  });
});
