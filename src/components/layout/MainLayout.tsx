import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TourProvider } from "@/components/tour/TourProvider";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
        <MobileNav />
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-sm font-bold">UGC Colombia</span>
          </div>
        </div>
        <NotificationBell />
      </header>
      
      {/* Desktop Header with Notifications */}
      <div className={`hidden md:flex fixed top-0 right-0 z-30 h-14 items-center px-4 transition-[left] duration-300 ${sidebarCollapsed ? "left-20" : "left-64"}`}>
        <div className="ml-auto" data-tour="notification-bell">
          <NotificationBell />
        </div>
      </div>
      
      {/* Main Content */}
      <main className={`transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarCollapsed ? "md:ml-20" : "md:ml-64"}`}>
        <div className="min-h-screen md:pt-0">
          {children}
        </div>
      </main>

      {/* Tour Provider */}
      <TourProvider />
    </div>
  );
}