// Preserve stored login addresses, including legacy identifiers without a dot
// in the domain. Supabase validates the actual account and its password.
export function normalizeLoginIdentifier(input: string): string {
  const cleaned = input.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').toLowerCase();
  return cleaned && !cleaned.includes('@') ? `${cleaned}@time2trade.com` : cleaned;
}

export function isLoginIdentifier(input: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(input);
}
