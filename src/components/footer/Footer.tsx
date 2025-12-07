import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t, direction } = useLanguage();
  
  return (
    <footer className="w-full bg-white text-black pt-8 pb-2 px-6 border-t border-[#e5e5e5] mt-48" dir={direction}>
      <div className="">
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
                <p className="font-normal text-black mb-1">{t("visitUs")}</p>
                <p>123 Madison Avenue</p>
                <p>New York, NY 10016</p>
              </div>
              <div>
                <p className="font-normal text-black mb-1 mt-3">{t("contactUs")}</p>
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
              <ul className="space-y-2">
                <li><a href="#" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("instagram")}</a></li>
                <li><a href="#" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("pinterest")}</a></li>
                <li><a href="#" className="text-sm font-light text-black/70 hover:text-black transition-colors">{t("newsletter")}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - edge to edge separator */}
      <div className="border-t border-[#e5e5e5] -mx-6 px-6 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm font-light text-black mb-1 md:mb-0">
            © 2024 jWleria. {t("allRightsReserved")}
          </p>
          <div className={`flex ${direction === 'rtl' ? 'space-x-reverse' : ''} space-x-6`}>
            <a href="/privacy-policy" className="text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("privacyPolicy")}
            </a>
            <a href="/terms-of-service" className="text-sm font-light text-black hover:text-black/70 transition-colors">
              {t("termsOfService")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
