export type Currency = {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate relative to USD
};

export const currencies: Currency[] = [
  // Major Global Currencies
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 149.50 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rate: 0.88 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.24 },
  
  // Gulf Currencies
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', rate: 3.75 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', rate: 0.31 },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', rate: 3.64 },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', rate: 0.38 },
  { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', rate: 0.38 },
];

export const formatPrice = (priceInEUR: number, currency: Currency): string => {
  // Convert from EUR to USD first, then to target currency
  const priceInUSD = priceInEUR / 0.92;
  const convertedPrice = priceInUSD * currency.rate;
  
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
