import { describe, it, expect } from 'vitest';
import { createEventSchema, updateEventSchema } from '../event.validator';

/**
 * DARE2CARE-23 / ADR-0007 — createEventSchema/updateEventSchema must
 * sanitise `content` via the write-boundary sanitiser before it ever
 * reaches the service.
 */
describe('createEventSchema — content is sanitised', () => {
  const base = {
    title: 'Fundraiser',
    description: 'A community fundraiser',
    eventDate: '2026-09-01T00:00:00.000Z',
    location: 'Community Hall',
  };

  it('strips a <script> tag from content', () => {
    const result = createEventSchema.safeParse({
      body: { ...base, content: '<p>Join us</p><script>alert(1)</script>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('<script');
      expect(result.data.body.content).toContain('<p>Join us</p>');
    }
  });

  it('neutralises an onerror= handler in content', () => {
    const result = createEventSchema.safeParse({
      body: { ...base, content: '<img src="x" onerror="alert(1)">' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('onerror');
    }
  });

  it('neutralises a javascript: href in content', () => {
    const result = createEventSchema.safeParse({
      body: { ...base, content: '<a href="javascript:alert(1)">click</a>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('javascript:');
    }
  });

  it('lets benign formatting survive and adds rel to a real link', () => {
    const result = createEventSchema.safeParse({
      body: { ...base, content: '<p><strong>Bold</strong></p><a href="https://example.com">link</a>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).toContain('<strong>Bold</strong>');
      expect(result.data.body.content).toContain('rel="noopener noreferrer"');
    }
  });
});

describe('updateEventSchema — content is sanitised when present, optional otherwise', () => {
  it('strips a <script> tag from content on update', () => {
    const result = updateEventSchema.safeParse({
      body: { content: '<p>Updated</p><script>alert(1)</script>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).not.toContain('<script');
      expect(result.data.body.content).toContain('<p>Updated</p>');
    }
  });

  it('does not require content and does not throw when it is absent', () => {
    const result = updateEventSchema.safeParse({ body: { title: 'New title' } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.content).toBeUndefined();
    }
  });
});
