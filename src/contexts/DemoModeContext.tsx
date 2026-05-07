import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isDemoUser } from '@/lib/demo-data';

interface DemoModeContextValue {
  isDemo: boolean;
  tourStep: number;
  setTourStep: (step: number) => void;
  tourActive: boolean;
  startTour: () => void;
  endTour: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemo: false,
  tourStep: 0,
  setTourStep: () => {},
  tourActive: false,
  startTour: () => {},
  endTour: () => {},
});

export const useDemoMode = () => useContext(DemoModeContext);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isDemo = isDemoUser(user?.email);
  const [tourStep, setTourStep] = useState(0);
  const [tourActive, setTourActive] = useState(false);

  // Auto-start tour on first visit to demo mode
  useEffect(() => {
    if (!isDemo) return;
    const seen = sessionStorage.getItem('demo-tour-seen');
    if (!seen) {
      setTourActive(true);
      sessionStorage.setItem('demo-tour-seen', '1');
    }
  }, [isDemo]);

  const startTour = () => {
    setTourStep(0);
    setTourActive(true);
  };

  const endTour = () => {
    setTourActive(false);
    setTourStep(0);
  };

  return (
    <DemoModeContext.Provider value={{ isDemo, tourStep, setTourStep, tourActive, startTour, endTour }}>
      {children}
    </DemoModeContext.Provider>
  );
}
