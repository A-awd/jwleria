import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AriaLiveContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AriaLiveContext = createContext<AriaLiveContextType | undefined>(undefined);

export const useAriaLive = () => {
  const context = useContext(AriaLiveContext);
  if (!context) {
    throw new Error("useAriaLive must be used within an AriaLiveProvider");
  }
  return context;
};

interface AriaLiveProviderProps {
  children: ReactNode;
}

export const AriaLiveProvider = ({ children }: AriaLiveProviderProps) => {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "assertive") {
      setAssertiveMessage("");
      // Small delay to ensure screen readers pick up the change
      setTimeout(() => setAssertiveMessage(message), 100);
    } else {
      setPoliteMessage("");
      setTimeout(() => setPoliteMessage(message), 100);
    }
  }, []);

  return (
    <AriaLiveContext.Provider value={{ announce }}>
      {children}
      {/* Polite announcements for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive announcements for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  );
};

export default AriaLiveProvider;