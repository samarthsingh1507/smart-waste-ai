import React from 'react';
import { AlertCircle, RotateCcw, Info } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface DemoBannerProps {
  onResetDemo?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onResetDemo }) => {
  const { settings } = useSettings();

  return (
    <div className="bg-gradient-to-r from-amber-50/90 to-amber-50/50 border border-amber-200/90 rounded-2xl p-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0 animate-pulse-soft" />
        <div>
          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full mr-2 shadow-2xs">
            DEMO DATASET ACTIVE
          </span>
          <span className="text-amber-800 font-medium">
            Charts, cost estimates, and portion predictions are computed live from 30 days of representative commercial kitchen records.
          </span>
          {!settings.gemini_configured && (
            <span className="block sm:inline sm:ml-1 text-amber-700 font-semibold">
              (AI Vision operating in transparent Demo Fallback Mode).
            </span>
          )}
        </div>
      </div>

      {onResetDemo && (
        <button
          onClick={onResetDemo}
          className="group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/90 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs btn-press transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-700 transition-transform duration-500 group-hover:rotate-180" />
          <span>Restore Demo Data</span>
        </button>
      )}
    </div>
  );
};
