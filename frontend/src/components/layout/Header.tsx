import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { settings } = useSettings();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Kitchen Waste Dashboard';
      case '/log-waste':
        return 'Log Food Waste Event';
      case '/records':
        return 'Waste Audit Records';
      case '/insights':
        return 'Waste Analytics & Patterns';
      case '/prep-planner':
        return "Tomorrow's Prep Planner";
      case '/settings':
        return 'Kitchen & AI Settings';
      default:
        return 'Kitchen Operations';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-warm-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-warm-100"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight leading-tight">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-stone-500 hidden sm:block">
            {settings.outlet_name} • Safety Buffer: {settings.safety_buffer_percent}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Demo Mode Badge */}
        {!settings.gemini_configured && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/90 border border-amber-200 text-amber-800 text-xs font-semibold shadow-2xs hover:bg-amber-100 hover:shadow-amber-500/10 transition-all cursor-default">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse-soft" />
            <span>AI Demo Mode Active</span>
          </div>
        )}

        {/* Link to Prep Planner when on Dashboard */}
        {location.pathname === '/dashboard' && (
          <Link
            to="/prep-planner"
            className="group hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-warm-100/80 hover:bg-forest-50 hover:border-forest-300 text-stone-700 hover:text-forest-900 rounded-xl text-xs font-bold border border-warm-200 btn-press transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-forest-700 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
            <span>Prep Planner</span>
          </Link>
        )}

        {/* Quick Log Waste button */}
        {location.pathname !== '/log-waste' && (
          <Link
            to="/log-waste"
            className="group inline-flex items-center gap-1.5 px-4 py-1.5 bg-forest-700 hover:bg-forest-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-forest-700/25 btn-press btn-glow transition-all"
          >
            <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90" />
            <span>Log Waste</span>
          </Link>
        )}
      </div>
    </header>
  );
};
