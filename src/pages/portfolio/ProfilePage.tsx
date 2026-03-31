import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { usePortfolioAIConfig } from '@/hooks/usePortfolioAIConfig';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ProfileBuilder } from '@/components/portfolio/profile/ProfileBuilder';
import BlocksEditorDialog from '@/components/portfolio/profile/BlocksEditorDialog';
import PortfolioProfile from '@/components/portfolio/profile/PortfolioProfile';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { can, isOrgAdmin } = usePortfolioPermissions();
  
  const [showProfileBuilder, setShowProfileBuilder] = useState(false);
  const [showBlocksEditor, setShowBlocksEditor] = useState(false);

  if (!user || !profile) {
    return (
      <div className="h-full flex items-center justify-center md:ml-20 lg:ml-64 bg-background">
        <div className="text-muted-foreground">Inicia sesión para ver tu perfil</div>
      </div>
    );
  }

  const canEdit = can('portfolio.profile.edit');

  return (
    <div className="h-full overflow-y-auto md:ml-20 lg:ml-64 pb-20 bg-background">
      <PortfolioProfile
        userId={user.id}
        isOwner={true}
        onEditProfile={() => setShowProfileBuilder(true)}
        onEditBlocks={isOrgAdmin ? () => setShowBlocksEditor(true) : undefined}
      />

      {/* Profile Builder Sheet */}
      <Sheet open={showProfileBuilder} onOpenChange={setShowProfileBuilder}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-hidden">
          <ProfileBuilder onClose={() => setShowProfileBuilder(false)} />
        </SheetContent>
      </Sheet>

      {/* Blocks editor dialog */}
      {showBlocksEditor && (
        <BlocksEditorDialog
          open={showBlocksEditor}
          onOpenChange={setShowBlocksEditor}
        />
      )}
    </div>
  );
}
