import React, { useState, useEffect } from 'react';

import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AppLayout({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMapPage = location.pathname === '/maps';
  const isMobile = useIsMobile();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar
        user={user}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 lg:px-6 pt-safe">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2 select-none"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg font-bold tracking-tight text-foreground">Fiber Volt</span>
          <div className="flex-1" />
        </header>
        <main className={`flex-1 overflow-y-auto ${isMobile ? 'pb-20' : ''} ${isMapPage ? 'overflow-hidden p-0' : 'p-4 lg:p-6 max-w-7xl mx-auto'}`}>
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}