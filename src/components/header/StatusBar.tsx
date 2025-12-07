import { useEffect, useState } from "react";

const StatusBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const usps = [
    "Free shipping over €50",
    "365 days warranty",
    "+100,000 happy customers"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % usps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [usps.length]);

  return (
    <div className="bg-status-bar text-status-bar-foreground py-2">
      <div className="container mx-auto px-4 text-center">
        <p 
          key={currentIndex}
          className="text-sm font-light transition-all duration-700 ease-in-out opacity-100 animate-fade-in"
        >
          {usps[currentIndex]}
        </p>
      </div>
    </div>
  );
};

export default StatusBar;