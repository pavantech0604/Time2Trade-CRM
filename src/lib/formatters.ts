/**
 * Formats a numeric value into Indian Rupee currency standard (e.g. ₹1,25,000 or ₹1,25,000.50)
 * Intelligently omits .00 for whole numbers when includeDecimals is not explicitly specified.
 */
export function formatINR(amount: number | null | undefined, includeDecimals?: boolean): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeDecimals ? '₹0.00' : '₹0';
  }

  const hasDecimals = includeDecimals !== undefined ? includeDecimals : amount % 1 !== 0;

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

/**
 * Compact INR formatter for card-friendly display.
 * Examples:
 *   ₹500        → ₹500
 *   ₹50,000     → ₹50K
 *   ₹7,96,500   → ₹7.97L
 *   ₹18,46,500  → ₹18.47L
 *   ₹1,20,00,000 → ₹1.20Cr
 *
 * Full exact values should be shown via formatINR() in tooltips.
 */
export function formatINRCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';

  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000;
    return `${sign}₹${cr.toFixed(2)}Cr`;
  }
  if (abs >= 1_00_000) {
    const lakh = abs / 1_00_000;
    return `${sign}₹${lakh.toFixed(2)}L`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${sign}₹${formatted}K`;
  }

  return `${sign}₹${abs.toLocaleString('en-IN')}`;
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
