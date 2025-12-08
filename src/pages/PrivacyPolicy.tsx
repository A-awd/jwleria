import { useEffect } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { useLanguage } from "../i18n/LanguageContext";

const PrivacyPolicy = () => {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = `${t('privacyPolicyTitle')} - jWleria`;
  }, [t]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-6">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light text-foreground mb-4">{t('privacyPolicyTitle')}</h1>
            <p className="text-muted-foreground">{t('lastUpdated')}: January 15, 2024</p>
          </header>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('privacyIntro')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('privacyIntroText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('infoWeCollect')}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-light text-foreground mb-2">{t('personalInfo')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('personalInfoText')}</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>{t('personalInfoItem1')}</li>
                    <li>{t('personalInfoItem2')}</li>
                    <li>{t('personalInfoItem3')}</li>
                    <li>{t('personalInfoItem4')}</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-light text-foreground mb-2">{t('usageInfo')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t('usageInfoText')}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('howWeUse')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t('howWeUseText')}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{t('howWeUseItem1')}</li>
                <li>{t('howWeUseItem2')}</li>
                <li>{t('howWeUseItem3')}</li>
                <li>{t('howWeUseItem4')}</li>
                <li>{t('howWeUseItem5')}</li>
                <li>{t('howWeUseItem6')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('infoSharing')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t('infoSharingText')}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{t('infoSharingItem1')}</li>
                <li>{t('infoSharingItem2')}</li>
                <li>{t('infoSharingItem3')}</li>
                <li>{t('infoSharingItem4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('dataSecurity')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('dataSecurityText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('yourRights')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t('yourRightsText')}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{t('yourRightsItem1')}</li>
                <li>{t('yourRightsItem2')}</li>
                <li>{t('yourRightsItem3')}</li>
                <li>{t('yourRightsItem4')}</li>
                <li>{t('yourRightsItem5')}</li>
                <li>{t('yourRightsItem6')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('cookiesTracking')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('cookiesTrackingText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('changesToPolicy')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('changesToPolicyText')}</p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">{t('contactUsTitle')}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('contactUsText')}</p>
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

export default PrivacyPolicy;
