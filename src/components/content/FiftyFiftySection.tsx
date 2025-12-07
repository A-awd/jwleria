import earringsCollection from "@/assets/earrings-collection.png";
import linkBracelet from "@/assets/link-bracelet.png";
import { Link } from "react-router-dom";

const FiftyFiftySection = () => {
  return (
    <section className="w-full mb-16 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Link to="/category/earrings" className="block">
            <div className="w-full aspect-square mb-3 overflow-hidden">
              <img 
                src={earringsCollection} 
                alt="مجموعة الأقراط" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
          <div className="">
            <h3 className="text-sm font-medium text-foreground mb-1">
              تصاميم طبيعية
            </h3>
            <p className="text-sm font-normal text-foreground">
              قطع مستوحاة من الطبيعة بتفاصيل نحتية انسيابية
            </p>
          </div>
        </div>

        <div>
          <Link to="/category/bracelets" className="block">
            <div className="w-full aspect-square mb-3 overflow-hidden">
              <img 
                src={linkBracelet} 
                alt="سوار سلسلة" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
          <div className="">
            <h3 className="text-sm font-medium text-foreground mb-1">
              مجموعة السلاسل
            </h3>
            <p className="text-sm font-normal text-foreground">
              حلقات راقية من المعادن الثمينة
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FiftyFiftySection;