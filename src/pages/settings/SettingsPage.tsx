import { useState, useEffect, Suspense, lazy, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Cog } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { SettingsSidebar } from './SettingsSidebar';
import { useSettingsPermissions, SettingsSectionKey } from '@/hooks/useSettingsPermissions';
import { cn } from '@/lib/utils';

// Lazy load all sections
const ProfileSection = lazy(() => import('./sections/ProfileSection'));
const NotificationsSection = lazy(() => import('./sections/NotificationsSection'));
const SecuritySection = lazy(() => import('./sections/SecuritySection'));
const TourSection = lazy(() => import('./sections/TourSection'));

// Organization level
const OrganizationSection = lazy(() => import('./sections/OrganizationSection'));
const OrganizationPlansSection = lazy(() => import('./sections/OrganizationPlansSection'));
const ChatNotificationsSection = lazy(() => import('./sections/ChatNotificationsSection'));
const AmbassadorsSection = lazy(() => import('./sections/AmbassadorsSection'));
const PortfolioAISection = lazy(() => import('./sections/PortfolioAISection'));
const OrganizationAISection = lazy(() => import('./sections/OrganizationAISection'));
const AuditLogSection = lazy(() => import('./sections/AuditLogSection'));
const OrganizationPermissionsSection = lazy(() => import('./sections/OrganizationPermissionsSection'));

// Platform level
const OrganizationRegistrationsSection = lazy(() => import('./sections/OrganizationRegistrationsSection'));
const PlatformUsersSection = lazy(() => import('./sections/PlatformUsersSection'));
const ReferralSection = lazy(() => import('./sections/ReferralSection'));
const GlobalPermissionsSection = lazy(() => import('./sections/GlobalPermissionsSection'));
const SubscriptionManagementSection = lazy(() => import('./sections/SubscriptionManagementSection'));
const UserPlansSection = lazy(() => import('./sections/UserPlansSection'));
const CurrencySection = lazy(() => import('./sections/CurrencySection'));
const AppSettingsSection = lazy(() => import('./sections/AppSettingsSection'));
const PlatformSecuritySection = lazy(() => import('./sections/PlatformSecuritySection'));
const AppearanceSection = lazy(() => import('./sections/AppearanceSection'));
const IntegrationsSection = lazy(() => import('./sections/IntegrationsSection'));
const BillingControlSection = lazy(() => import('./sections/BillingControlSection'));
const RootAdminSection = lazy(() => import('./sections/RootAdminSection'));

// Loading fallback
const SectionLoader = memo(() => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
SectionLoader.displayName = 'SectionLoader';

// Section components map
const SECTION_COMPONENTS: Record<SettingsSectionKey, React.LazyExoticComponent<React.ComponentType>> = {
  profile: ProfileSection,
  notifications: NotificationsSection,
  security: SecuritySection,
  tour: TourSection,
  organization: OrganizationSection,
  organization_plans: OrganizationPlansSection,
  chat_notifications: ChatNotificationsSection,
  ambassadors: AmbassadorsSection,
  portfolio_ai: PortfolioAISection,
  organization_ai: OrganizationAISection,
  audit_log: AuditLogSection,
  organization_permissions: OrganizationPermissionsSection,
  organization_registrations: OrganizationRegistrationsSection,
  platform_users: PlatformUsersSection,
  referrals: ReferralSection,
  global_permissions: GlobalPermissionsSection,
  subscription_management: SubscriptionManagementSection,
  user_plans: UserPlansSection,
  currency: CurrencySection,
  app_settings: AppSettingsSection,
  platform_security: PlatformSecuritySection,
  appearance: AppearanceSection,
  integrations: IntegrationsSection,
  billing_control: BillingControlSection,
  root_admin: RootAdminSection,
};

// Wide sections that need more space
const WIDE_SECTIONS: SettingsSectionKey[] = ['user_plans', 'platform_users', 'organization_registrations'];

const SettingsPage = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = useSettingsPermissions();
  
  // Get section from URL or default
  const sectionFromUrl = searchParams.get('section') as SettingsSectionKey | null;
  const [activeSection, setActiveSection] = useState<SettingsSectionKey | null>(
    sectionFromUrl && permissions.canAccess(sectionFromUrl) ? sectionFromUrl : null
  );

  // Update URL when section changes
  useEffect(() => {
    if (activeSection) {
      setSearchParams({ section: activeSection }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeSection, setSearchParams]);

  // Handle section change
  const handleSectionChange = (section: SettingsSectionKey | null) => {
    setActiveSection(section);
  };

  // Get the component to render
  const ActiveComponent = useMemo(() => {
    if (!activeSection) return null;
    return SECTION_COMPONENTS[activeSection];
  }, [activeSection]);

  const isWideSection = activeSection && WIDE_SECTIONS.includes(activeSection);

  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Cog}
          title="Configuración"
          subtitle="Configura tu cuenta y organización"
          action={activeSection ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleSectionChange(null)}
              className="gap-2 font-medieval"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Button>
          ) : undefined}
        />
      </div>
      
      <div className="flex">
        {/* Sidebar - hidden on mobile when section is active */}
        <aside className={cn(
          "w-64 border-r border-border min-h-[calc(100vh-4rem)] p-4",
          activeSection ? "hidden md:block" : "hidden md:block"
        )}>
          <SettingsSidebar 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            permissions={permissions}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {activeSection === null ? (
            <>
              {/* Mobile menu cards */}
              <div className="md:hidden">
                <SettingsSidebar 
                  activeSection={activeSection}
                  onSectionChange={handleSectionChange}
                  permissions={permissions}
                  variant="cards"
                />
              </div>
              
              {/* Desktop: Show profile by default */}
              <div className="hidden md:block max-w-3xl">
                <Suspense fallback={<SectionLoader />}>
                  <ProfileSection />
                </Suspense>
              </div>
            </>
          ) : (
            <div className={cn(isWideSection ? 'max-w-6xl' : 'max-w-3xl')}>
              {/* Mobile back button */}
              <div className="md:hidden mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSectionChange(null)}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver
                </Button>
              </div>
              
              {/* Render active section */}
              {ActiveComponent && (
                <Suspense fallback={<SectionLoader />}>
                  <ActiveComponent />
                </Suspense>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
});

SettingsPage.displayName = 'SettingsPage';

export default SettingsPage;
