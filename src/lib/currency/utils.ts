// src/lib/currency/utils.ts
import { getCurrency, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from './config'

interface ExchangeRateResponse {
  success: boolean
  base: string
  date: string
  rates: Record<string, number>
}

interface CurrencyConversionResult {
  amount: number
  fromCurrency: string
  toCurrency: string
  rate: number
  convertedAmount: number
  timestamp: Date
}

// Cache for exchange rates
let rateCache: {
  rates: Record<string, number>
  lastFetch: Date
  baseCurrency: string
} | null = null

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

/**
 * Fetch real-time exchange rates from multiple providers
 */
export async function fetchExchangeRates(baseCurrency: string = 'INR'): Promise<Record<string, number>> {
  try {
    // Try primary API (ExchangeRate-API)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)
    
    if (response.ok) {
      const data: ExchangeRateResponse = await response.json()
      return data.rates
    }
  } catch (error) {
    console.warn('Primary exchange rate API failed:', error)
  }

  try {
    // Fallback to Fixer.io (requires API key)
    const apiKey = process.env.FIXER_API_KEY
    if (apiKey) {
      const response = await fetch(`https://api.fixer.io/latest?access_key=${apiKey}&base=${baseCurrency}`)
      const data = await response.json()
      if (data.success) {
        return data.rates
      }
    }
  } catch (error) {
    console.warn('Fixer.io API failed:', error)
  }

  // Return fallback rates from config
  const fallbackRates: Record<string, number> = {}
  Object.entries(SUPPORTED_CURRENCIES).forEach(([code, config]) => {
    if (config.exchangeRate) {
      fallbackRates[code] = baseCurrency === 'INR' ? config.exchangeRate : 1 / config.exchangeRate
    }
  })
  
  return fallbackRates
}

/**
 * Get cached or fetch fresh exchange rates
 */
export async function getExchangeRates(baseCurrency: string = 'INR', forceRefresh: boolean = false): Promise<Record<string, number>> {
  const now = new Date()
  
  // Return cached rates if valid
  if (!forceRefresh && rateCache && 
      rateCache.baseCurrency === baseCurrency && 
      (now.getTime() - rateCache.lastFetch.getTime()) < CACHE_DURATION) {
    return rateCache.rates
  }

  // Fetch fresh rates
  const rates = await fetchExchangeRates(baseCurrency)
  
  // Update cache
  rateCache = {
    rates,
    lastFetch: now,
    baseCurrency
  }
  
  return rates
}

/**
 * Convert amount between currencies with real-time rates
 */
export async function convertCurrencyLive(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  useCache: boolean = true
): Promise<CurrencyConversionResult> {
  if (fromCurrency === toCurrency) {
    return {
      amount,
      fromCurrency,
      toCurrency,
      rate: 1,
      convertedAmount: amount,
      timestamp: new Date()
    }
  }

  const rates = await getExchangeRates('INR', !useCache)
  
  let convertedAmount: number
  let rate: number

  if (fromCurrency === 'INR') {
    rate = rates[toCurrency] || 1
    convertedAmount = amount * rate
  } else if (toCurrency === 'INR') {
    rate = 1 / (rates[fromCurrency] || 1)
    convertedAmount = amount * rate
  } else {
    // Convert through INR
    const toINRRate = 1 / (rates[fromCurrency] || 1)
    const fromINRRate = rates[toCurrency] || 1
    rate = toINRRate * fromINRRate
    convertedAmount = amount * rate
  }

  return {
    amount,
    fromCurrency,
    toCurrency,
    rate,
    convertedAmount,
    timestamp: new Date()
  }
}

/**
 * Format currency for Indian locale with support for other currencies
 */
export function formatCurrencyLocale(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = 'en-IN',
  options: Intl.NumberFormatOptions = {}
): string {
  const currency = getCurrency(currencyCode)
  if (!currency) return amount.toString()

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
    ...options
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount)
  } catch (error) {
    // Fallback to manual formatting
    return `${currency.symbol}${amount.toFixed(currency.decimals)}`
  }
}

/**
 * Parse currency string to number
 */
export function parseCurrencyString(currencyString: string, currencyCode: string = DEFAULT_CURRENCY): number {
  const currency = getCurrency(currencyCode)
  if (!currency) return 0

  // Remove currency symbol and separators
  let cleanString = currencyString
    .replace(new RegExp(`\\${currency.symbol}`, 'g'), '')
    .replace(new RegExp(`\\${currency.thousandsSeparator}`, 'g'), '')
    .replace(currency.decimalSeparator, '.')
    .trim()

  const parsed = parseFloat(cleanString)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Get currency display info for UI components
 */
export function getCurrencyDisplayInfo(currencyCode: string) {
  const currency = getCurrency(currencyCode)
  if (!currency) return null

  return {
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    flag: getCurrencyFlag(currencyCode),
    formatting: {
      decimals: currency.decimals,
      symbolPosition: currency.symbolPosition,
      thousandsSeparator: currency.thousandsSeparator,
      decimalSeparator: currency.decimalSeparator
    }
  }
}

/**
 * Get currency flag emoji
 */
function getCurrencyFlag(currencyCode: string): string {
  const flags: Record<string, string> = {
    INR: '🇮🇳',
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
    AUD: '🇦🇺',
    CAD: '🇨🇦',
    CHF: '🇨🇭',
    CNY: '🇨🇳',
    SGD: '🇸🇬'
  }
  return flags[currencyCode] || '💱'
}

/**
 * Validate currency amount
 */
export function validateCurrencyAmount(amount: number, currencyCode: string): { valid: boolean; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' }
  }

  if (amount < 0) {
    return { valid: false, error: 'Amount cannot be negative' }
  }

  const currency = getCurrency(currencyCode)
  if (!currency) {
    return { valid: false, error: `Unsupported currency: ${currencyCode}` }
  }

  // Check precision
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > currency.decimals) {
    return { valid: false, error: `Amount has too many decimal places for ${currencyCode}` }
  }

  return { valid: true }
}

/**
 * Round amount to currency precision
 */
export function roundToCurrencyPrecision(amount: number, currencyCode: string): number {
  const currency = getCurrency(currencyCode)
  if (!currency) return amount

  const factor = Math.pow(10, currency.decimals)
  return Math.round(amount * factor) / factor
}

/**
 * Get supported currencies for region
 */
export function getCurrenciesForRegion(countryCode?: string): typeof SUPPORTED_CURRENCIES[string][] {
  if (!countryCode) {
    return Object.values(SUPPORTED_CURRENCIES).filter(c => c.popular)
  }

  const regionCurrencies = Object.values(SUPPORTED_CURRENCIES).filter(currency =>
    currency.country.includes(countryCode.toUpperCase())
  )

  return regionCurrencies.length > 0 ? regionCurrencies : Object.values(SUPPORTED_CURRENCIES).filter(c => c.popular)
}

/**
 * Shopify-specific currency utilities
 */
export class ShopifyCurrencyUtils {
  /**
   * Get Shopify store currency from shop data
   */
  static extractStoreCurrency(shopData: any): string {
    return shopData?.currency || shopData?.shop?.currency || 'INR'
  }

  /**
   * Format price for Shopify API
   */
  static formatForShopifyAPI(amount: number, currencyCode: string): string {
    const currency = getCurrency(currencyCode)
    if (!currency) return amount.toString()

    return amount.toFixed(currency.decimals)
  }

  /**
   * Convert Shopify price string to number
   */
  static parseShopifyPrice(priceString: string): number {
    const parsed = parseFloat(priceString)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Get currency conversion rate for Shopify orders
   */
  static async getShopifyConversionRate(
    fromCurrency: string,
    toCurrency: string = 'INR'
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1

    try {
      const result = await convertCurrencyLive(1, fromCurrency, toCurrency)
      return result.rate
    } catch (error) {
      console.warn('Failed to get live conversion rate, using fallback')
      const fromConfig = getCurrency(fromCurrency)
      const toConfig = getCurrency(toCurrency)
      
      if (fromConfig?.exchangeRate && toConfig?.exchangeRate) {
        return toConfig.exchangeRate / fromConfig.exchangeRate
      }
      
      return 1
    }
  }
}

/**
 * Currency analytics utilities
 */
export class CurrencyAnalytics {
  /**
   * Calculate revenue by currency
   */
  static calculateRevenueByCurrency(
    orders: Array<{ amount: number; currency: string; date: Date }>
  ): Record<string, { amount: number; count: number }> {
    const result: Record<string, { amount: number; count: number }> = {}
    
    orders.forEach(order => {
      if (!result[order.currency]) {
        result[order.currency] = { amount: 0, count: 0 }
      }
      result[order.currency].amount += order.amount
      result[order.currency].count += 1
    })
    
    return result
  }

  /**
   * Convert multi-currency revenue to base currency
   */
  static async convertMultiCurrencyRevenue(
    revenueData: Record<string, number>,
    baseCurrency: string = 'INR'
  ): Promise<{ totalRevenue: number; conversions: Record<string, { original: number; converted: number; rate: number }> }> {
    const conversions: Record<string, { original: number; converted: number; rate: number }> = {}
    let totalRevenue = 0

    for (const [currency, amount] of Object.entries(revenueData)) {
      if (currency === baseCurrency) {
        conversions[currency] = { original: amount, converted: amount, rate: 1 }
        totalRevenue += amount
      } else {
        try {
          const result = await convertCurrencyLive(amount, currency, baseCurrency)
          conversions[currency] = {
            original: amount,
            converted: result.convertedAmount,
            rate: result.rate
          }
          totalRevenue += result.convertedAmount
        } catch (error) {
          console.warn(`Failed to convert ${currency} to ${baseCurrency}`)
          conversions[currency] = { original: amount, converted: amount, rate: 1 }
          totalRevenue += amount
        }
      }
    }

    return { totalRevenue, conversions }
  }
}