import { useEffect } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";

const TermsOfService = () => {
  useEffect(() => {
    document.title = "Terms of Service - Linea Jewelry";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-6">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light text-foreground mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: January 15, 2024</p>
          </header>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using the Linea Jewelry Inc. website and services, you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service govern your use of our website, products, and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Use License</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Permission is granted to temporarily download one copy of the materials on Linea Jewelry Inc.'s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Product Information and Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to provide accurate product information, including descriptions, pricing, and availability. However, we do not warrant that product descriptions or other content is accurate, complete, reliable, or error-free. We reserve the right to modify or discontinue products without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Orders and Payment</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-light text-foreground mb-2">Order Acceptance</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including but not limited to product availability, errors in product information, or suspected fraud.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-light text-foreground mb-2">Payment Terms</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Payment is due at the time of purchase. We accept major credit cards and other payment methods as displayed during checkout. All prices are in USD unless otherwise specified.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Shipping and Delivery</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We will make every effort to ship orders within the timeframes specified. However, delivery dates are estimates and we are not responsible for delays caused by shipping carriers or circumstances beyond our control.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Risk of loss and title for products pass to you upon delivery to the carrier. We are not responsible for lost, stolen, or damaged packages once they have been delivered to the address provided.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Returns and Exchanges</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We want you to be completely satisfied with your purchase. Returns and exchanges are accepted within 30 days of delivery, subject to the following conditions:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Items must be in original condition and packaging</li>
                <li>Custom or personalized items are final sale</li>
                <li>Return shipping costs are the responsibility of the customer</li>
                <li>Refunds will be processed to the original payment method</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Warranty and Care</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our jewelry comes with a limited warranty against manufacturing defects. This warranty does not cover damage from normal wear, improper care, or accidents. Proper care instructions are provided with each purchase and on our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Linea Jewelry Inc. and is protected by copyright, trademark, and other intellectual property laws. Unauthorized use is prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                In no event shall Linea Jewelry Inc. or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website or products, even if we have been notified of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of our website and services, to understand our practices regarding your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms and conditions are governed by and construed in accordance with the laws of New York State, and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to revise these Terms of Service at any time without notice. By using this website, you are agreeing to be bound by the current version of these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 text-muted-foreground">
                <p>Email: legal@lineajewelry.com</p>
                <p>Phone: +1 (212) 555-0123</p>
                <p>Address: 123 Madison Avenue, New York, NY 10016</p>
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