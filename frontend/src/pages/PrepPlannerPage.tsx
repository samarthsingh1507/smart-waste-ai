import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  ChefHat,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Info,
  Layers,
  ArrowRight,
  TrendingDown,
  Printer
} from 'lucide-react';

import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { PrepPlannerResponse, PrepRecommendationItem } from '../types';

export const PrepPlannerPage: React.FC = () => {
  const { formatWeight, settings } = useSettings();

  // Target date selection (default tomorrow)
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowIso = tomorrowDate.toISOString().split('T')[0];

  const [targetDate, setTargetDate] = useState<string>(tomorrowIso);
  const [mealPeriodFilter, setMealPeriodFilter] = useState<string>('');
  const [plannerData, setPlannerData] = useState<PrepPlannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchPlanner = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getPrepPlanner({
        target_date: targetDate,
        meal_period: mealPeriodFilter || undefined,
      });
      setPlannerData(data);
    } catch (err: any) {
      console.error('Failed to load prep planner:', err);
      setFetchError(err.message || 'Unable to calculate prep portion recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanner();
  }, [targetDate, mealPeriodFilter]);

  // Quick date selector helpers
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  const totalPrepPortions = (plannerData?.recommendations || []).reduce(
    (acc, r) => acc + r.recommended_prep_portions,
    0
  );
  const totalForecastServed = (plannerData?.recommendations || []).reduce(
    (acc, r) => acc + r.forecast_served_portions,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-hover bg-gradient-to-r from-forest-800 via-forest-900 to-forest-950 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-forest-700/50 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-forest-700/80 text-forest-100 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-forest-200">
              Key Kitchen Differentiator
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Tomorrow's Prep Planner</h2>
          <p className="text-xs text-forest-100 max-w-xl mt-1 leading-relaxed">
            Deterministic demand forecasting derived from actual served portions for the same weekday and meal period over the past 4 weeks, with a {settings.safety_buffer_percent}% safety buffer.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="btn-press btn-glow inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur-xs border border-white/25 transition-all shadow-xs relative z-10"
        >
          <Printer className="w-4 h-4" />
          <span>Print Kitchen Prep Sheet</span>
        </button>
      </div>

      {/* Target Date & Filters Control Bar */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-forest-700" />
          <span className="text-xs font-bold text-stone-700">Target Production Date:</span>

          <button
            type="button"
            onClick={() => setQuickDate(1)}
            className={`btn-press text-xs px-3 py-1.5 rounded-lg border font-medium transition-all shadow-2xs ${
              targetDate === tomorrowIso
                ? 'bg-forest-700 text-white border-forest-700 font-bold shadow-xs'
                : 'bg-warm-50 text-stone-700 border-warm-300 hover:bg-forest-50 hover:text-forest-900 hover:border-forest-300'
            }`}
          >
            Tomorrow ({plannerData?.target_day_name || 'Next Day'})
          </button>

          <button
            type="button"
            onClick={() => setQuickDate(2)}
            className="btn-press text-xs px-3 py-1.5 rounded-lg border border-warm-300 bg-warm-50 text-stone-700 hover:bg-forest-50 hover:text-forest-900 hover:border-forest-300 font-medium transition-all shadow-2xs"
          >
            +2 Days
          </button>

          <button
            type="button"
            onClick={() => setQuickDate(3)}
            className="btn-press text-xs px-3 py-1.5 rounded-lg border border-warm-300 bg-warm-50 text-stone-700 hover:bg-forest-50 hover:text-forest-900 hover:border-forest-300 font-medium transition-all shadow-2xs"
          >
            +3 Days
          </button>

          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="text-xs bg-white border border-warm-300 rounded-lg p-1.5 font-medium text-stone-800 hover:border-warm-400 focus:border-forest-600 shadow-2xs"
          />
        </div>

        {/* Meal Period Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-stone-400" />
          <select
            value={mealPeriodFilter}
            onChange={(e) => setMealPeriodFilter(e.target.value)}
            className="text-xs bg-white border border-warm-300 rounded-lg px-3 py-1.5 font-medium text-stone-700 w-full sm:w-auto hover:border-warm-400 focus:border-forest-600 shadow-2xs"
          >
            <option value="">All Meal Periods</option>
            <option value="breakfast">Breakfast Only</option>
            <option value="lunch">Lunch Only</option>
            <option value="dinner">Dinner Only</option>
          </select>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-warm-200 p-4 shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-stone-400 to-stone-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
            Planned Dishes
          </span>
          <span className="text-2xl font-bold text-stone-900 group-hover:text-forest-800 transition-colors">
            {plannerData?.total_recommended_dishes || 0}
          </span>
          <p className="text-[11px] text-stone-500 mt-1">For {plannerData?.target_day_name}</p>
        </div>

        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-forest-200 p-4 shadow-2xs bg-forest-50/30">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-forest-600 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-forest-700 block mb-1">
            Recommended Prep
          </span>
          <span className="text-2xl font-bold text-forest-900 group-hover:text-emerald-700 transition-colors">
            {totalPrepPortions} <span className="text-sm font-normal text-forest-700">portions</span>
          </span>
          <p className="text-[11px] text-forest-700 mt-1">Includes +{settings.safety_buffer_percent}% buffer</p>
        </div>

        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-warm-200 p-4 shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
            Forecast Served Demand
          </span>
          <span className="text-2xl font-bold text-stone-900 group-hover:text-blue-700 transition-colors">
            {totalForecastServed} <span className="text-sm font-normal text-stone-500">portions</span>
          </span>
          <p className="text-[11px] text-stone-500 mt-1">4-Week historical average</p>
        </div>

        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-warm-200 p-4 shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
            Configured Safety Buffer
          </span>
          <span className="text-2xl font-bold text-stone-900 group-hover:text-amber-700 transition-colors">
            {settings.safety_buffer_percent}%
          </span>
          <p className="text-[11px] text-stone-500 mt-1">Ceil rounded to whole portions</p>
        </div>
      </div>

      {/* Recommendations List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl border border-warm-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-700"></div>
          <p className="mt-3 text-xs text-stone-500 font-medium">Computing portions from 4-week service records...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-auto my-8 shadow-sm space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="font-bold text-stone-900 text-base">Prediction Calculation Error</h3>
          <p className="text-xs text-stone-600">{fetchError}</p>
          <button
            onClick={fetchPlanner}
            className="mt-2 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Retry Calculation
          </button>
        </div>
      ) : (plannerData?.recommendations || []).length === 0 ? (
        <div className="bg-white rounded-xl border border-warm-200 p-12 text-center text-stone-500">
          <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-bold text-stone-800 text-sm">No Active Dishes Found</h3>
          <p className="text-xs text-stone-500 mt-1">
            Make sure dishes are active in settings or adjust your meal-period filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(plannerData?.recommendations || []).map((rec, idx) => (
            <div
              key={`${rec.dish_id}-${rec.meal_period}`}
              className="card-hover bg-white rounded-xl border border-warm-200 p-5 shadow-2xs hover:border-forest-300 transition-all duration-300 group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-warm-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warm-100 text-stone-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-forest-100 group-hover:text-forest-800 transition-colors">
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 leading-tight group-hover:text-forest-900 transition-colors">
                      {rec.dish_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-stone-500">{rec.category}</span>
                      <span className="text-stone-300">•</span>
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full bg-warm-100 text-stone-700">
                        {rec.meal_period} Service
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendation Highlight Pill */}
                <div className="flex items-center gap-4 bg-forest-50 border border-forest-200 rounded-xl px-4 py-2.5 shadow-2xs group-hover:border-forest-300 group-hover:shadow-xs transition-all duration-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 block">
                      Recommended Preparation
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-forest-900">
                        {rec.recommended_prep_portions}
                      </span>
                      <span className="text-xs font-semibold text-forest-800">portions</span>
                    </div>
                  </div>

                  <div className="text-right pl-3 border-l border-forest-200 text-xs text-forest-700">
                    <span className="block font-medium">Forecast Demand: {rec.forecast_served_portions}</span>
                    <span className="block font-bold">+{rec.buffer_portions} buffer portions</span>
                  </div>
                </div>
              </div>

              {/* Historical Evidence & Comparative Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                <div>
                  <span className="text-stone-400 block">Historical Avg Prepared</span>
                  <span className="font-bold text-stone-800 text-sm">
                    {rec.historical_avg_prepared} portions
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Historical Avg Served</span>
                  <span className="font-bold text-stone-800 text-sm">
                    {rec.historical_avg_served} portions
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Past Surplus Over-Prep</span>
                  <span className="font-bold text-amber-700 text-sm">
                    {rec.historical_surplus_portions} portions ({rec.historical_avg_waste_kg} kg)
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Prediction Methodology</span>
                  <span className="font-semibold text-stone-700 flex items-center gap-1 mt-0.5">
                    {rec.method === 'same_weekday_4w' ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 4-Wk {rec.target_day_name}s ({rec.historical_records_count})
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Recent-Day Fallback ({rec.historical_records_count})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Plain-English Explanation */}
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2 border transition-colors ${
                  rec.is_insufficient_history
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-warm-50 border-warm-200 text-stone-700 group-hover:bg-warm-100/70'
                }`}
              >
                <Info
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    rec.is_insufficient_history ? 'text-amber-700' : 'text-forest-700'
                  }`}
                />
                <p>
                  <strong>Kitchen Rationale:</strong> {rec.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Model Transparency Box */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 p-5 shadow-2xs space-y-2 text-xs text-stone-600">
        <h3 className="font-bold text-stone-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-forest-700" />
          <span>Prediction Methodology & Transparency</span>
        </h3>
        <p className="leading-relaxed">
          Smart Waste AI uses deterministic historical demand baselines calculated from actual served meal portions.
          Unlike unverified black-box ML, every portion recommendation shows the past 4-week weekday served average,
          exact buffer addition, and historical surplus evidence so kitchen managers can make confident prep decisions.
        </p>
      </div>
    </div>
  );
};
