import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import PageHeader from "../../components/about/PageHeader";
import ContentSection from "../../components/about/ContentSection";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import AboutSidebar from "../../components/about/AboutSidebar";
import { useLanguage } from "@/i18n/LanguageContext";

const CustomerCare = () => {
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
          title={t("customerCare")} 
          subtitle={t("customerCareSubtitle")}
        />
        
        <ContentSection title={t("contactInformation")}>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-light text-foreground">{t("contactPhone")}</h3>
              <p className="text-muted-foreground">+966 55 123 4567</p>
              <p className="text-sm text-muted-foreground">{t("phoneHours")}</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-light text-foreground">{t("contactEmail")}</h3>
              <p className="text-muted-foreground">hello@jwleria.com</p>
              <p className="text-sm text-muted-foreground">{t("emailResponse")}</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-light text-foreground">{t("whatsApp")}</h3>
              <Button variant="outline" className="rounded-none">
                {t("startChat")}
              </Button>
              <p className="text-sm text-muted-foreground">{t("chatAvailability")}</p>
            </div>
          </div>
        </ContentSection>

        <ContentSection title={t("frequentlyAskedQuestions")}>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="shipping" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {t("faqShippingQuestion")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("faqShippingAnswer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="returns" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {t("faqReturnsQuestion")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("faqReturnsAnswer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="warranty" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {t("faqWarrantyQuestion")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("faqWarrantyAnswer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sizing" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {t("faqSizingQuestion")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("faqSizingAnswer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="care" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {t("faqCareQuestion")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("faqCareAnswer")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="authentication" className="border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {t("faqAuthenticityQuestion")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {t("faqAuthenticityAnswer")}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ContentSection>

        <ContentSection title={t("contactForm")}>
          <div>
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-light text-foreground">{t("firstName")}</label>
                  <Input className="rounded-none" placeholder={t("enterFirstName")} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-light text-foreground">{t("lastName")}</label>
                  <Input className="rounded-none" placeholder={t("enterLastName")} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-light text-foreground">{t("email")}</label>
                <Input type="email" className="rounded-none" placeholder={t("enterEmail")} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-light text-foreground">{t("orderNumberOptional")}</label>
                <Input className="rounded-none" placeholder={t("enterOrderNumberIfApplicable")} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-light text-foreground">{t("howCanWeHelp")}</label>
                <Textarea 
                  className="rounded-none min-h-[120px]" 
                  placeholder={t("describeInquiry")}
                />
              </div>
              
              <Button type="submit" className="w-full rounded-none">
                {t("sendMessage")}
              </Button>
            </form>
          </div>
        </ContentSection>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default CustomerCare;