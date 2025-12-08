import { useEffect } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { useLanguage } from "../i18n/LanguageContext";

const TermsOfService = () => {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = `${t('termsOfServiceTitle')} - jWleria`;
  }, [t]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-6">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light text-foreground mb-4">{t('termsOfServiceTitle')}</h1>
            <p className="text-muted-foreground">{t('lastUpdated')}: January 15, 2024</p>
          </header>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('agreementToTerms')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('agreementToTermsText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('useLicense')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t('useLicenseText')}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{t('useLicenseItem1')}</li>
                <li>{t('useLicenseItem2')}</li>
                <li>{t('useLicenseItem3')}</li>
                <li>{t('useLicenseItem4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('productInfoAvailability')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('productInfoAvailabilityText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('ordersPayment')}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-light text-foreground mb-2">{t('orderAcceptance')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('orderAcceptanceText')}</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-light text-foreground mb-2">{t('paymentTerms')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('paymentTermsText')}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('shippingDelivery')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t('shippingDeliveryText1')}</p>
              <p className="text-muted-foreground leading-relaxed">{t('shippingDeliveryText2')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('returnsExchanges')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t('returnsExchangesText')}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{t('returnsExchangesItem1')}</li>
                <li>{t('returnsExchangesItem2')}</li>
                <li>{t('returnsExchangesItem3')}</li>
                <li>{t('returnsExchangesItem4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('warrantyCare')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('warrantyCareText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('intellectualProperty')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('intellectualPropertyText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('limitationLiability')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('limitationLiabilityText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('privacyPolicyRef')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('privacyPolicyRefText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('governingLaw')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('governingLawText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('changesToTerms')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('changesToTermsText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('contactInfo')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('contactInfoText')}</p>
              <div className="mt-4 text-muted-foreground">
                <p>{t('email')}: hello@jwleria.com</p>
                <p>{t('phone')}: +1 (212) 555-0123</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
