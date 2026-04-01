import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { Mail, Clock } from "lucide-react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { STORE_CONFIG, getGeneralWhatsAppLink } from "@/config/store";
import { trackWhatsAppClick } from "@/lib/analytics";

const Contact = () => {
  const { t, direction } = useLanguage();

  const handleWhatsAppClick = () => {
    trackWhatsAppClick({ type: 'general' });
    window.open(getGeneralWhatsAppLink(), '_blank');
  };

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-light text-foreground mb-4">
              {t("contactUs")}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("contactSubtitle")}
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* WhatsApp */}
            <div className="bg-muted/20 border border-border p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("whatsappContactDesc")}
              </p>
              <button
                onClick={handleWhatsAppClick}
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-2 text-sm font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t("chatNow")}
              </button>
            </div>

            {/* Email */}
            <div className="bg-muted/20 border border-border p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">{t("email")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("emailContactDesc")}
              </p>
              <a
                href={`mailto:${STORE_CONFIG.email}`}
                className="text-primary hover:underline"
              >
                {STORE_CONFIG.email}
              </a>
            </div>

            {/* Hours */}
            <div className="bg-muted/20 border border-border p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">{t("businessHours")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("businessHoursDesc")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("responseTime")}
              </p>
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="bg-muted/10 border border-border p-8">
            <h2 className="text-xl font-light text-foreground mb-6 text-center">
              {t("frequentlyAsked")}
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">{t("faqAuthenticTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("faqAuthenticAnswer")}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">{t("faqDeliveryTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("faqDeliveryAnswer")}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">{t("faqPaymentTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("faqPaymentAnswer")}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
