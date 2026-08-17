/**
 * Period utilities — the single shared source of "what UTC pledge-period is this"
 * for pledge reconciliation (DARE2CARE-12) and reminder suppression (DARE2CARE-13).
 *
 * Both features must agree on the period at month boundaries (e.g. 23:59 UTC on the
 * 31st vs. 00:00 UTC on the 1st) or a donation could reconcile against one period
 * while the cron suppresses (or fails to suppress) against another. Computing this
 * in exactly one place, in UTC, is what keeps them consistent — see
 * `decisions/ADR-0005-one-donation-ledger-extend-not-replace.md` and
 * `specs/sprint-02-donation-ledger.md` §3.
 */

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * The "YYYY-MM" UTC period a given instant falls in. Defaults to now.
 */
export function currentUtcPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Whether a string is a well-formed "YYYY-MM" period.
 */
export function isValidPeriod(period: string): boolean {
  return PERIOD_REGEX.test(period);
}
