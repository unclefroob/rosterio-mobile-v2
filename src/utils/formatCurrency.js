/**
 * Format a numeric value as a currency string (AUD, 2 decimal places).
 * Returns "$0.00" for null, undefined, NaN, or non-finite values.
 *
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatCurrency(value) {
  const num = Number(value);
  if (!isFinite(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}
