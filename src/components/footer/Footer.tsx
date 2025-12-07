import { useLanguage } from "@/i18n/LanguageContext";
import { Instagram } from "lucide-react";

// Custom TikTok icon since Lucide doesn't have one
const TikTokIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Footer = () => {
  const { t, direction } = useLanguage();
  
  return (
    <footer className="w-full bg-white text-black pt-8 pb-2 px-4 md:px-6 border-t border-[#e5e5e5] mt-48" dir={direction}>
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Brand & Social */}
        <div className="text-center mb-6">
          <span className="text-xl font-light tracking-widest text-black mb-3 block">jWleria</span>
          <p className="text-xs font-light text-black/70 leading-relaxed mb-4 px-4">
            {t("minimalistJewelry")}
          </p>
          
          {/* Social Icons */}
          <div className="flex justify-center space-x-6 mb-6">
            <a href="#" className="text-black/70 hover:text-black transition-colors" aria-label="Instagram">
              <Instagram size={22} />
            </a>
            <a href="#" className="text-black/70 hover:text-black transition-colors" aria-label="TikTok">
              <TikTokIcon size={22} />
            </a>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-center mb-6 text-sm font-light text-black/70">
          <p className="font-normal text-black mb-1">{t("contactUs")}</p>
          <p>+1 (212) 555-0123</p>
          <p>hello@jwleria.com</p>
        </div>

        {/* Links - 2 columns */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-center">
          {/* Shop */}
          <div>
            <h4 className="text-xs font-medium mb-3 uppercase tracking-wide">{t("shop")}</h4>
            <ul className="space-y-2">
              <li><a href="/category/new-in" className="text-xs font-light text-black/70">{t("newIn")}</a></li>
              <li><a href="/category/rings" className="text-xs font-light text-black/70">{t("rings")}</a></li>
              <li><a href="/category/earrings" className="text-xs font-light text-black/70">{t("earrings")}</a></li>
              <li><a href="/category/bracelets" className="text-xs font-light text-black/70">{t("bracelets")}</a></li>
              <li><a href="/category/necklaces" className="text-xs font-light text-black/70">{t("necklaces")}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-medium mb-3 uppercase tracking-wide">{t("footerSupport")}</h4>
            <ul className="space-y-2">
              <li><a href="/about/size-guide" className="text-xs font-light text-black/70">{t("sizeGuide")}</a></li>
              <li><a href="#" className="text-xs font-light text-black/70">{t("careInstructions")}</a></li>
              <li><a href="#" className="text-xs font-light text-black/70">{t("returns")}</a></li>
              <li><a href="#" className="text-xs font-light text-black/70">{t("shipping")}</a></li>
              <li><a href="/about/customer-care" className="text-xs font-light text-black/70">{t("contactUs")}</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8">
          {/* Brand - Left side */}
          <div>
            <span className="text-xl font-light tracking-widest text-black mb-4 block">jWleria</span>
            <p className="text-sm font-light text-black/70 leading-relaxed max-w-md mb-6">
              {t("minimalistJewelry")}
            </p>
            
            {/* Contact Information */}
            <div className="space-y-2 text-sm font-light text-black/70">
              <div>
                <p className="font-normal text-black mb-1">{t("contactUs")}</p>
                <p>+1 (212) 555-0123</p>
                <p>hello@jwleria.com</p>
              </div>
            </div>
          </div>

          {/* Link lists - Right side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Shop */}
            <div>
              <h4 className="text-sm font-normal mb-4">{t("shop")}</h4>
              <ul className="space-y-2">
                <li><a href="/category/new-in" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("newIn")}</a></li>
                <li><a href="/category/rings" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("rings")}</a></li>
                <li><a href="/category/earrings" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("earrings")}</a></li>
                <li><a href="/category/bracelets" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("bracelets")}</a></li>
                <li><a href="/category/necklaces" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("necklaces")}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-normal mb-4">{t("footerSupport")}</h4>
              <ul className="space-y-2">
                <li><a href="/about/size-guide" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("sizeGuide")}</a></li>
                <li><a href="#" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("careInstructions")}</a></li>
                <li><a href="#" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("returns")}</a></li>
                <li><a href="#" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("shipping")}</a></li>
                <li><a href="/about/customer-care" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("contactUs")}</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-sm font-normal mb-4">{t("connect")}</h4>
              <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-4`}>
                <a href="#" className="text-black/70 hover:text-black transition-colors" aria-label="Instagram">
                  <Instagram size={20} />
                </a>
                <a href="#" className="text-black/70 hover:text-black transition-colors" aria-label="TikTok">
                  <TikTokIcon size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - edge to edge separator */}
      <div className="border-t border-[#e5e5e5] -mx-4 md:-mx-6 px-4 md:px-6 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs md:text-sm font-light text-black">
            © 2024 jWleria. {t("allRightsReserved")}
          </p>
          <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-4 md:space-x-6`}>
            <a href="/privacy-policy" className="text-xs md:text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("privacyPolicy")}
            </a>
            <a href="/terms-of-service" className="text-xs md:text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("termsOfService")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
