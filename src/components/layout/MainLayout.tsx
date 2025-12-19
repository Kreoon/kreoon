import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
interface MainLayoutProps {
  children: ReactNode;
}
export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return <div className="min-h-screen bg-background">
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
        <div className="w-10" /> {/* Spacer for symmetry */}
      </header>
      
      {/* Main Content */}
      <main className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? "md:ml-20" : "md:ml-64"}`}>
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>;
}