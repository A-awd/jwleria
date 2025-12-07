import { ArrowLeft, X, Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ShoppingBag from "./ShoppingBag";
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [offCanvasType, setOffCanvasType] = useState<'favorites' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShoppingBagOpen, setIsShoppingBagOpen] = useState(false);
  
  // Shopping bag state with 3 mock items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: "بانثيون",
      price: "٢،٨٥٠ ر.س",
      image: pantheonImage,
      quantity: 1,
      category: "أقراط"
    },
    {
      id: 2,
      name: "إكليبس",
      price: "٣،٢٠٠ ر.س", 
      image: eclipseImage,
      quantity: 1,
      category: "أساور"
    },
    {
      id: 3,
      name: "هالو",
      price: "١،٩٥٠ ر.س",
      image: haloImage, 
      quantity: 1,
      category: "أقراط"
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
    "خواتم ذهب",
    "قلادات فضية", 
    "أقراط لؤلؤ",
    "أساور مصممة",
    "خواتم زفاف",
    "المجموعة الكلاسيكية"
  ];
  
  const navItems = [
    { 
      name: "تسوق", 
      href: "/category/shop",
      submenuItems: [
        "خواتم",
        "قلادات", 
        "أقراط",
        "أساور",
        "ساعات"
      ],
      images: [
        { src: "/rings-collection.png", alt: "مجموعة الخواتم", label: "خواتم" },
        { src: "/earrings-collection.png", alt: "مجموعة الأقراط", label: "أقراط" }
      ]
    },
    { 
      name: "جديدنا", 
      href: "/category/new-in",
      submenuItems: [
        "وصل هذا الأسبوع",
        "مجموعة الربيع",
        "مصممون مميزون",
        "إصدار محدود",
        "الطلبات المسبقة"
      ],
      images: [
        { src: "/arcus-bracelet.png", alt: "سوار آركوس", label: "سوار آركوس" },
        { src: "/span-bracelet.png", alt: "سوار سبان", label: "سوار سبان" }
      ]
    },
    { 
      name: "عنا", 
      href: "/about/our-story",
      submenuItems: [
        "قصتنا",
        "الاستدامة",
        "دليل المقاسات",
        "خدمة العملاء",
        "فروعنا"
      ],
      images: [
        { src: "/founders.png", alt: "المؤسسون", label: "اقرأ قصتنا" }
      ]
    }
  ];

  return (
    <nav 
      className="relative" 
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Mobile hamburger button */}
        <button
          className="lg:hidden p-2 mt-0.5 text-nav-foreground hover:text-nav-hover transition-colors duration-200"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="فتح القائمة"
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

        {/* Right navigation - Hidden on tablets and mobile */}
        <div className="hidden lg:flex space-x-8 space-x-reverse">
          {navItems.map((item) => (
            <div
              key={item.name}
              className="relative"
              onMouseEnter={() => setActiveDropdown(item.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to={item.href}
                className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-sm font-normal py-6 block"
              >
                {item.name}
              </Link>
            </div>
          ))}
        </div>

        {/* Center logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <Link to="/" className="block">
            <span className="text-xl font-bold tracking-widest text-nav-foreground">jWleria</span>
          </Link>
        </div>

        {/* Left icons */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <button 
            className="p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200"
            aria-label="بحث"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
          <button 
            className="hidden lg:block p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200"
            aria-label="المفضلة"
            onClick={() => setOffCanvasType('favorites')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
          <button 
            className="p-2 text-nav-foreground hover:text-nav-hover transition-colors duration-200 relative"
            aria-label="حقيبة التسوق"
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
            <div className="flex justify-between w-full">
              {/* Right side - Menu items */}
              <div className="flex-1">
                <ul className="space-y-2">
                   {navItems
                     .find(item => item.name === activeDropdown)
                     ?.submenuItems.map((subItem, index) => (
                      <li key={index}>
                        <Link 
                          to={activeDropdown === "عنا" ? `/about/${subItem === "قصتنا" ? "our-story" : subItem === "الاستدامة" ? "sustainability" : subItem === "دليل المقاسات" ? "size-guide" : subItem === "خدمة العملاء" ? "customer-care" : "store-locator"}` : `/category/${subItem.toLowerCase()}`}
                          className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-sm font-normal block py-2"
                        >
                          {subItem}
                        </Link>
                      </li>
                   ))}
                </ul>
              </div>

              {/* Left side - Images */}
              <div className="flex space-x-6 space-x-reverse">
                {navItems
                  .find(item => item.name === activeDropdown)
                  ?.images.map((image, index) => {
                    // Determine the link destination based on dropdown and image
                    let linkTo = "/";
                    if (activeDropdown === "تسوق") {
                      if (image.label === "خواتم") linkTo = "/category/rings";
                      else if (image.label === "أقراط") linkTo = "/category/earrings";
                    } else if (activeDropdown === "جديدنا") {
                      if (image.label === "سوار آركوس") linkTo = "/product/arcus-bracelet";
                      else if (image.label === "سوار سبان") linkTo = "/product/span-bracelet";
                    } else if (activeDropdown === "عنا") {
                      linkTo = "/about/our-story";
                    }
                    
                    return (
                      <Link key={index} to={linkTo} className="w-[400px] h-[280px] cursor-pointer group relative overflow-hidden block">
                        <img 
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                        />
                        {(activeDropdown === "تسوق" || activeDropdown === "جديدنا" || activeDropdown === "عنا") && (
                          <div className="absolute bottom-2 right-2 text-white text-xs font-normal flex items-center gap-1">
                            <span>{image.label}</span>
                            <ArrowLeft size={12} />
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
                <div className="flex items-center border-b border-border pb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-nav-foreground ml-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="ابحث عن المجوهرات..."
                    className="flex-1 bg-transparent text-nav-foreground placeholder:text-nav-foreground/60 outline-none text-lg text-right"
                    autoFocus
                  />
                </div>
              </div>

              {/* Popular searches */}
              <div>
                <h3 className="text-nav-foreground text-sm font-normal mb-4">عمليات البحث الشائعة</h3>
                <div className="flex flex-wrap gap-3">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      className="text-nav-foreground hover:text-nav-hover text-sm font-normal py-2 px-4 border border-border rounded-full transition-colors duration-200 hover:border-nav-hover"
                    >
                      {search}
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
                <div key={item.name}>
                  <Link
                    to={item.href}
                    className="text-nav-foreground hover:text-nav-hover transition-colors duration-200 text-lg font-normal block py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                   <div className="mt-3 pr-4 space-y-2">
                     {item.submenuItems.map((subItem, subIndex) => (
                       <Link
                         key={subIndex}
                         to={item.name === "عنا" ? `/about/${subItem === "قصتنا" ? "our-story" : subItem === "الاستدامة" ? "sustainability" : subItem === "دليل المقاسات" ? "size-guide" : subItem === "خدمة العملاء" ? "customer-care" : "store-locator"}` : `/category/${subItem.toLowerCase()}`}
                         className="text-nav-foreground/70 hover:text-nav-hover text-sm font-normal block py-1"
                         onClick={() => setIsMobileMenuOpen(false)}
                       >
                         {subItem}
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
          <div className="absolute left-0 top-0 h-screen w-96 bg-background border-l border-border animate-slide-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-normal text-foreground">المفضلة</h2>
              <button
                onClick={() => setOffCanvasType(null)}
                className="p-2 text-foreground hover:text-muted-foreground transition-colors"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-muted-foreground text-sm mb-6">
                لم تضف أي منتجات للمفضلة بعد. تصفح مجموعتنا واضغط على أيقونة القلب لحفظ المنتجات التي تعجبك.
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;