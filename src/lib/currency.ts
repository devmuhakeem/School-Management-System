/**
 * Centralized Financial & Currency Handling Utility
 *
 * Enforces strict 2-decimal precision, currency formatting, and floating-point
 * rounding safety for all school billing, invoicing, payments, and receipts.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", decimals: 2 },
  AUD: { code: "AUD", symbol: "AU$", name: "Australian Dollar", decimals: 2 },
  GHS: { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi", decimals: 2 },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling", decimals: 2 },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", decimals: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2 },
};

export const DEFAULT_CURRENCY = "USD";

/**
 * Rounds a number to exactly two decimal places using integer cents/kobo representation
 * to eliminate JavaScript IEEE-754 floating-point drift.
 */
export function roundMoney(amount: number | string): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Safe addition of monetary values
 */
export function addMoney(a: number | string, b: number | string): number {
  const centA = Math.round((Number(a) || 0) * 100);
  const centB = Math.round((Number(b) || 0) * 100);
  return (centA + centB) / 100;
}

/**
 * Safe subtraction of monetary values (returns 0 minimum if non-negative requested)
 */
export function subtractMoney(a: number | string, b: number | string, allowNegative = false): number {
  const centA = Math.round((Number(a) || 0) * 100);
  const centB = Math.round((Number(b) || 0) * 100);
  const result = (centA - centB) / 100;
  return allowNegative ? result : Math.max(0, result);
}

/**
 * Safe multiplication of a monetary amount by a scalar (e.g. quantity or factor)
 */
export function multiplyMoney(amount: number | string, multiplier: number | string): number {
  const cents = Math.round((Number(amount) || 0) * 100);
  const mult = Number(multiplier) || 0;
  return Math.round(cents * mult) / 100;
}

/**
 * Calculates a percentage discount or fee portion rounded safely
 */
export function calculatePercentage(total: number | string, percent: number | string): number {
  const numTotal = Number(total) || 0;
  const numPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  return roundMoney((numTotal * numPercent) / 100);
}

/**
 * Parses monetary input safely
 */
export function parseMoney(value: unknown): number {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : roundMoney(value);
  }
  if (typeof value === "string") {
    // Strip currency symbols and commas
    const clean = value.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : roundMoney(parsed);
  }
  return 0;
}

/**
 * Formats a monetary number into a localized, human-friendly currency string
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode = DEFAULT_CURRENCY,
  locale = "en-US"
): string {
  if (amount === null || amount === undefined) {
    return formatCurrency(0, currencyCode, locale);
  }

  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  const safeNum = isNaN(num) ? 0 : roundMoney(num);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeNum);
  } catch {
    // Fallback if currency code or locale is unsupported
    const config = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()] || { symbol: currencyCode + " " };
    return `${config.symbol}${safeNum.toFixed(2)}`;
  }
}
