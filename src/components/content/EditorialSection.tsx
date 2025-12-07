import founders from "@/assets/founders.png";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const EditorialSection = () => {
  return (
    <section className="w-full mb-16 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4 max-w-[630px]">
          <h2 className="text-2xl font-medium text-foreground leading-tight md:text-xl">
            مجوهرات مستوحاة من الظلال والخطوط
          </h2>
          <p className="text-sm font-normal text-foreground leading-relaxed">
            ولدت jWleria من لقاء عقلين رأيا الجمال ليس في الزخرفة فحسب، بل في البنية أيضاً. بخلفيات تمتد من الهندسة المعمارية إلى الفنون الجميلة، آمن المؤسسون بأن المجوهرات يمكن أن تكون أكثر من مجرد زينة — يمكن أن تكون امتداداً للمساحة والضوء والخط.
          </p>
          <Link to="/about/our-story" className="inline-flex items-center gap-1 text-sm font-normal text-foreground hover:text-foreground/80 transition-colors duration-200">
            <span>اقرأ قصتنا الكاملة</span>
            <ArrowLeft size={12} />
          </Link>
        </div>
        
        <div className="order-first md:order-last">
          <div className="w-full aspect-square overflow-hidden">
            <img src={founders} alt="مؤسسو jWleria" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditorialSection;