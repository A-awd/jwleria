import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Currency, currencies, formatPrice, parseEuroPrice } from './currencies';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInEUR: string | number) => string;
  currencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('currency');
    if (saved) {
      const found = currencies.find(c => c.code === saved);
      if (found) return found;
    }
    return currencies[0]; // Default to USD
  });

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('currency', curr.code);
  };

  const convertPrice = (priceInEUR: string | number): string => {
    const numericPrice = typeof priceInEUR === 'string' 
      ? parseEuroPrice(priceInEUR) 
      : priceInEUR;
    return formatPrice(numericPrice, currency);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, currencies }}>
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
