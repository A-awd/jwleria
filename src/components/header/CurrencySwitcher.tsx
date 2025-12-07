import { DollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

const CurrencySwitcher = () => {
  const { currency, setCurrency, currencies } = useCurrency();
  const { direction } = useLanguage();

  // Split currencies into global and gulf
  const globalCurrencies = currencies.slice(0, 6);
  const gulfCurrencies = currencies.slice(6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200 flex items-center gap-1"
          aria-label="Change currency"
        >
          <span className="text-xs font-medium">{currency.code}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] bg-background border border-border shadow-lg z-50">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-light">
          {direction === 'rtl' ? 'العملات العالمية' : 'Global'}
        </DropdownMenuLabel>
        {globalCurrencies.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => setCurrency(curr)}
            className={`cursor-pointer ${currency.code === curr.code ? 'bg-muted' : ''}`}
          >
            <span className="font-light flex items-center justify-between w-full">
              <span>{curr.symbol} {curr.code}</span>
              <span className="text-xs text-muted-foreground">{curr.name}</span>
            </span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground font-light">
          {direction === 'rtl' ? 'العملات الخليجية' : 'Gulf'}
        </DropdownMenuLabel>
        {gulfCurrencies.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => setCurrency(curr)}
            className={`cursor-pointer ${currency.code === curr.code ? 'bg-muted' : ''}`}
          >
            <span className="font-light flex items-center justify-between w-full">
              <span>{curr.symbol} {curr.code}</span>
              <span className="text-xs text-muted-foreground">{curr.name}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CurrencySwitcher;
