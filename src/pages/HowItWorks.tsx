import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { Search, CreditCard, Package, CheckCircle } from "lucide-react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { getGeneralWhatsAppLink } from "@/config/store";
import { trackWhatsAppClick } from "@/lib/analytics";

const HowItWorks = () => {
  const { t, direction } = useLanguage();

  const handleWhatsAppClick = () => {
    trackWhatsAppClick({ type: 'general' });
    window.open(getGeneralWhatsAppLink(), '_blank');
  };

  const steps = [
    {
      icon: Search,
      title: t("browseOurCatalog"),
      description: t("browseDescription"),
    },
    {
      icon: WhatsAppIcon,
      title: t("contactUsOnWhatsApp"),
      description: t("contactDescription"),
    },
    {
      icon: CheckCircle,
      title: t("weConfirmAvailability"),
      description: t("confirmDescription"),
    },
    {
      icon: CreditCard,
      title: t("securePayment"),
      description: t("paymentDescription"),
    },
    {
      icon: Package,
      title: t("weDeliverToYou"),
      description: t("deliveryDescription"),
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-light text-foreground mb-4">
              {t("howItWorks")}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("howItWorksSubtitle")}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="flex items-start gap-6"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-muted-foreground">
                      {t("step")} {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-light text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Why Choose Us Section */}
          <div className="mt-20 pt-12 border-t border-border">
            <h2 className="text-2xl font-light text-foreground text-center mb-12">
              {t("whyChooseUs")}
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("authenticProducts")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("authenticProductsDesc")}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("personalService")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("personalServiceDesc")}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("globalDelivery")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("globalDeliveryDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <button
              onClick={handleWhatsAppClick}
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-8 py-4 text-lg font-medium transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              {t("startShoppingNow")}
            </button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default HowItWorks;
