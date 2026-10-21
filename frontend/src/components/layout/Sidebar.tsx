import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  TrendingUp,
  Sparkles,
  Settings as SettingsIcon,
  UtensilsCrossed,
  Bot,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { settings } = useSettings();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/log-waste', label: 'Log Waste', icon: PlusCircle, highlight: true },
    { to: '/records', label: 'Waste Records', icon: ClipboardList },
    { to: '/insights', label: 'Waste Insights', icon: TrendingUp },
    { to: '/prep-planner', label: "Tomorrow's Prep Planner", icon: Sparkles, badge: 'AI Forecast' },
    { to: '/settings', label: 'Kitchen Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-warm-200/90 flex flex-col h-full select-none shadow-2xs">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-warm-200/80 gap-3 group cursor-pointer transition-colors hover:bg-warm-50/50">
        <div className="w-9 h-9 rounded-xl bg-forest-700 text-white flex items-center justify-center shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:bg-forest-800 group-hover:shadow-forest-700/30">
          <UtensilsCrossed className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
        </div>
        <div>
          <span className="font-extrabold text-stone-900 text-base tracking-tight leading-none block group-hover:text-forest-900 transition-colors">
            Smart Waste AI
          </span>
          <span className="text-[11px] font-semibold text-forest-700 uppercase tracking-wider block mt-0.5">
            Kitchen Operations
          </span>
        </div>
      </div>

      {/* Outlet Subtitle */}
      <div className="px-6 py-3 bg-warm-50/70 border-b border-warm-200/80">
        <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Active Kitchen</p>
        <p className="text-xs font-semibold text-stone-800 truncate mt-0.5">
          {settings.outlet_name}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-forest-50 to-emerald-50/40 text-forest-900 font-bold border-l-4 border-forest-700 pl-2.5 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-warm-100/80 hover:translate-x-1'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-115 ${
                  item.highlight ? 'text-forest-700' : 'text-stone-500 group-hover:text-forest-700'
                }`}
              />
              <span className="transition-colors">{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-forest-100 text-forest-800 rounded-full border border-forest-200 shadow-2xs animate-pulse-soft">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Vision Status Badge in Sidebar */}
      <div className="p-4 border-t border-warm-200/80 bg-warm-50/40">
        <div className="rounded-xl p-3 border border-warm-200/80 bg-white shadow-2xs card-hover hover:border-forest-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-forest-700 animate-float" />
              Vision Engine
            </span>
            {settings.gemini_configured ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" /> Demo
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 leading-tight">
            {settings.gemini_configured
              ? `Model: ${settings.gemini_model}`
              : 'Illustrative mock classifier. Add GEMINI_API_KEY for live analysis.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
