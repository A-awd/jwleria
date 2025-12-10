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
              Last updated: December 2024
            </p>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Pre-Order Nature of Our Service</h2>
              <p>
                As a luxury personal shopping service, all items offered by jWleria are sourced on a pre-order basis. 
                This means we purchase items from official boutiques or authorized dealers specifically for you after 
                receiving your order and payment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Cancellation Before Sourcing</h2>
              <p>
                If you wish to cancel your order before we have sourced the item, please contact us immediately via WhatsApp. 
                In most cases, we can offer a full refund minus any non-recoverable bank transfer fees.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Cancellation After Sourcing</h2>
              <p>
                Once we have purchased the item on your behalf, cancellations may not be possible as luxury items are 
                typically non-returnable to boutiques. If cancellation is possible, a restocking fee of up to 20% may apply.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Defective or Incorrect Items</h2>
              <p>
                If you receive an item that is defective or different from what was ordered, please contact us within 
                48 hours of delivery. We will work with you to arrange a return or exchange at no additional cost.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Authenticity Guarantee</h2>
              <p>
                All items are 100% authentic and sourced from official brand boutiques or authorized dealers. 
                If you have any concerns about authenticity, we will provide full documentation and work with 
                you to verify the item.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Refund Processing</h2>
              <p>
                Approved refunds will be processed within 7-14 business days. Refunds will be issued to the 
                original payment method. Bank transfer refunds may take additional time depending on your bank.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-light text-foreground mb-4">Contact Us</h2>
              <p>
                For any questions about refunds or cancellations, please contact us via WhatsApp or email at 
                hello@jwleria.com. We are committed to ensuring your satisfaction with every purchase.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RefundPolicy;
