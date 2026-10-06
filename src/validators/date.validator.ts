import { z } from 'zod';

/**
 * Date fields shared by the student, subscriber and teacher validators.
 *
 * The admin portal's date inputs send "YYYY-MM-DD", and an empty string when
 * left blank. A date-only value is read as midnight UTC.
 */

const toIso = (val: string): string =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(val) ? `${val}T00:00:00Z` : val).toISOString();

/** A required date, stored as an ISO timestamp. Text that isn't a date is rejected. */
export const dateString = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(val) ? `${val}T00:00:00Z` : val)), {
    message: 'Invalid date',
  })
  .transform(toIso);

/** An optional date: a blank field counts as "not given". */
export const optionalDateString = z.preprocess(
  (val) => (val === '' ? undefined : val),
  dateString.optional()
);

/** An optional date that can be cleared: a blank field sets it to null. */
export const clearableDateString = z.preprocess(
  (val) => (val === '' ? null : val),
  dateString.optional().nullable()
);
