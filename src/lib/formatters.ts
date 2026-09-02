/**
 * Formats a numeric value into Indian Rupee currency standard (e.g. ₹1,25,000.00)
 */
export function formatINR(amount: number | null | undefined, includeDecimals = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

/**
 * Formats date strings to readable Indian standard format (e.g., "18 Aug 2026")
 */
export function formatDate(dateString: string | Date | null | undefined, includeTime = false): string {
  if (!dateString) return '—';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  };

  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

/**
 * Masks Indian PAN or sensitive numbers for privacy compliance (e.g., "ABCDE****F")
 */
export function maskPAN(pan: string | null | undefined): string {
  if (!pan || pan.length < 10) return pan || 'N/A';
  return `${pan.substring(0, 5)}****${pan.substring(9)}`;
}

/**
 * Formats quantities and numbers with standard Indian commas
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}
