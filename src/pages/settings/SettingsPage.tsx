import { useState, useEffect, Suspense, lazy, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Cog } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { SettingsSidebar } from './SettingsSidebar';
import { useSettingsPermissions, SettingsSectionKey } from '@/hooks/useSettingsPermissions';
import { cn } from '@/lib/utils';

// Lazy load all sections - CONSOLIDATED
const ProfileSection = lazy(() => import('./sections/ProfileSection'));
const NotificationsUnifiedSection = lazy(() => import('./sections/NotificationsUnifiedSection'));
const SecuritySection = lazy(() => import('./sections/SecuritySection'));
const TourSection = lazy(() => import('./sections/TourSection'));

// Organization level - CONSOLIDATED
const OrganizationSection = lazy(() => import('./sections/OrganizationSection'));
const OrgRegistrationSettingsSection = lazy(() => import('./sections/OrgRegistrationSettingsSection'));
const OrganizationPlansSection = lazy(() => import('./sections/OrganizationPlansSection'));
const AISettingsSection = lazy(() => import('./sections/AISettingsSection'));
const AmbassadorsSection = lazy(() => import('./sections/AmbassadorsSection'));
const PermissionsUnifiedSection = lazy(() => import('./sections/PermissionsUnifiedSection'));
const AuditLogSection = lazy(() => import('./sections/AuditLogSection'));
const TrackingSection = lazy(() => import('./sections/TrackingSection'));
const OrgSocialSection = lazy(() => import('./sections/OrgSocialSection'));

// Platform level - CONSOLIDATED
const OrganizationRegistrationsSection = lazy(() => import('./sections/OrganizationRegistrationsSection'));
const PlatformUsersSection = lazy(() => import('./sections/PlatformUsersSection'));
const ReferralSection = lazy(() => import('./sections/ReferralSection'));
const BillingUnifiedSection = lazy(() => import('./sections/BillingUnifiedSection'));
const PlatformConfigSection = lazy(() => import('./sections/PlatformConfigSection'));
const PlatformAdminSection = lazy(() => import('./sections/PlatformAdminSection'));
const AITokenizationSection = lazy(() => import('@/pages/admin/AITokenizationPage'));
const LiveStreamingSection = lazy(() => import('./sections/LiveStreamingPlatformSection'));
const LiveStreamingOrgSection = lazy(() => import('./sections/LiveStreamingOrgSection'));

// Loading fallback
const SectionLoader = memo(() => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
SectionLoader.displayName = 'SectionLoader';

// Section components map - CONSOLIDATED (reduced from 25 to 18)
const SECTION_COMPONENTS: Record<SettingsSectionKey, React.LazyExoticComponent<React.ComponentType>> = {
  // User level
  profile: ProfileSection,
  notifications: NotificationsUnifiedSection,
  security: SecuritySection,
  tour: TourSection,
  // Organization level
  organization: OrganizationSection,
  org_registration_settings: OrgRegistrationSettingsSection,
  organization_plans: OrganizationPlansSection,
  ai_settings: AISettingsSection,
  ambassadors: AmbassadorsSection,
  permissions: PermissionsUnifiedSection,
  audit_log: AuditLogSection,
  tracking: TrackingSection,
  org_social: OrgSocialSection,
  live_streaming_org: LiveStreamingOrgSection,
  // Platform level
  organization_registrations: OrganizationRegistrationsSection,
  platform_users: PlatformUsersSection,
  referrals: ReferralSection,
  billing: BillingUnifiedSection,
  platform_config: PlatformConfigSection,
  platform_admin: PlatformAdminSection,
  ai_tokenization: AITokenizationSection,
  live_streaming: LiveStreamingSection,
};

// Wide sections that need more space
const WIDE_SECTIONS: SettingsSectionKey[] = ['billing', 'platform_users', 'organization_registrations'];

const SettingsPage = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = useSettingsPermissions();
  
  // Get section from URL or default
  const sectionFromUrl = searchParams.get('section') as SettingsSectionKey | null;
  const [activeSection, setActiveSection] = useState<SettingsSectionKey | null>(
    sectionFromUrl && permissions.canAccess(sectionFromUrl) ? sectionFromUrl : null
  );

  // If the page booted before permissions finished loading (common on refresh),
  // re-apply the URL section once permissions are available.
  useEffect(() => {
    if (permissions.loading) return;
    if (!sectionFromUrl) return;

    if (permissions.canAccess(sectionFromUrl)) {
      setActiveSection(sectionFromUrl);
    }
  }, [permissions.loading, permissions.canAccess, sectionFromUrl]);

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
