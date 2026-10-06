/**
 * Date fields from the admin portal's date inputs arrive as "YYYY-MM-DD", or
 * as "" when left blank. Copies the request body with the named fields turned
 * into Date objects:
 *
 * - `optional`: a blank (or null) value is dropped, meaning "not given", so an
 *   update leaves the stored date alone and a create uses its default.
 * - `clearable`: a blank (or null) value becomes null, clearing the date.
 */
export function parseFormDates(
  body: Record<string, any>,
  fields: { optional?: string[]; clearable?: string[] }
): Record<string, any> {
  const data: Record<string, any> = { ...body };
  for (const field of fields.optional ?? []) {
    if (data[field] === '' || data[field] === null) delete data[field];
    else if (data[field] !== undefined) data[field] = new Date(data[field]);
  }
  for (const field of fields.clearable ?? []) {
    if (data[field] === '' || data[field] === null) data[field] = null;
    else if (data[field] !== undefined) data[field] = new Date(data[field]);
  }
  return data;
}
