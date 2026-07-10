import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ImmersiveFeedContextType {
  isChromeHidden: boolean;
  toggleChrome: () => void;
  setChromeHidden: (hidden: boolean) => void;
}

const ImmersiveFeedContext = createContext<ImmersiveFeedContextType | undefined>(undefined);

// Permite que FeedPage (hijo de MainLayout) le pida a MainLayout que oculte su header/bottom
// nav — "modo pantalla completa" del feed inmersivo, con boton para volver a mostrarlos.
export function ImmersiveFeedProvider({ children }: { children: ReactNode }) {
  const [isChromeHidden, setChromeHidden] = useState(false);

  const toggleChrome = useCallback(() => {
    setChromeHidden((prev) => !prev);
  }, []);

  return (
    <ImmersiveFeedContext.Provider value={{ isChromeHidden, toggleChrome, setChromeHidden }}>
      {children}
    </ImmersiveFeedContext.Provider>
  );
}

export function useImmersiveFeed() {
  const context = useContext(ImmersiveFeedContext);
  if (!context) {
    throw new Error('useImmersiveFeed must be used within an ImmersiveFeedProvider');
  }
  return context;
}
