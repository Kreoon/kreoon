import { useTour } from "@/hooks/useTour";
import { WelcomeDialog } from "./WelcomeDialog";
import { TourTooltip } from "./TourTooltip";

export function TourProvider() {
  const {
    showWelcome,
    showTour,
    tourConfig,
    startTour,
    closeTour,
    completeTour,
    userName
  } = useTour();

  if (!tourConfig) return null;

  return (
    <>
      <WelcomeDialog
        isOpen={showWelcome}
        onClose={closeTour}
        onStartTour={startTour}
        userName={userName}
        roleName={tourConfig.roleName}
        roleDescription={tourConfig.roleDescription}
      />
      
      <TourTooltip
        steps={tourConfig.steps}
        isOpen={showTour}
        onClose={closeTour}
        onComplete={completeTour}
      />
    </>
  );
}
