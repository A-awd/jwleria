import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import PageHeader from "../../components/about/PageHeader";
import ContentSection from "../../components/about/ContentSection";
import AboutSidebar from "../../components/about/AboutSidebar";
import { useLanguage } from "@/i18n/LanguageContext";

const Sustainability = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        <div className="hidden lg:block">
          <AboutSidebar />
        </div>
        
        <main className="w-full lg:w-[70vw] lg:ml-auto px-6">
        <PageHeader 
          title={t("sustainability")} 
          subtitle={t("sustainabilitySubtitle")}
        />
        
        <ContentSection title={t("environmentalCommitment")}>
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <h3 className="text-xl font-light text-foreground">{t("ethicalSourcing")}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("ethicalSourcingDesc")}
              </p>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-light text-foreground">{t("recycledMaterials")}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("recycledMaterialsDesc")}
              </p>
            </div>
          </div>

          <div className="bg-muted/10 rounded-lg p-8">
            <h3 className="text-2xl font-light text-foreground mb-6">{t("impactGoals")}</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-light text-primary mb-2">100%</div>
                <p className="text-sm text-muted-foreground">{t("carbonNeutral")}</p>
              </div>
              <div>
                <div className="text-3xl font-light text-primary mb-2">90%</div>
                <p className="text-sm text-muted-foreground">{t("recycledPackaging")}</p>
              </div>
              <div>
                <div className="text-3xl font-light text-primary mb-2">{t("zero")}</div>
                <p className="text-sm text-muted-foreground">{t("zeroWaste")}</p>
              </div>
            </div>
          </div>
        </ContentSection>

        <ContentSection title={t("circularEconomy")}>
          <div className="space-y-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("circularEconomyDesc")}
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-light text-foreground">{t("lifetimeCare")}</h3>
                <p className="text-muted-foreground">
                  {t("lifetimeCareDesc")}
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-light text-foreground">{t("takeBackProgram")}</h3>
                <p className="text-muted-foreground">
                  {t("takeBackProgramDesc")}
                </p>
              </div>
            </div>
          </div>
        </ContentSection>

        <ContentSection title={t("certificationsPartnerships")}>
          <div className="space-y-8">
            <p className="text-muted-foreground leading-relaxed">
              {t("certificationsDesc")}
            </p>
            
            <div className="grid md:grid-cols-4 gap-8 items-center">
              <div className="h-16 w-32 bg-muted/10 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">RJC Certified</span>
              </div>
              <div className="h-16 w-32 bg-muted/10 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">B Corp</span>
              </div>
              <div className="h-16 w-32 bg-muted/10 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">SCS Certified</span>
              </div>
              <div className="h-16 w-32 bg-muted/10 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Fair Trade</span>
              </div>
            </div>
          </div>
        </ContentSection>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Sustainability;