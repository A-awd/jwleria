import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAriaLive } from '@/components/ui/AriaLiveRegion';
import { useLanguage } from '@/i18n/LanguageContext';

interface FavoritesContextType {
  favorites: number[];
  addToFavorites: (productId: number) => void;
  removeFromFavorites: (productId: number) => void;
  toggleFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'jwleria_favorites';

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();
  
  // Try to use AriaLive, but handle case where it's not available yet
  let announce: ((message: string, priority?: "polite" | "assertive") => void) | undefined;
  try {
    const ariaLive = useAriaLive();
    announce = ariaLive.announce;
  } catch {
    // AriaLive not available (during initial render), will use fallback
  }

  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addToFavorites = (productId: number) => {
    setFavorites(prev => {
      if (prev.includes(productId)) return prev;
      announce?.(t("addedToFavorites"), "polite");
      return [...prev, productId];
    });
  };

  const removeFromFavorites = (productId: number) => {
    setFavorites(prev => {
      announce?.(t("removedFromFavorites"), "polite");
      return prev.filter(id => id !== productId);
    });
  };

  const toggleFavorite = (productId: number) => {
    if (favorites.includes(productId)) {
      removeFromFavorites(productId);
    } else {
      addToFavorites(productId);
    }
  };

  const isFavorite = (productId: number) => favorites.includes(productId);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addToFavorites,
      removeFromFavorites,
      toggleFavorite,
      isFavorite,
      favoritesCount: favorites.length,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
