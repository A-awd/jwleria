import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pagination = () => {
  return (
    <section className="w-full px-6 py-8">
      <div className="flex justify-start items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2 hover:bg-transparent hover:opacity-50 disabled:opacity-30 -ml-2" 
          disabled
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="min-w-8 h-8 hover:bg-transparent underline font-normal text-sm"
          >
            1
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="min-w-8 h-8 hover:bg-transparent hover:underline font-light text-sm"
          >
            2
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="min-w-8 h-8 hover:bg-transparent hover:underline font-light text-sm"
          >
            3
          </Button>
          <span className="mx-2 text-sm font-light text-muted-foreground">...</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="min-w-8 h-8 hover:bg-transparent hover:underline font-light text-sm"
          >
            8
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2 hover:bg-transparent hover:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
};

export default Pagination;