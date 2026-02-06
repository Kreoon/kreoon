import { MessageCircle } from 'lucide-react';
import { SECTIONS } from './utils/sectionConfig';

interface ResearchKiroButtonProps {
  activeSectionId: string;
}

export function ResearchKiroButton({ activeSectionId }: ResearchKiroButtonProps) {
  const section = SECTIONS.find(s => s.id === activeSectionId);

  const handleClick = () => {
    // Try to open KIRO widget and send contextual message
    try {
      // Dispatch custom event that KiroWidget can listen for
      const event = new CustomEvent('kiro-open-chat', {
        detail: { message: section?.kiroPrompt || 'Ayudame con esta investigacion de mercado' },
      });
      window.dispatchEvent(event);
    } catch {
      // KIRO not available
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25 flex items-center justify-center text-white hover:scale-105 transition-transform"
      title="Preguntale a KIRO"
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
}
