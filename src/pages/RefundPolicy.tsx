import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { useLanguage } from "@/i18n/LanguageContext";

const RefundPolicy = () => {
  const { t, direction } = useLanguage();

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-light text-foreground mb-8">
            {t("refundPolicy")}
          </h1>
          
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
            <p className="text-foreground font-medium">
              {t("lastUpdated")}: {t("december")} 2024
            </p>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("refundPreOrderNature")}</h2>
              <p>{t("refundPreOrderNatureDesc")}</p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("refundCancellationBefore")}</h2>
              <p>{t("refundCancellationBeforeDesc")}</p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("refundCancellationAfter")}</h2>
              <p>{t("refundCancellationAfterDesc")}</p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("refundDefectiveItems")}</h2>
              <p>{t("refundDefectiveItemsDesc")}</p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("refundAuthenticity")}</h2>
              <p>{t("refundAuthenticityDesc")}</p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("refundProcessing")}</h2>
              <p>{t("refundProcessingDesc")}</p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">{t("contactUsTitle")}</h2>
              <p>{t("refundContactDesc")}</p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RefundPolicy;
