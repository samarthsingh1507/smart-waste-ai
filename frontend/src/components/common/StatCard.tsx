import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: 'forest' | 'amber' | 'stone';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  accentColor = 'forest',
}) => {
  const getAccentStyles = () => {
    switch (accentColor) {
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'stone':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'forest':
      default:
        return 'bg-forest-50 text-forest-700 border-forest-200';
    }
  };

  return (
    <div className="group relative overflow-hidden bg-white rounded-xl border border-warm-200/90 p-5 shadow-2xs card-hover hover:border-forest-300/80 cursor-default">
      {/* Top ambient hover accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-forest-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1 group-hover:text-stone-700 transition-colors">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight group-hover:text-forest-900 transition-colors">
              {value}
            </span>
            {badge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-stone-600 font-medium border border-warm-200 group-hover:border-forest-200 transition-colors">
                {badge}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div
            className={`p-2.5 rounded-lg border shadow-2xs transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 ${getAccentStyles()}`}
          >
            <Icon className="w-5 h-5 transition-transform duration-300" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-warm-100 flex items-center justify-between text-xs text-stone-500">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-forest-700' : 'text-amber-700'
              }`}
            >
              {trend.value} {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
