'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  Sun, 
  Moon,
  X,
  Car,
  AlertTriangle,
  Presentation
} from 'lucide-react';
import { useTheme } from './theme-provider';
import { dealershipData, ANCHOR_DATE, STAGNANT_LEAD_DAYS, getGlobalMetrics } from '@/lib/dealership-data';
import { useState, useEffect } from 'react';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}
export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleBoardroomMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Compute live badge counts for sidebar icons
  const inactiveLeadsCount = useMemo(() => {
    const cutoff = new Date(ANCHOR_DATE);
    cutoff.setDate(cutoff.getDate() - STAGNANT_LEAD_DAYS);
    return dealershipData.leads.filter(
      l => !['delivered', 'lost'].includes(l.status) && new Date(l.last_activity_at) < cutoff
    ).length;
  }, []);

  const coachingRepsCount = useMemo(() => {
    const reps = getGlobalMetrics('all').reps.filter(r => r.role === 'sales_officer');
    return reps.filter(r => (r.conversion !== null && r.conversion < 20) || r.avgResponseTimeHours > 5).length;
  }, []);

  const navItems = [
    { label: 'Overview', href: '/overview', icon: LayoutDashboard, badge: null },
    { label: 'Branches', href: '/branch-intelligence', icon: Building2, badge: null },
    { label: 'Sales Reps', href: '/sales-reps', icon: Users, badge: coachingRepsCount > 0 ? coachingRepsCount : null },
    { label: 'Models', href: '/models', icon: Car, badge: null },
    { label: 'Action Center', href: '/action-center', icon: AlertTriangle, badge: inactiveLeadsCount > 0 ? inactiveLeadsCount : null },
  ];

  const handleClose = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-center h-16 flex-shrink-0 relative">
        <div className="flex items-center justify-center w-10 h-10 text-primary overflow-hidden">
          {/* Geometric Logo */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="18 9 410 285" className="w-full h-full">
            <path d="M125.1,104.9 Q124.0,107.0 124.0,109.4 L124.0,110.7 Q124.0,113.0 126.0,114.2 L127.0,114.8 Q129.0,116.0 131.3,116.0 L316.4,116.0 Q319.0,116.0 321.0,114.4 L322.0,113.6 Q324.0,112.0 323.4,109.5 L322.8,106.6 Q322.0,103.0 320.2,99.8 L300.8,64.0 Q297.0,57.0 289.0,57.0 L159.0,57.0 Q151.0,57.0 147.2,64.0 Z" fill="currentColor"/>
            <path d="M56.6,155.4 Q55.0,157.0 56.0,159.1 L70.6,190.7 Q74.0,198.0 82.0,198.2 L133.0,199.8 Q141.0,200.0 144.9,207.0 L163.1,239.0 Q167.0,246.0 175.0,246.0 L272.0,246.0 Q280.0,246.0 283.9,239.0 L302.1,207.0 Q306.0,200.0 314.0,199.9 L364.0,199.1 Q372.0,199.0 375.8,192.0 L391.5,162.8 Q393.0,160.0 391.4,157.2 L390.6,155.8 Q389.0,153.0 385.8,153.0 L337.0,153.0 Q329.0,153.0 324.9,159.9 L305.1,193.1 Q301.0,200.0 293.0,200.0 L154.0,200.0 Q146.0,200.0 142.0,193.1 L123.0,159.9 Q119.0,153.0 111.0,153.0 L61.3,153.0 Q59.0,153.0 57.4,154.6 Z" fill="currentColor"/>
          </svg>
        </div>
        {setMobileOpen && (
          <button 
            onClick={handleClose}
            className="absolute right-2 p-1 rounded-full md:hidden text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 space-y-1.5 flex flex-col items-center justify-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/overview' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClose}
              onMouseLeave={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 group relative mx-auto ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:scale-105'
              }`}
            >
              {isActive && (
                <span className="absolute left-[-16px] w-1 h-6 bg-primary rounded-r-full animate-in fade-in slide-in-from-left-1 duration-300" />
              )}
              <Icon 
                className={`w-5 h-5 flex-shrink-0 transition-all ${
                  isActive 
                    ? 'text-primary scale-110' 
                    : 'text-muted-foreground group-hover:text-foreground'
                }`} 
              />

              {/* Tooltip */}
              <span className="absolute left-full ml-1.5 z-50 px-3 py-1.5 text-[11px] font-bold tracking-wider bg-foreground text-background rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
 
      {/* Bottom Footer Actions */}
      <div className="py-4 pb-6 flex flex-col justify-center items-center space-y-1.5 flex-shrink-0">
        
        {/* Boardroom Mode */}
        <button
          onClick={toggleBoardroomMode}
          onMouseLeave={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
          title={isFullscreen ? 'Exit Boardroom' : 'Boardroom Mode'}
          className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 group relative ${
            isFullscreen
              ? 'text-primary scale-105'
              : 'text-muted-foreground hover:text-foreground hover:scale-105'
          }`}
        >
          <Presentation className={`w-5 h-5 transition-transform ${isFullscreen ? 'scale-110 drop-shadow-[0_0_2px_rgba(37,99,235,0.3)]' : ''}`} />
          {/* Tooltip */}
          <span className="absolute left-full ml-1.5 z-50 px-3 py-1.5 text-[11px] font-bold tracking-wider bg-foreground text-background rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
            {isFullscreen ? 'Exit Boardroom' : 'Boardroom Mode'}
          </span>
        </button>

        <button
          onClick={toggleTheme}
          onMouseLeave={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
          className="flex items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 hover:scale-105 group relative mx-auto"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 transition-transform" />
          )}
          {/* Tooltip */}
          <span className="absolute left-full ml-1.5 z-50 px-3 py-1.5 text-[11px] font-bold tracking-wider bg-foreground text-background rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
 
        {/* Divider */}
        <div className="w-8 h-px bg-border/50 my-1" />

        {/* Settings */}
        <Link
          href="/settings"
          onClick={handleClose}
          onMouseLeave={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
          className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 group relative mx-auto ${
            pathname === '/settings' || pathname?.startsWith('/settings')
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground hover:scale-105'
          }`}
        >
          {(pathname === '/settings' || pathname?.startsWith('/settings')) && (
            <span className="absolute left-[-16px] w-1 h-6 bg-primary rounded-r-full animate-in fade-in slide-in-from-left-1 duration-300 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          )}
          <Settings 
            className={`w-5 h-5 flex-shrink-0 transition-all ${
              pathname === '/settings' || pathname?.startsWith('/settings')
                ? 'text-primary scale-110' 
                : 'text-muted-foreground group-hover:text-foreground'
            }`} 
          />
          {/* Tooltip */}
          <span className="absolute left-full ml-1.5 z-50 px-3 py-1.5 text-[11px] font-bold tracking-wider bg-foreground text-background rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
            Admin Settings
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-16 md:fixed md:inset-y-0 z-20 border-r border-border bg-card">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />
          <div className="relative flex flex-col flex-1 w-full max-w-xs transition-transform duration-300 transform translate-x-0 bg-card">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
