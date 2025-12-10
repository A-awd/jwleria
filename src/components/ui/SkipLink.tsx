import { useLanguage } from "@/i18n/LanguageContext";

const SkipLink = () => {
  const { t } = useLanguage();
  
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background focus:rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
    >
      {t("skipToContent")}
    </a>
  );
};

export default SkipLink;