import { useLanguage } from "@/i18n/LanguageContext";
import { Shield, Globe, Star, Clock } from "lucide-react";

const ServiceFeatures = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Shield,
      titleKey: "authenticityGuarantee",
      descKey: "authenticityGuaranteeShort",
    },
    {
      icon: Globe,
      titleKey: "globalAccess",
      descKey: "globalAccessShort",
    },
    {
      icon: Star,
      titleKey: "expertCuration",
      descKey: "expertCurationShort",
    },
    {
      icon: Clock,
      titleKey: "conciergeService",
      descKey: "conciergeServiceShort",
    },
  ];

  return (
    <section className="w-full py-8 sm:py-12 md:py-16 px-4 md:px-6 border-y border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center px-1 sm:px-2">
              <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-2 sm:mb-3 text-foreground/70" strokeWidth={1} />
              <h3 className="text-[10px] sm:text-xs md:text-sm font-medium text-foreground mb-1 sm:mb-1.5 leading-tight">
                {t(feature.titleKey as any)}
              </h3>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light text-foreground/60 leading-relaxed">
                {t(feature.descKey as any)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceFeatures;
