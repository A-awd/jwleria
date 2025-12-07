import founders from "@/assets/founders.png";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
const EditorialSection = () => {
  return <section className="w-full mb-16 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4 max-w-[630px]">
          <h2 className="text-2xl font-normal text-foreground leading-tight md:text-xl">
            Jewelry Drawn From Shadows and Lines
          </h2>
          <p className="text-sm font-light text-foreground leading-relaxed">Linea was born from the meeting of two minds who saw beauty not just in ornament, but in structure. With backgrounds spanning architecture and fine arts, the founders believed that jewelry could be more than decoration — it could be an extension of space, light, and line.

        </p>
          <Link to="/about/our-story" className="inline-flex items-center gap-1 text-sm font-light text-foreground hover:text-foreground/80 transition-colors duration-200">
            <span>Read our full story</span>
            <ArrowRight size={12} />
          </Link>
        </div>
        
        <div className="order-first md:order-last">
          <div className="w-full aspect-square overflow-hidden">
            <img src={founders} alt="Linea founders - two women in minimalist jewelry" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>;
};
export default EditorialSection;