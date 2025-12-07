import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import PageHeader from "../../components/about/PageHeader";
import ContentSection from "../../components/about/ContentSection";
import { Button } from "../../components/ui/button";
import AboutSidebar from "../../components/about/AboutSidebar";

const SizeGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        <div className="hidden lg:block">
          <AboutSidebar />
        </div>
        
        <main className="w-full lg:w-[70vw] lg:ml-auto px-6">
        <PageHeader 
          title="Size Guide" 
          subtitle="Find your perfect fit with our comprehensive sizing guide"
        />
        
        <ContentSection title="Ring Sizing">
          <div className="space-y-8">
            <div className="bg-muted/10 rounded-lg p-8">
              <h3 className="text-xl font-light text-foreground mb-6">How to Measure Your Ring Size</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Method 1: Using a Ring You Own</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Take a ring that fits comfortably on your desired finger</li>
                    <li>Place it on a ruler and measure the inner diameter in millimeters</li>
                    <li>Use our size chart below to find your size</li>
                  </ol>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Method 2: Using String or Paper</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Wrap string or paper around your finger where the ring will sit</li>
                    <li>Mark where the material overlaps</li>
                    <li>Measure the length in millimeters</li>
                    <li>Divide by 3.14 to get the diameter</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="border border-border p-3 text-left font-light">US Size</th>
                    <th className="border border-border p-3 text-left font-light">UK Size</th>
                    <th className="border border-border p-3 text-left font-light">EU Size</th>
                    <th className="border border-border p-3 text-left font-light">Diameter (mm)</th>
                    <th className="border border-border p-3 text-left font-light">Circumference (mm)</th>
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

        <ContentSection title="Bracelet & Necklace Sizing">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-light text-foreground">Bracelet Sizes</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Small</span>
                  <span className="text-foreground">6.5" - 7"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Medium</span>
                  <span className="text-foreground">7" - 7.5"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Large</span>
                  <span className="text-foreground">7.5" - 8"</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-light text-foreground">Necklace Lengths</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Choker</span>
                  <span className="text-foreground">14" - 16"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Princess</span>
                  <span className="text-foreground">17" - 19"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Matinee</span>
                  <span className="text-foreground">20" - 24"</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Opera</span>
                  <span className="text-foreground">28" - 36"</span>
                </div>
              </div>
            </div>
          </div>
        </ContentSection>

        <ContentSection title="Need Help?">
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Still unsure about sizing? Our jewelry consultants are here to help you find the perfect fit. 
              Download our printable size guide or schedule a virtual consultation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="rounded-none">
                Download PDF Guide
              </Button>
              <Button className="rounded-none">
                Schedule Consultation
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