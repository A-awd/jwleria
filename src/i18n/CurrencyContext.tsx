import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Currency, 
  defaultCurrencies, 
  formatPrice, 
  parseEuroPrice, 
  fetchExchangeRates,
  updateCurrenciesWithRates 
} from './currencies';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInEUR: string | number) => string;
  currencies: Currency[];
  lastUpdated: string | null;
  isLoading: boolean;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedRates {
  rates: Record<string, number>;
  date: string;
  timestamp: number;
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currencies, setCurrencies] = useState<Currency[]>(defaultCurrencies);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('currency');
    if (saved) {
      const found = defaultCurrencies.find(c => c.code === saved);
      if (found) return found;
    }
    return defaultCurrencies[0]; // Default to USD
  });

  const loadRatesFromCache = (): CachedRates | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedRates = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_DURATION) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading cached rates:', error);
    }
    return null;
  };

  const saveRatesToCache = (rates: Record<string, number>, date: string) => {
    try {
      const cacheData: CachedRates = {
        rates,
        date,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving rates to cache:', error);
    }
  };

  const refreshRates = async () => {
    setIsLoading(true);
    try {
      const result = await fetchExchangeRates();
      if (result) {
        const updatedCurrencies = updateCurrenciesWithRates(defaultCurrencies, result.rates);
        setCurrencies(updatedCurrencies);
        setLastUpdated(result.date);
        saveRatesToCache(result.rates, result.date);
        
        // Update current currency with new rate
        const updatedCurrent = updatedCurrencies.find(c => c.code === currency.code);
        if (updatedCurrent) {
          setCurrencyState(updatedCurrent);
        }
      }
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load rates on mount
  useEffect(() => {
    const initializeRates = async () => {
      // First try to load from cache
      const cached = loadRatesFromCache();
      if (cached) {
        const updatedCurrencies = updateCurrenciesWithRates(defaultCurrencies, cached.rates);
        setCurrencies(updatedCurrencies);
        setLastUpdated(cached.date);
        
        // Update current currency with cached rate
        const updatedCurrent = updatedCurrencies.find(c => c.code === currency.code);
        if (updatedCurrent) {
          setCurrencyState(updatedCurrent);
        }
      }
      
      // Then fetch fresh rates in background
      await refreshRates();
    };

    initializeRates();
  }, []);

  const setCurrency = (curr: Currency) => {
    // Find the currency with updated rate
    const updatedCurrency = currencies.find(c => c.code === curr.code) || curr;
    setCurrencyState(updatedCurrency);
    localStorage.setItem('currency', curr.code);
  };

  const convertPrice = (priceInEUR: string | number): string => {
    const numericPrice = typeof priceInEUR === 'string' 
      ? parseEuroPrice(priceInEUR) 
      : priceInEUR;
    return formatPrice(numericPrice, currency);
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      convertPrice, 
      currencies,
      lastUpdated,
      isLoading,
      refreshRates
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
