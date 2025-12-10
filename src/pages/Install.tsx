import { useState, useEffect } from "react";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Check, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-8 bg-foreground/5 rounded-2xl flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-foreground" />
          </div>

          <h1 className="text-2xl md:text-4xl font-light text-foreground mb-4">
            Install jWleria App
          </h1>
          
          <p className="text-sm md:text-base text-foreground/60 mb-8 max-w-md mx-auto">
            Get the full app experience. Quick access from your home screen, offline browsing, and faster loading.
          </p>

          {isStandalone || isInstalled ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-foreground/70">
                App is already installed!
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-6">
              <p className="text-sm text-foreground/70 mb-6">
                To install on iOS:
              </p>
              
              <div className="space-y-4 text-left max-w-sm mx-auto">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Tap the Share button</p>
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <Share className="w-4 h-4" />
                      <span>in Safari browser</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Add to Home Screen</p>
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <Plus className="w-4 h-4" />
                      <span>Scroll down and tap</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tap Add</p>
                  </div>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstall}
              size="lg"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Install Now
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-foreground/60">
                Your browser may not support installation, or the app is already installed.
              </p>
              <p className="text-xs text-foreground/40">
                Try using Chrome or Edge for the best experience.
              </p>
            </div>
          )}

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-muted/20 rounded-lg">
              <div className="w-10 h-10 mx-auto mb-4 bg-foreground/5 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium mb-2">Home Screen Access</h3>
              <p className="text-xs text-foreground/60">
                Launch instantly from your home screen like a native app.
              </p>
            </div>
            
            <div className="p-6 bg-muted/20 rounded-lg">
              <div className="w-10 h-10 mx-auto mb-4 bg-foreground/5 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium mb-2">Offline Browsing</h3>
              <p className="text-xs text-foreground/60">
                Browse products even without an internet connection.
              </p>
            </div>
            
            <div className="p-6 bg-muted/20 rounded-lg">
              <div className="w-10 h-10 mx-auto mb-4 bg-foreground/5 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium mb-2">Faster Loading</h3>
              <p className="text-xs text-foreground/60">
                Cached resources mean lightning-fast page loads.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Install;