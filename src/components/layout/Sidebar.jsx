import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Calendar, Trophy,
  DollarSign, Shield, LogOut, Menu, X, BarChart2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
{ path: '/', label: 'Dashboard', icon: LayoutDashboard },
{ path: '/new-sale', label: 'New Sale', icon: PlusCircle },
{ path: '/calendar', label: 'Calendar', icon: Calendar },
{ path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
{ path: '/payouts', label: 'Payouts', icon: DollarSign },
{ path: '/clients', label: 'Clients', icon: Users }];


const ADMIN_ITEMS = [
{ path: '/admin', label: 'Admin', icon: Shield },
{ path: '/reports', label: 'Reports', icon: BarChart2 }];


export default function Sidebar({ user, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      {mobileOpen &&
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      }
      <aside className={`
        fixed top-0 left-0 h-full z-50 bg-sidebar text-sidebar-foreground
        flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent hidden lg:flex h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent lg:hidden h-8 w-8"
            onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active ?
                'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/25' :
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                  ${
                collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}>
                
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>);

          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {!collapsed &&
          <div className="px-3 py-2 mb-2">
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.full_name || user?.email}</p>
              <p className="text-xs text-sidebar-foreground/40 truncate">{user?.role === 'admin' ? 'Admin' : 'Rep'}</p>
            </div>
          }
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full
              text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all
              ${collapsed ? 'justify-center' : ''}`}>
            
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>);

}