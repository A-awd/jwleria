export type Currency = {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate relative to EUR
};

// Default rates (fallback if API fails)
export const defaultCurrencies: Currency[] = [
  // Major Global Currencies
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.09 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 1 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.86 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 163.50 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rate: 0.96 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.90 },
  
  // Gulf Currencies
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', rate: 4.09 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 4.00 },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', rate: 0.33 },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', rate: 3.97 },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', rate: 0.41 },
  { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', rate: 0.42 },
];

export const formatPrice = (priceInEUR: number, currency: Currency): string => {
  // Convert from EUR to target currency
  const convertedPrice = priceInEUR * currency.rate;
  
  // Format based on currency
  if (['JPY', 'CNY'].includes(currency.code)) {
    return `${currency.symbol}${Math.round(convertedPrice).toLocaleString()}`;
  }
  
  if (['SAR', 'AED', 'QAR', 'OMR'].includes(currency.code)) {
    return `${convertedPrice.toFixed(2)} ${currency.symbol}`;
  }
  
  if (['KWD', 'BHD'].includes(currency.code)) {
    return `${convertedPrice.toFixed(3)} ${currency.symbol}`;
  }
  
  return `${currency.symbol}${convertedPrice.toFixed(2)}`;
};

export const parseEuroPrice = (priceString: string): number => {
  // Extract numeric value from price string like "€2,850"
  const numericString = priceString.replace(/[^0-9.]/g, '');
  return parseFloat(numericString) || 0;
};

// Frankfurter API - free, no API key required
const EXCHANGE_API_URL = 'https://api.frankfurter.app/latest?from=EUR';

export interface ExchangeRatesResponse {
  rates: Record<string, number>;
  date: string;
}

export const fetchExchangeRates = async (): Promise<ExchangeRatesResponse | null> => {
  try {
    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    const data = await response.json();
    return {
      rates: { EUR: 1, ...data.rates },
      date: data.date
    };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
};

// Gulf currencies are not available in Frankfurter API, so we use fixed rates
const gulfFixedRates: Record<string, number> = {
  SAR: 4.09,  // Saudi Riyal
  AED: 4.00,  // UAE Dirham
  KWD: 0.33,  // Kuwaiti Dinar
  QAR: 3.97,  // Qatari Riyal
  BHD: 0.41,  // Bahraini Dinar
  OMR: 0.42,  // Omani Rial
};

export const updateCurrenciesWithRates = (
  currencies: Currency[], 
  rates: Record<string, number>
): Currency[] => {
  return currencies.map(currency => {
    // Check if rate exists in API response
    if (rates[currency.code] !== undefined) {
      return { ...currency, rate: rates[currency.code] };
    }
    // Use fixed rates for Gulf currencies
    if (gulfFixedRates[currency.code] !== undefined) {
      return { ...currency, rate: gulfFixedRates[currency.code] };
    }
    // Keep default rate if not found
    return currency;
  });
};
