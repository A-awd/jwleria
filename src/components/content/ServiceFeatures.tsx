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
    <section className="w-full py-12 md:py-16 px-4 md:px-6 border-y border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <feature.icon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-3 text-foreground/70" strokeWidth={1} />
              <h3 className="text-xs md:text-sm font-medium text-foreground mb-1.5">
                {t(feature.titleKey as any)}
              </h3>
              <p className="text-[10px] md:text-xs font-light text-foreground/60 leading-relaxed">
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
