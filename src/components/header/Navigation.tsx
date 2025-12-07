import { ArrowRight, X, Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ShoppingBag from "./ShoppingBag";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import pantheonImage from "@/assets/pantheon.jpg";
import eclipseImage from "@/assets/eclipse.jpg";
import haloImage from "@/assets/halo.jpg";

interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
  category: string;
}

const Navigation = () => {
  const { t, direction } = useLanguage();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [offCanvasType, setOffCanvasType] = useState<'favorites' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShoppingBagOpen, setIsShoppingBagOpen] = useState(false);
  
  // Shopping bag state with 3 mock items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: "Pantheon",
      price: "€2,850",
      image: pantheonImage,
      quantity: 1,
      category: "Earrings"
    },
    {
      id: 2,
      name: "Eclipse",
      price: "€3,200", 
      image: eclipseImage,
      quantity: 1,
      category: "Bracelets"
    },
    {
      id: 3,
      name: "Halo",
      price: "€1,950",
      image: haloImage, 
      quantity: 1,
      category: "Earrings"
    }
  ]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== id));
    } else {
      setCartItems(items => 
        items.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };
  
  // Preload dropdown images for faster display
  useEffect(() => {
    const imagesToPreload = [
      "/rings-collection.png",
      "/earrings-collection.png", 
      "/arcus-bracelet.png",
      "/span-bracelet.png",
      "/founders.png"
    ];
    
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const popularSearches = [
    { key: "goldRings", label: t("goldRings") },
    { key: "silverNecklaces", label: t("silverNecklaces") },
    { key: "pearlEarrings", label: t("pearlEarrings") },
    { key: "designerBracelets", label: t("designerBracelets") },
    { key: "weddingRings", label: t("weddingRings") },
    { key: "vintageCollection", label: t("vintageCollection") }
  ];
  
  const navItems = [
    { 
      name: t("shop"), 
      key: "Shop",
      href: "/category/shop",
      submenuItems: [
        { key: "rings", label: t("rings") },
        { key: "necklaces", label: t("necklaces") },
        { key: "earrings", label: t("earrings") },
        { key: "bracelets", label: t("bracelets") },
        { key: "watches", label: t("watches") }
      ],
      images: [
        { src: "/rings-collection.png", alt: "Rings Collection", label: t("rings") },
        { src: "/earrings-collection.png", alt: "Earrings Collection", label: t("earrings") }
      ]
    },
    { 
      name: t("newIn"), 
      key: "New in",
      href: "/category/new-in",
      submenuItems: [
        { key: "thisWeeksArrivals", label: t("thisWeeksArrivals") },
        { key: "springCollection", label: t("springCollection") },
        { key: "featuredDesigners", label: t("featuredDesigners") },
        { key: "limitedEdition", label: t("limitedEdition") },
        { key: "preOrders", label: t("preOrders") }
      ],
      images: [
        { src: "/arcus-bracelet.png", alt: "Arcus Bracelet", label: "Arcus Bracelet" },
        { src: "/span-bracelet.png", alt: "Span Bracelet", label: "Span Bracelet" }
      ]
    },
    { 
      name: t("about"), 
      key: "About",
      href: "/about/our-story",
      submenuItems: [
        { key: "ourStory", label: t("ourStory") },
        { key: "sustainability", label: t("sustainability") },
        { key: "sizeGuide", label: t("sizeGuide") },
        { key: "customerCare", label: t("customerCare") },
        { key: "storeLocator", label: t("storeLocator") }
      ],
      images: [
        { src: "/founders.png", alt: "Company Founders", label: t("readOurStory") }
      ]
    }
  ];

  const getSubmenuPath = (itemKey: string, subItemKey: string) => {
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

  return (
    <nav 
      className="relative" 
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)'
      }}
      dir={direction}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Mobile hamburger button */}
        <button
          className="lg:hidden p-2 mt-0.5 text-nav-foreground hover:text-nav-hover transition-colors duration-200"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 h-5 relative">
            <span className={`absolute block w-5 h-px bg-current transform transition-all duration-300 ${
              isMobileMenuOpen ? 'rotate-45 top-2.5' : 'top-1.5'
            }`}></span>
            <span className={`absolute block w-5 h-px bg-current transform transition-all duration-300 top-2.5 ${
              isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}></span>
            <span className={`absolute block w-5 h-px bg-current transform transition-all duration-300 ${
              isMobileMenuOpen ? '-rotate-45 top-2.5' : 'top-3.5'
            }`}></span>
          </div>
        </button>

        {/* Left navigation - Hidden on tablets and mobile */}
        <div className={`hidden lg:flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-8`}>
          {navItems.map((item) => (
            <div
              key={item.key}
              className="relative"
              onMouseEnter={() => setActiveDropdown(item.key)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to={item.href}
                className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-sm font-light py-6 block"
              >
                {item.name}
              </Link>
            </div>
          ))}
        </div>

        {/* Center logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <Link to="/" className="block">
            <span className="text-xl font-light tracking-widest text-nav-foreground">jWleria</span>
          </Link>
        </div>

        {/* Right icons */}
        <div className={`flex items-center ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-2`}>
          <LanguageSwitcher />
          <button 
            className="p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200"
            aria-label={t("search")}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
          <button 
            className="hidden lg:block p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200"
            aria-label={t("favorites")}
            onClick={() => setOffCanvasType('favorites')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
          <button 
            className="p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200 relative"
            aria-label={t("shoppingBag")}
            onClick={() => setIsShoppingBagOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[30%] text-[0.5rem] font-semibold text-black pointer-events-none">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Full width dropdown */}
      {activeDropdown && (
        <div 
          className="absolute top-full left-0 right-0 bg-nav border-b border-border z-50"
          onMouseEnter={() => setActiveDropdown(activeDropdown)}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className="px-6 py-8">
            <div className={`flex justify-between w-full ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
              {/* Left side - Menu items */}
              <div className="flex-1">
                <ul className="space-y-2">
                   {navItems
                     .find(item => item.key === activeDropdown)
                     ?.submenuItems.map((subItem, index) => (
                      <li key={index}>
                        <Link 
                          to={getSubmenuPath(activeDropdown, subItem.key)}
                          className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-sm font-light block py-2"
                        >
                          {subItem.label}
                        </Link>
                      </li>
                   ))}
                </ul>
              </div>

              {/* Right side - Images */}
              <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-6`}>
                {navItems
                  .find(item => item.key === activeDropdown)
                  ?.images.map((image, index) => {
                    // Determine the link destination based on dropdown and image
                    let linkTo = "/";
                    if (activeDropdown === "Shop") {
                      if (image.label === t("rings")) linkTo = "/category/rings";
                      else if (image.label === t("earrings")) linkTo = "/category/earrings";
                    } else if (activeDropdown === "New in") {
                      if (image.label === "Arcus Bracelet") linkTo = "/product/arcus-bracelet";
                      else if (image.label === "Span Bracelet") linkTo = "/product/span-bracelet";
                    } else if (activeDropdown === "About") {
                      linkTo = "/about/our-story";
                    }
                    
                    return (
                      <Link key={index} to={linkTo} className="w-[400px] h-[280px] cursor-pointer group relative overflow-hidden block">
                        <img 
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                        />
                        {(activeDropdown === "Shop" || activeDropdown === "New in" || activeDropdown === "About") && (
                          <div className={`absolute bottom-2 ${direction === 'rtl' ? 'right-2' : 'left-2'} text-white text-xs font-light flex items-center gap-1`}>
                            <span>{image.label}</span>
                            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
                          </div>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {isSearchOpen && (
        <div 
          className="absolute top-full left-0 right-0 bg-nav border-b border-border z-50"
        >
          <div className="px-6 py-8">
            <div className="max-w-2xl mx-auto">
              {/* Search input */}
              <div className="relative mb-8">
                <div className={`flex items-center border-b border-border pb-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-5 h-5 text-nav-foreground ${direction === 'rtl' ? 'ml-3' : 'mr-3'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t("searchForJewelry")}
                    className={`flex-1 bg-transparent text-nav-foreground placeholder:text-nav-foreground/60 outline-none text-lg ${direction === 'rtl' ? 'text-right' : ''}`}
                    autoFocus
                    dir={direction}
                  />
                </div>
              </div>

              {/* Popular searches */}
              <div>
                <h3 className={`text-nav-foreground text-sm font-light mb-4 ${direction === 'rtl' ? 'text-right' : ''}`}>{t("popularSearches")}</h3>
                <div className="flex flex-wrap gap-3">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      className="text-nav-foreground hover:text-nav-hover text-sm font-light py-2 px-4 border border-border rounded-full transition-colors duration-200 hover:border-nav-hover"
                    >
                      {search.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile navigation menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-nav border-b border-border z-50">
          <div className="px-6 py-8">
            <div className="space-y-6">
              {navItems.map((item, index) => (
                <div key={item.key}>
                  <Link
                    to={item.href}
                    className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-lg font-light block py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                   <div className={`mt-3 ${direction === 'rtl' ? 'pr-4' : 'pl-4'} space-y-2`}>
                     {item.submenuItems.map((subItem, subIndex) => (
                       <Link
                         key={subIndex}
                         to={getSubmenuPath(item.key, subItem.key)}
                         className="text-nav-foreground/70 hover:text-nav-hover text-sm font-light block py-1"
                         onClick={() => setIsMobileMenuOpen(false)}
                       >
                         {subItem.label}
                       </Link>
                     ))}
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Shopping Bag Component */}
      <ShoppingBag 
        isOpen={isShoppingBagOpen}
        onClose={() => setIsShoppingBagOpen(false)}
        cartItems={cartItems}
        updateQuantity={updateQuantity}
        onViewFavorites={() => {
          setIsShoppingBagOpen(false);
          setOffCanvasType('favorites');
        }}
      />
      
      {/* Favorites Off-canvas overlay */}
      {offCanvasType === 'favorites' && (
        <div className="fixed inset-0 z-50 h-screen">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 h-screen"
            onClick={() => setOffCanvasType(null)}
          />
          
          {/* Off-canvas panel */}
          <div className={`absolute ${direction === 'rtl' ? 'left-0' : 'right-0'} top-0 h-screen w-96 bg-background border-${direction === 'rtl' ? 'r' : 'l'} border-border animate-slide-in-right flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-light text-foreground">{t("yourFavorites")}</h2>
              <button
                onClick={() => setOffCanvasType(null)}
                className="p-2 text-foreground hover:text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-muted-foreground text-sm mb-6">
                {t("noFavoritesYet")}
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
