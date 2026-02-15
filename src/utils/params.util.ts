/**
 * Helper to extract string from req.params which can be string | string[]
 * @param param - Parameter value from req.params
 * @returns First string value or the string itself
 */
export const getParamAsString = (param: string | string[]): string => {
  return Array.isArray(param) ? param[0] : param;
};
