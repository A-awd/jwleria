import heroImage from "@/assets/hero-image.png";

const LargeHero = () => {
  return (
    <section className="w-full mb-10 md:mb-16 px-4 md:px-6">
      <div className="w-full aspect-[4/3] md:aspect-[16/9] mb-2 md:mb-3 overflow-hidden">
        <img 
          src={heroImage} 
          alt="Modern jewelry collection" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="">
        <h2 className="text-xs md:text-sm font-normal text-foreground mb-0.5 md:mb-1">
          Modern Heritage
        </h2>
        <p className="text-xs md:text-sm font-light text-foreground/70">
          Contemporary jewelry crafted with timeless elegance
        </p>
      </div>
    </section>
  );
};

export default LargeHero;