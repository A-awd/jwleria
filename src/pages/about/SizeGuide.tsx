import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import PageHeader from "../../components/about/PageHeader";
import ContentSection from "../../components/about/ContentSection";
import { Button } from "../../components/ui/button";
import AboutSidebar from "../../components/about/AboutSidebar";
import { useLanguage } from "@/i18n/LanguageContext";

const SizeGuide = () => {
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
          title={t("sizeGuide")} 
          subtitle={t("sizeGuideSubtitle")}
        />
        
        <ContentSection title={t("ringSizing")}>
          <div className="space-y-8">
            <div className="bg-muted/10 rounded-lg p-8">
              <h3 className="text-xl font-light text-foreground mb-6">{t("howToMeasureRing")}</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">{t("method1Title")}</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>{t("method1Step1")}</li>
                    <li>{t("method1Step2")}</li>
                    <li>{t("method1Step3")}</li>
                  </ol>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">{t("method2Title")}</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>{t("method2Step1")}</li>
                    <li>{t("method2Step2")}</li>
                    <li>{t("method2Step3")}</li>
                    <li>{t("method2Step4")}</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="border border-border p-3 text-left font-light">{t("usSize")}</th>
                    <th className="border border-border p-3 text-left font-light">{t("ukSize")}</th>
                    <th className="border border-border p-3 text-left font-light">{t("euSize")}</th>
                    <th className="border border-border p-3 text-left font-light">{t("diameterMm")}</th>
                    <th className="border border-border p-3 text-left font-light">{t("circumferenceMm")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { us: "5", uk: "J", eu: "49", diameter: "15.6", circumference: "49.0" },
                    { us: "5.5", uk: "K", eu: "50", diameter: "16.0", circumference: "50.2" },
                    { us: "6", uk: "L", eu: "51", diameter: "16.4", circumference: "51.5" },
                    { us: "6.5", uk: "M", eu: "52", diameter: "16.8", circumference: "52.8" },
                    { us: "7", uk: "N", eu: "54", diameter: "17.2", circumference: "54.0" },
                    { us: "7.5", uk: "O", eu: "55", diameter: "17.6", circumference: "55.3" },
                    { us: "8", uk: "P", eu: "56", diameter: "18.0", circumference: "56.5" },
                    { us: "8.5", uk: "Q", eu: "57", diameter: "18.4", circumference: "57.8" },
                    { us: "9", uk: "R", eu: "59", diameter: "18.8", circumference: "59.1" }
                  ].map((size, index) => (
                    <tr key={index} className="hover:bg-muted/10">
                      <td className="border border-border p-3">{size.us}</td>
                      <td className="border border-border p-3">{size.uk}</td>
                      <td className="border border-border p-3">{size.eu}</td>
                      <td className="border border-border p-3">{size.diameter}</td>
                      <td className="border border-border p-3">{size.circumference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ContentSection>

        <ContentSection title={t("braceletNecklaceSizing")}>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-light text-foreground">{t("braceletSizes")}</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("small")}</span>
                  <span className="text-foreground">6.5" - 7"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("medium")}</span>
                  <span className="text-foreground">7" - 7.5"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("large")}</span>
                  <span className="text-foreground">7.5" - 8"</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-light text-foreground">{t("necklaceLengths")}</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("choker")}</span>
                  <span className="text-foreground">14" - 16"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("princess")}</span>
                  <span className="text-foreground">17" - 19"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("matinee")}</span>
                  <span className="text-foreground">20" - 24"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{t("opera")}</span>
                  <span className="text-foreground">28" - 36"</span>
                </div>
              </div>
            </div>
          </div>
        </ContentSection>

        <ContentSection title={t("needHelp")}>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              {t("needHelpDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="rounded-none">
                {t("downloadPdfGuide")}
              </Button>
              <Button className="rounded-none">
                {t("scheduleConsultation")}
              </Button>
            </div>
          </div>
        </ContentSection>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default SizeGuide;