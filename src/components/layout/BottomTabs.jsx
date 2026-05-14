import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Map, Activity } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const MOBILE_TABS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/new-sale', label: 'New Sale', icon: PlusCircle },
  { path: '/maps', label: 'Map', icon: Map },
  { path: '/activity', label: 'Activity', icon: Activity },
];

export default function BottomTabs() {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pt-safe px-safe pb-safe">
      <div className="flex items-center justify-around">
        {MOBILE_TABS.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center py-3 px-4 flex-1 gap-1 transition-colors select-none ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}