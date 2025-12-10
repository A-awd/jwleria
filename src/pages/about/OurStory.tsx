import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import PageHeader from "../../components/about/PageHeader";
import ContentSection from "../../components/about/ContentSection";
import ImageTextBlock from "../../components/about/ImageTextBlock";
import AboutSidebar from "../../components/about/AboutSidebar";
import { useLanguage } from "@/i18n/LanguageContext";

const OurStory = () => {
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
            title={t("ourStoryTitle")} 
            subtitle={t("ourStorySubtitle")}
          />
          
          <ContentSection>
            <ImageTextBlock
              image="/founders.png"
              imageAlt={t("foundersImageAlt")}
              title={t("foundedOnPassion")}
              content={t("foundedOnPassionDesc")}
              imagePosition="left"
            />
          </ContentSection>

          <ContentSection title={t("ourHeritage")}>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-xl font-light text-foreground">{t("traditionalCraftsmanship")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("traditionalCraftsmanshipDesc")}
                </p>
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-light text-foreground">{t("sustainableFuture")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t("sustainableFutureDesc")}
                </p>
              </div>
            </div>
          </ContentSection>

          <ContentSection title={t("ourValuesTitle")}>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-light text-foreground">{t("excellenceValue")}</h3>
                <p className="text-muted-foreground">
                  {t("excellenceValueDesc")}
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-light text-foreground">{t("authenticityValue")}</h3>
                <p className="text-muted-foreground">
                  {t("authenticityValueDesc")}
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-light text-foreground">{t("innovationValue")}</h3>
                <p className="text-muted-foreground">
                  {t("innovationValueDesc")}
                </p>
              </div>
            </div>
          </ContentSection>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default OurStory;