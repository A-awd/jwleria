import { useLanguage } from "@/i18n/LanguageContext";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const { language } = useLanguage();
  
  const isArabic = language === "ar";
  
  // Size classes for consistent sizing across languages
  const sizeClasses = {
    sm: "text-base md:text-lg",
    md: "text-lg md:text-xl", 
    lg: "text-xl md:text-2xl"
  };
  
  // Arabic logo with elegant Arabic calligraphy styling
  if (isArabic) {
    return (
      <span 
        className={`font-arabic font-light tracking-wide text-current ${sizeClasses[size]} ${className}`}
        style={{ fontFamily: "'Noto Naskh Arabic', 'Traditional Arabic', 'Arabic Typesetting', serif" }}
      >
        جيوليريا
      </span>
    );
  }
  
  // English logo for en, fr, es and other languages
  return (
    <span className={`font-light tracking-widest text-current ${sizeClasses[size]} ${className}`}>
      jWleria
    </span>
  );
};

export default Logo;