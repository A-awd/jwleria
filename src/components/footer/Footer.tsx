import { useLanguage } from "@/i18n/LanguageContext";
import { Instagram } from "lucide-react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { STORE_CONFIG, getGeneralWhatsAppLink } from "@/config/store";
import { trackWhatsAppClick } from "@/lib/analytics";
import Logo from "@/components/ui/Logo";

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
    role="img"
    aria-hidden="true"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Footer = () => {
  const { t, direction } = useLanguage();

  const handleWhatsAppClick = () => {
    trackWhatsAppClick({ type: 'general' });
    window.open(getGeneralWhatsAppLink(), '_blank');
  };
  
  return (
    <footer className="w-full bg-white text-black pt-8 pb-2 px-4 md:px-6 border-t border-[#e5e5e5] mt-48" dir={direction}>
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Brand & Social */}
        <div className="text-center mb-6">
          <div className="mb-3">
            <Logo size="lg" className="text-black" />
          </div>
          <p className="text-xs font-light text-black/70 leading-relaxed mb-4 px-4">
            {t("minimalistJewelry")}
          </p>
          
          {/* Social Icons */}
          <div className="flex justify-center space-x-6 mb-4">
            <a href={STORE_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="text-black/70 hover:text-black transition-colors" aria-label="Instagram">
              <Instagram size={22} />
            </a>
            <a href={STORE_CONFIG.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-black/70 hover:text-black transition-colors" aria-label="TikTok">
              <TikTokIcon size={22} />
            </a>
          </div>

          {/* WhatsApp Button */}
          <button
            onClick={handleWhatsAppClick}
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-[#0a2e14] px-4 py-2 text-sm font-medium transition-colors mb-4"
            aria-label={t("contactOnWhatsApp")}
          >
            <WhatsAppIcon className="w-4 h-4" aria-hidden="true" />
            {t("contactOnWhatsApp")}
          </button>
        </div>

        {/* Contact Info */}
        <div className="text-center mb-6 text-sm font-light text-black/70">
          <p className="font-normal text-black mb-1">{t("contactUs")}</p>
          <p>{STORE_CONFIG.phone}</p>
          <p>{STORE_CONFIG.email}</p>
        </div>

        {/* Links - 2 columns */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-center">
          {/* Shop */}
          <div>
            <h4 className="text-xs font-medium mb-3 uppercase tracking-wide">{t("shop")}</h4>
            <ul className="space-y-2">
              <li><a href="/brands" className="text-xs font-light text-black/70">{t("shopByBrand")}</a></li>
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
              <li><a href="/how-it-works" className="text-xs font-light text-black/70">{t("howItWorksNav")}</a></li>
              <li><a href="/about/size-guide" className="text-xs font-light text-black/70">{t("sizeGuide")}</a></li>
              <li><a href="/refund-policy" className="text-xs font-light text-black/70">{t("refundPolicy")}</a></li>
              <li><a href="/contact" className="text-xs font-light text-black/70">{t("contactUs")}</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8">
          {/* Brand - Left side */}
          <div>
            <div className="mb-4">
              <Logo size="lg" className="text-black" />
            </div>
            <p className="text-sm font-light text-black/70 leading-relaxed max-w-md mb-6">
              {t("minimalistJewelry")}
            </p>
            
            {/* Disclaimer */}
            <p className="text-xs text-black/70 mb-6 max-w-md">
              {t("footerDisclaimer")}
            </p>
            
            {/* Contact Information */}
            <div className="space-y-2 text-sm font-light text-black/70">
              <div>
                <p className="font-normal text-black mb-1">{t("contactUs")}</p>
                <p>{STORE_CONFIG.phone}</p>
                <p>{STORE_CONFIG.email}</p>
              </div>
            </div>
          </div>

          {/* Link lists - Right side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Shop */}
            <div>
              <h4 className="text-sm font-normal mb-4">{t("shop")}</h4>
              <ul className="space-y-2">
                <li><a href="/brands" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("shopByBrand")}</a></li>
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
                <li><a href="/how-it-works" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("howItWorksNav")}</a></li>
                <li><a href="/about/size-guide" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("sizeGuide")}</a></li>
                <li><a href="/refund-policy" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("refundPolicy")}</a></li>
                <li><a href="/contact" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("contactUs")}</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-sm font-normal mb-4">{t("connect")}</h4>
              <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-4 mb-4`}>
                <a href={STORE_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="text-black/70 hover:text-black transition-colors" aria-label="Instagram">
                  <Instagram size={20} />
                </a>
                <a href={STORE_CONFIG.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-black/70 hover:text-black transition-colors" aria-label="TikTok">
                  <TikTokIcon size={20} />
                </a>
              </div>
              
              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsAppClick}
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-[#0a2e14] px-4 py-2 text-sm font-medium transition-colors"
                aria-label={t("contactOnWhatsApp")}
              >
                <WhatsAppIcon className="w-4 h-4" aria-hidden="true" />
                {t("contactOnWhatsApp")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - edge to edge separator */}
      <div className="border-t border-[#e5e5e5] -mx-4 md:-mx-6 px-4 md:px-6 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs md:text-sm font-light text-black">
            © 2024 <Logo size="sm" className="text-black inline" />. {t("allRightsReserved")}
          </p>
          <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-4 md:space-x-6`}>
            <a href="/privacy-policy" className="text-xs md:text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("privacyPolicy")}
            </a>
            <a href="/terms-of-service" className="text-xs md:text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("termsOfService")}
            </a>
            <a href="/refund-policy" className="text-xs md:text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("refundPolicy")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
