import circularCollection from "@/assets/circular-collection.png";
import organicEarring from "@/assets/organic-earring.png";
import { Link } from "react-router-dom";

const OneThirdTwoThirdsSection = () => {
  return (
    <section className="w-full mb-16 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Link to="/category/rings" className="block">
            <div className="w-full h-[500px] lg:h-[800px] mb-3 overflow-hidden">
              <img 
                src={organicEarring} 
                alt="مجوهرات حرفية" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
          <div className="">
            <h3 className="text-sm font-medium text-foreground mb-1">
              إبداع حرفي
            </h3>
            <p className="text-sm font-normal text-foreground">
              قطع مصنوعة يدوياً باهتمام دقيق بالتفاصيل
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Link to="/category/necklaces" className="block">
            <div className="w-full h-[500px] lg:h-[800px] mb-3 overflow-hidden">
              <img 
                src={circularCollection} 
                alt="مجموعة الدوائر" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
          <div className="">
            <h3 className="text-sm font-medium text-foreground mb-1">
              عناصر دائرية
            </h3>
            <p className="text-sm font-normal text-foreground">
              الكمال الهندسي يلتقي بالبساطة المعاصرة
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OneThirdTwoThirdsSection;