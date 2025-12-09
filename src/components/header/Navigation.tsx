import { ArrowRight, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ShoppingBag from "./ShoppingBag";
import LanguageSwitcher from "./LanguageSwitcher";
import CurrencySwitcher from "./CurrencySwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import { useShopifyCart } from "@/hooks/useShopifyCart";

const Navigation = () => {
  const { t, direction } = useLanguage();
  const { cart } = useShopifyCart();
  const totalItems = cart?.totalQuantity || 0;
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShoppingBagOpen, setIsShoppingBagOpen] = useState(false);

  // Preload dropdown images for faster display
  useEffect(() => {
    const imagesToPreload = ["/rings-collection.png", "/earrings-collection.png", "/arcus-bracelet.png", "/span-bracelet.png", "/founders.png"];
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  const popularSearches = [{
    key: "goldRings",
    label: t("goldRings")
  }, {
    key: "silverNecklaces",
    label: t("silverNecklaces")
  }, {
    key: "pearlEarrings",
    label: t("pearlEarrings")
  }, {
    key: "designerBracelets",
    label: t("designerBracelets")
  }, {
    key: "weddingRings",
    label: t("weddingRings")
  }, {
    key: "vintageCollection",
    label: t("vintageCollection")
  }];
  const navItems = [{
    name: t("shop"),
    key: "Shop",
    href: "/category/shop",
    submenuItems: [{
      key: "rings",
      label: t("rings")
    }, {
      key: "necklaces",
      label: t("necklaces")
    }, {
      key: "earrings",
      label: t("earrings")
    }, {
      key: "bracelets",
      label: t("bracelets")
    }, {
      key: "watches",
      label: t("watches")
    }, {
      key: "bags",
      label: t("bags")
    }, {
      key: "travelBags",
      label: t("travelBags")
    }, {
      key: "brands",
      label: t("shopByBrand"),
      isSpecial: true
    }],
    images: [{
      src: "/rings-collection.png",
      alt: "Rings Collection",
      label: t("rings")
    }, {
      src: "/earrings-collection.png",
      alt: "Earrings Collection",
      label: t("earrings")
    }]
  }, {
    name: t("about"),
    key: "About",
    href: "/about/our-story",
    submenuItems: [{
      key: "ourStory",
      label: t("ourStory")
    }, {
      key: "sustainability",
      label: t("sustainability")
    }, {
      key: "sizeGuide",
      label: t("sizeGuide")
    }, {
      key: "customerCare",
      label: t("customerCare")
    }, {
      key: "storeLocator",
      label: t("storeLocator")
    }],
    images: [{
      src: "/founders.png",
      alt: "Company Founders",
      label: t("readOurStory")
    }]
  }];
  const getSubmenuPath = (itemKey: string, subItemKey: string) => {
    if (subItemKey === "brands") {
      return "/brands";
    }
    if (itemKey === "About") {
      const pathMap: Record<string, string> = {
        ourStory: "our-story",
        sustainability: "sustainability",
        sizeGuide: "size-guide",
        customerCare: "customer-care",
        storeLocator: "store-locator"
      };
      return `/about/${pathMap[subItemKey] || subItemKey}`;
    }
    return `/category/${subItemKey.toLowerCase()}`;
  };
  return <nav className="relative" style={{
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)'
  }} dir={direction}>
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
        {/* Mobile hamburger button */}
        <button className="lg:hidden p-1.5 md:p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
          <div className="w-5 h-5 relative">
            <span className={`absolute block w-5 h-px bg-current transform transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 top-2.5' : 'top-1.5'}`}></span>
            <span className={`absolute block w-5 h-px bg-current transform transition-all duration-300 top-2.5 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
            <span className={`absolute block w-5 h-px bg-current transform transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 top-2.5' : 'top-3.5'}`}></span>
          </div>
        </button>

        {/* Left navigation - Hidden on tablets and mobile */}
        <div className={`hidden lg:flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-8`}>
          {navItems.map(item => <div key={item.key} className="relative" onMouseEnter={() => setActiveDropdown(item.key)} onMouseLeave={() => setActiveDropdown(null)}>
              <Link to={item.href} className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-sm font-light py-6 block">
                {item.name}
              </Link>
            </div>)}
        </div>

        {/* Center logo - NOT absolute on mobile */}
        <div className="lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2">
          <Link to="/" className="block">
            <span className="text-lg md:text-xl font-light tracking-widest text-nav-foreground text-center">jWleria</span>
          </Link>
        </div>

        {/* Right icons */}
        <div className={`flex items-center ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-0.5 md:space-x-2`}>
          {/* Currency - hidden on small mobile */}
          <div className="hidden sm:block">
            <CurrencySwitcher />
          </div>
          {/* Language - hidden on small mobile */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <button className="p-1.5 md:p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200" aria-label={t("search")} onClick={() => setIsSearchOpen(!isSearchOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
          <Link to="/favorites" className="hidden lg:block p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200" aria-label={t("favorites")}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </Link>
          <Link to="/account" className="hidden sm:block p-1.5 md:p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200" aria-label={t("account")}>
            <User className="w-5 h-5" />
          </Link>
          <button className="p-1.5 md:p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200 relative" aria-label={t("shoppingBag")} onClick={() => setIsShoppingBagOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[0.6rem] font-medium w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>}
          </button>
        </div>
      </div>

      {/* Full width dropdown */}
      {activeDropdown && <div className="absolute top-full left-0 right-0 bg-nav border-b border-border z-50" onMouseEnter={() => setActiveDropdown(activeDropdown)} onMouseLeave={() => setActiveDropdown(null)}>
          <div className="px-6 py-8">
            <div className={`flex justify-between w-full ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
              {/* Left side - Menu items */}
              <div className="flex-1">
                <ul className="space-y-2">
                   {navItems.find(item => item.key === activeDropdown)?.submenuItems.map((subItem, index) => <li key={index}>
                        <Link to={getSubmenuPath(activeDropdown, subItem.key)} className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-sm font-light block py-2">
                          {subItem.label}
                        </Link>
                      </li>)}
                </ul>
              </div>

              {/* Right side - Images */}
              <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-6`}>
                {navItems.find(item => item.key === activeDropdown)?.images.map((image, index) => {
              // Determine the link destination based on dropdown and image
              let linkTo = "/";
              if (activeDropdown === "Shop") {
                if (image.label === t("rings")) linkTo = "/category/rings";else if (image.label === t("earrings")) linkTo = "/category/earrings";
              } else if (activeDropdown === "New in") {
                if (image.label === "Arcus Bracelet") linkTo = "/product/arcus-bracelet";else if (image.label === "Span Bracelet") linkTo = "/product/span-bracelet";
              } else if (activeDropdown === "About") {
                linkTo = "/about/our-story";
              }
              return <Link key={index} to={linkTo} className="w-[400px] h-[280px] cursor-pointer group relative overflow-hidden block">
                        <img src={image.src} alt={image.alt} className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90" />
                        {(activeDropdown === "Shop" || activeDropdown === "New in" || activeDropdown === "About") && <div className={`absolute bottom-2 ${direction === 'rtl' ? 'right-2' : 'left-2'} text-white text-xs font-light flex items-center gap-1`}>
                            <span>{image.label}</span>
                            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
                          </div>}
                      </Link>;
            })}
              </div>
            </div>
          </div>
        </div>}

      {/* Search overlay */}
      {isSearchOpen && <div className="absolute top-full left-0 right-0 bg-nav border-b border-border z-50">
          <div className="px-6 py-8">
            <div className="max-w-2xl mx-auto">
              {/* Search input */}
              <div className="relative mb-8">
                <div className={`flex items-center border-b border-border pb-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-5 h-5 text-nav-foreground ${direction === 'rtl' ? 'ml-3' : 'mr-3'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input type="text" placeholder={t("searchForJewelry")} className={`flex-1 bg-transparent text-nav-foreground placeholder:text-nav-foreground/60 outline-none text-lg ${direction === 'rtl' ? 'text-right' : ''}`} autoFocus dir={direction} />
                </div>
              </div>

              {/* Popular searches */}
              <div>
                <h3 className={`text-nav-foreground text-sm font-light mb-4 ${direction === 'rtl' ? 'text-right' : ''}`}>{t("popularSearches")}</h3>
                <div className="flex flex-wrap gap-3">
                  {popularSearches.map((search, index) => <button key={index} className="text-nav-foreground hover:text-nav-hover text-sm font-light py-2 px-4 border border-border rounded-full transition-colors duration-200 hover:border-nav-hover">
                      {search.label}
                    </button>)}
                </div>
              </div>
            </div>
          </div>
        </div>}

      {/* Mobile navigation menu */}
      {isMobileMenuOpen && <div className="lg:hidden absolute top-full left-0 right-0 bg-nav border-b border-border z-50 max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-6">
            {/* Currency & Language Switchers for Mobile */}
            <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border sm:hidden">
              <div className="flex-1">
                <span className="text-xs text-nav-foreground/60 block mb-1">
                  {t("currency")}
                </span>
                <CurrencySwitcher />
              </div>
              <div className="flex-1">
                <span className="text-xs text-nav-foreground/60 block mb-1">
                  {t("language")}
                </span>
                <LanguageSwitcher />
              </div>
            </div>
            
            <div className="space-y-4">
              {navItems.map((item, index) => <div key={item.key}>
                  <Link to={item.href} className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-base font-light block py-1.5" onClick={() => setIsMobileMenuOpen(false)}>
                    {item.name}
                  </Link>
                   <div className={`mt-2 ${direction === 'rtl' ? 'pr-4' : 'pl-4'} space-y-1.5`}>
                     {item.submenuItems.map((subItem, subIndex) => <Link key={subIndex} to={getSubmenuPath(item.key, subItem.key)} className="text-nav-foreground/70 hover:text-nav-hover text-sm font-light block py-1" onClick={() => setIsMobileMenuOpen(false)}>
                         {subItem.label}
                       </Link>)}
                   </div>
                </div>)}
            </div>
            
            {/* Favorites Button for Mobile */}
            <div className="mt-6 pt-4 border-t border-border">
              <Link to="/favorites" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-base font-light py-1.5 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                <span>{t("favorites")}</span>
              </Link>
            </div>
          </div>
        </div>}

      {/* Shopping Bag Off-Canvas */}
      <ShoppingBag isOpen={isShoppingBagOpen} onClose={() => setIsShoppingBagOpen(false)} onViewFavorites={() => {
      setIsShoppingBagOpen(false);
    }} />
    </nav>;
};
export default Navigation;