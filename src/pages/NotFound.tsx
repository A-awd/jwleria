import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";

const NotFound = () => {
  const location = useLocation();
  const { t, direction } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      <main className="flex items-center justify-center py-32">
        <div className="text-center px-4">
          <h1 className="mb-4 text-6xl font-light text-foreground">404</h1>
          <p className="mb-6 text-xl text-muted-foreground">{t("pageNotFound")}</p>
          <p className="mb-8 text-sm text-muted-foreground max-w-md mx-auto">
            {t("pageNotFoundDesc")}
          </p>
          <Link 
            to="/" 
            className="inline-block px-8 py-3 bg-foreground text-background font-light hover:bg-foreground/90 transition-colors"
          >
            {t("returnToHome")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
