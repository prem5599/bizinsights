// src/lib/currency/config.ts

export interface CurrencyConfig {
  code: string
  name: string
  symbol: string
  decimals: number
  symbolPosition: 'before' | 'after'
  thousandsSeparator: string
  decimalSeparator: string
  shopifyCode: string
  country: string[]
  popular: boolean
  exchangeRate?: number // Base rate from INR
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'INR',
    country: ['IN'],
    popular: true,
    exchangeRate: 1 // Base currency
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'USD',
    country: ['US'],
    popular: true,
    exchangeRate: 0.012 // Approximate rate (1 INR = 0.012 USD)
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    shopifyCode: 'EUR',
    country: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'GR'],
    popular: true,
    exchangeRate: 0.011 // Approximate rate
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'GBP',
    country: ['GB'],
    popular: true,
    exchangeRate: 0.0095 // Approximate rate
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimals: 0,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'JPY',
    country: ['JP'],
    popular: true,
    exchangeRate: 1.8 // Approximate rate
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'AUD',
    country: ['AU'],
    popular: true,
    exchangeRate: 0.018 // Approximate rate
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'CAD',
    country: ['CA'],
    popular: true,
    exchangeRate: 0.016 // Approximate rate
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimals: 2,
    symbolPosition: 'after',
    thousandsSeparator: "'",
    decimalSeparator: '.',
    shopifyCode: 'CHF',
    country: ['CH'],
    popular: true,
    exchangeRate: 0.011 // Approximate rate
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'CNY',
    country: ['CN'],
    popular: true,
    exchangeRate: 0.086 // Approximate rate
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    shopifyCode: 'SGD',
    country: ['SG'],
    popular: true,
    exchangeRate: 0.016 // Approximate rate
  }
}

// Default currency for Indian-based accounts
export const DEFAULT_CURRENCY = 'INR'

// Popular currencies to show first in dropdowns
export const POPULAR_CURRENCIES = Object.values(SUPPORTED_CURRENCIES)
  .filter(currency => currency.popular)
  .sort((a, b) => {
    // INR first, then alphabetical
    if (a.code === 'INR') return -1
    if (b.code === 'INR') return 1
    return a.name.localeCompare(b.name)
  })

// Get currency options for select dropdowns
export function getCurrencyOptions() {
  return POPULAR_CURRENCIES.map(currency => ({
    value: currency.code,
    label: `${currency.code} (${currency.symbol}) - ${currency.name}`,
    symbol: currency.symbol,
    name: currency.name
  }))
}

// Get currency by code
export function getCurrency(code: string): CurrencyConfig | null {
  return SUPPORTED_CURRENCIES[code.toUpperCase()] || null
}

// Format amount according to currency rules
export function formatCurrency(
  amount: number, 
  currencyCode: string = DEFAULT_CURRENCY,
  options: {
    showSymbol?: boolean
    showCode?: boolean
    precision?: number
  } = {}
): string {
  const currency = getCurrency(currencyCode)
  if (!currency) return amount.toString()

  const {
    showSymbol = true,
    showCode = false,
    precision = currency.decimals
  } = options

  // Format number with proper separators
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    useGrouping: true
  }).format(amount)

  // Build formatted string
  let formatted = formattedNumber

  if (showSymbol) {
    formatted = currency.symbolPosition === 'before' 
      ? `${currency.symbol}${formatted}`
      : `${formatted} ${currency.symbol}`
  }

  if (showCode) {
    formatted = `${formatted} ${currency.code}`
  }

  return formatted
}

// Convert between currencies (requires exchange rates)
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates?: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount

  const fromConfig = getCurrency(fromCurrency)
  const toConfig = getCurrency(toCurrency)

  if (!fromConfig || !toConfig) {
    throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`)
  }

  // Use provided exchange rates or fallback to config rates
  const rates = exchangeRates || {}
  const fromRate = rates[fromCurrency] || fromConfig.exchangeRate || 1
  const toRate = rates[toCurrency] || toConfig.exchangeRate || 1

  // Convert through INR as base currency
  if (fromCurrency === 'INR') {
    return amount * toRate
  } else if (toCurrency === 'INR') {
    return amount / fromRate
  } else {
    // Convert from -> INR -> to
    const inrAmount = amount / fromRate
    return inrAmount * toRate
  }
}

// Validate currency code
export function isValidCurrency(code: string): boolean {
  return code.toUpperCase() in SUPPORTED_CURRENCIES
}

// Get Shopify-compatible currency code
export function getShopifyCurrencyCode(code: string): string {
  const currency = getCurrency(code)
  return currency?.shopifyCode || code.toUpperCase()
}

// Exchange rate cache
interface ExchangeRateCache {
  rates: Record<string, number>
  lastUpdated: Date
  baseCurrency: string
}

let exchangeRateCache: ExchangeRateCache | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour