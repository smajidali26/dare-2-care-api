import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitize untrusted HTML at the API write boundary (DARE2CARE-23, ADR-0007).
 *
 * This is a **faithful mirror** of the public site's read-side sanitiser at
 * `dare2care/lib/utils/sanitize.ts` — same `allowedTags`, `allowedAttributes`,
 * `allowedSchemes`, the `&nbsp;`-to-space normalisation, and the `<a>` ->
 * `rel="noopener noreferrer"` / `target="_blank"` transform. Per ADR-0007 the
 * two configs must stay identical (stored content behaves the same whether or
 * not the read layer also runs), and the allow-list is deliberately NOT
 * tightened here (the `style`-attribute vector is a separate, deferred
 * decision — see ADR-0007 Alternatives #4). Copy any future change to this
 * config back to the public repo, and vice versa (no shared package yet;
 * consolidation tracked as DARE2CARE-50).
 *
 * Also normalises non-breaking spaces back to regular spaces — Quill (the
 * admin rich-text editor) inserts &nbsp; between every word, which otherwise
 * prevents the paragraph from wrapping and causes horizontal overflow.
 */
export function sanitizeHtml(html: string): string {
  const normalised = html
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ');

  return sanitizeHtmlLib(normalised, {
    allowedTags: [
      'p', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: attribs.target || '_blank',
        },
      }),
    },
  });
}

/**
 * `sanitizeHtml`, but safe to use directly as a Zod `.transform()` on fields
 * that are optional and/or nullable (`Event.content` on update, `Page.content`,
 * `Subscriber.managementBio`). `null`/`undefined` pass through untouched —
 * never thrown on, never coerced to `''` — which matters because
 * `managementBio` is a nullable column and Prisma treats `null` (clear the
 * field) and `undefined` (leave unchanged) as semantically different from an
 * empty string.
 */
export function sanitizeNullableHtml<T extends string | null | undefined>(html: T): T {
  if (html === null || html === undefined) {
    return html;
  }
  return sanitizeHtml(html) as T;
}
