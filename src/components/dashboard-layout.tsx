'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from './theme-provider';

import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Car, 
  LineChart, 
  Settings, 
  Sun, 
  Moon, 
  Sparkles, 
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './sidebar';
import AISummary from './ai-summary';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [lastKeyTime, setLastKeyTime] = useState<number>(0);

  const navItems = [
    { label: 'Overview', href: '/overview', icon: LayoutDashboard },
    { label: 'Branches', href: '/branch-intelligence', icon: Building2 },
    { label: 'Reps', href: '/sales-reps', icon: Users },
    { label: 'Models', href: '/models', icon: Car },
    { label: 'Action Center', href: '/action-center', icon: LineChart },
  ];

  // Keyboard Navigation Shortcuts (g + page key)
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const now = Date.now();

      // Check for 'g' sequence
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        let route = '';
        let pageName = '';

        switch (key) {
          case 'o':
            route = '/overview';
            pageName = 'Overview';
            break;
          case 'b':
            route = '/branch-intelligence';
            pageName = 'Branch Intelligence';
            break;
          case 'r':
            route = '/sales-reps';
            pageName = 'Sales Reps';
            break;
          case 'p':
            // fallback removed
            break;
          case 'm':
            route = '/models';
            pageName = 'Models';
            break;
          case 's':
            route = '/source-performance';
            pageName = 'Source Performance';
            break;
          case 'a':
            route = '/action-center';
            pageName = 'Action Center';
            break;
          case 'c':
            route = '/copilot';
            pageName = 'AI Copilot';
            break;
          case 's':
            route = '/settings';
            pageName = 'Settings';
            break;
          default:
            break;
        }

        if (route) {
          e.preventDefault();
          router.push(route);
          toast.info(`Navigated to ${pageName}`, {
            description: 'Via keyboard shortcut',
            duration: 1500,
          });
          setLastKey(null);
          return;
        }
      }

      if (key === 'g') {
        setLastKey('g');
        setLastKeyTime(now);
      } else {
        setLastKey(null);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [lastKey, lastKeyTime, router]);

  return (
    <div className="h-screen overflow-hidden flex bg-background text-foreground">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-16 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 border-b border-border bg-card px-4 flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-primary to-blue-800 text-white shadow-sm overflow-hidden">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="18 9 410 285" className="w-full h-full">
                <path d="M125.1,104.9 Q124.0,107.0 124.0,109.4 L124.0,110.7 Q124.0,113.0 126.0,114.2 L127.0,114.8 Q129.0,116.0 131.3,116.0 L316.4,116.0 Q319.0,116.0 321.0,114.4 L322.0,113.6 Q324.0,112.0 323.4,109.5 L322.8,106.6 Q322.0,103.0 320.2,99.8 L300.8,64.0 Q297.0,57.0 289.0,57.0 L159.0,57.0 Q151.0,57.0 147.2,64.0 Z" fill="currentColor"/>
                <path d="M56.6,155.4 Q55.0,157.0 56.0,159.1 L70.6,190.7 Q74.0,198.0 82.0,198.2 L133.0,199.8 Q141.0,200.0 144.9,207.0 L163.1,239.0 Q167.0,246.0 175.0,246.0 L272.0,246.0 Q280.0,246.0 283.9,239.0 L302.1,207.0 Q306.0,200.0 314.0,199.9 L364.0,199.1 Q372.0,199.0 375.8,192.0 L391.5,162.8 Q393.0,160.0 391.4,157.2 L390.6,155.8 Q389.0,153.0 385.8,153.0 L337.0,153.0 Q329.0,153.0 324.9,159.9 L305.1,193.1 Q301.0,200.0 293.0,200.0 L154.0,200.0 Q146.0,200.0 142.0,193.1 L123.0,159.9 Q119.0,153.0 111.0,153.0 L61.3,153.0 Q59.0,153.0 57.4,154.6 Z" fill="currentColor"/>
              </svg>
            </div>
            <span className="font-bold text-sm tracking-wide text-foreground">DealerPulse</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <button
              onClick={() => toggleTheme()}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Settings Link */}
            <Link
              href="/settings"
              className={`p-2 rounded-md transition-colors ${
                pathname === '/settings' || pathname?.startsWith('/settings')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Main Pane */}
          <div className="flex-1 flex flex-col bg-background h-full overflow-hidden min-w-0 relative">
            
              {/* Mobile/Tablet AI Accordion */}
              {pathname !== '/action-center' && !pathname?.startsWith('/settings') && (
                <div className="xl:hidden border-b border-border bg-background flex-shrink-0 z-10">
                  <button 
                    onClick={() => setMobileAiOpen(!mobileAiOpen)}
                    className="w-full flex items-center justify-between p-3.5 bg-transparent hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold tracking-tight text-foreground">AI Copilot</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${mobileAiOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {mobileAiOpen && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: 450 }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-border overflow-hidden flex flex-col relative bg-card"
                      >
                        <AISummary />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            {/* Page Content Pane */}
            <div className="flex-1 min-h-0 overflow-hidden relative w-full">
              {children}
            </div>
          </div>

          {/* Desktop AI Right Panel */}
          {pathname !== '/action-center' && !pathname?.startsWith('/settings') && (
            <aside className="hidden xl:flex xl:flex-col w-80 border-l border-border bg-card flex-shrink-0 z-20">
              <div className="h-16 flex items-center space-x-2.5 px-5 border-b border-border bg-card flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold tracking-tight text-foreground">AI Copilot</span>
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <AISummary />
              </div>
            </aside>
          )}

        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border bg-card z-40 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/overview' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[11px] font-medium mt-1 truncate max-w-full px-1">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
