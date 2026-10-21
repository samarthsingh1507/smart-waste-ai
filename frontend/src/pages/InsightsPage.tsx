import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  AlertCircle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { InsightsResponse } from '../types';

const CATEGORY_COLORS = ['#15803d', '#2563eb', '#d97706', '#8b5cf6', '#ec4899', '#06b6d4'];

export const InsightsPage: React.FC = () => {
  const { formatCost, formatWeight, settings } = useSettings();
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysWindow, setDaysWindow] = useState<number>(14);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getInsights(daysWindow);
      setInsights(data);
    } catch (err: any) {
      console.error('Failed to load insights:', err);
      setFetchError(err.message || 'Unable to load period comparison data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [daysWindow]);

  if (loading && !insights) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest-700"></div>
        <p className="mt-4 text-sm text-stone-500 font-medium">Calculating period comparisons and pattern analytics...</p>
      </div>
    );
  }

  if (fetchError && !insights) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm space-y-3">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="font-bold text-stone-900 text-base">Connection Error</h3>
        <p className="text-xs text-stone-600">{fetchError}</p>
        <button
          onClick={fetchInsights}
          className="mt-2 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Retry Loading Insights
        </button>
      </div>
    );
  }

  const weightChange = insights?.changes.weight_change_pct || 0;
  const costChange = insights?.changes.cost_change_pct || 0;

  return (
    <div className="space-y-6">
      {/* Top Header and Period Window Selector */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">
            Waste Pattern Analytics & Period Comparison
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Comparing Current Window ({insights?.period_a_start} to {insights?.period_a_end}) vs Baseline Period ({insights?.period_b_start} to {insights?.period_b_end})
          </p>
        </div>

        <div className="flex items-center gap-2 bg-warm-100 rounded-lg p-1 border border-warm-200 text-xs font-medium shadow-2xs">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDaysWindow(d)}
              className={`btn-press px-3 py-1.5 rounded-md transition-all ${
                daysWindow === d
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              {d}-Day Comparison
            </button>
          ))}
        </div>
      </div>

      {/* Baseline Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Weight Delta */}
        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-warm-200 p-5 shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-forest-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Waste Volume Comparison
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 group-hover:text-forest-900 transition-colors">
              {formatWeight(insights?.current_period.weight_kg || 0)}
            </span>
            <span
              className={`badge-hover inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs ${
                weightChange <= 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {weightChange <= 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
              )}
              {Math.abs(weightChange)}% vs Prior {daysWindow}d
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Prior baseline: {formatWeight(insights?.previous_period.weight_kg || 0)}
          </p>
        </div>

        {/* Estimated Cost Delta */}
        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-warm-200 p-5 shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Ingredient Cost Comparison
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
              {formatCost(insights?.current_period.cost || 0)}
            </span>
            <span
              className={`badge-hover inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs ${
                costChange <= 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {costChange <= 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
              )}
              {Math.abs(costChange)}% vs Prior {daysWindow}d
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Prior baseline: {formatCost(insights?.previous_period.cost || 0)}
          </p>
        </div>

        {/* Prep Surplus Shift */}
        <div className="card-hover group relative overflow-hidden bg-white rounded-xl border border-warm-200 p-5 shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Preparation Surplus Shift
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 group-hover:text-blue-900 transition-colors">
              {formatWeight(insights?.current_period.prep_surplus_kg || 0)}
            </span>
            <span className="badge-hover text-xs font-medium text-stone-600 bg-warm-100 px-2 py-0.5 rounded border border-warm-200 shadow-2xs">
              {Math.round(
                ((insights?.current_period.prep_surplus_kg || 0) /
                  (insights?.current_period.weight_kg || 1)) *
                  100
              )}
              % of Current
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Prior prep surplus: {formatWeight(insights?.previous_period.prep_surplus_kg || 0)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Chart */}
        <div className="card-hover lg:col-span-2 bg-white rounded-xl border border-warm-200 p-5 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-stone-900">Waste by Food Category</h3>
            <p className="text-xs text-stone-500">
              Cumulative waste volume across kitchen food categories
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights?.category_breakdown || []} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe9" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} unit=" kg" />
                <Tooltip
                  formatter={(val: any, _, item: any) => [
                    `${val} kg (${formatCost(item.payload.cost)})`,
                    'Waste',
                  ]}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: '1px solid #44403c',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="weight_kg" radius={[4, 4, 0, 0]}>
                  {(insights?.category_breakdown || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share List */}
        <div className="card-hover bg-white rounded-xl border border-warm-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Category Cost Contribution</h3>
            <p className="text-xs text-stone-500 mb-3">Financial impact ranking</p>
            <div className="space-y-3">
              {(insights?.category_breakdown || []).map((cat, idx) => (
                <div key={cat.category} className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-stone-800 group-hover:text-forest-900 transition-colors">
                      <span
                        className="w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      {cat.category}
                    </span>
                    <span className="font-bold text-stone-900 group-hover:text-forest-900 transition-colors">{formatCost(cat.cost)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-warm-100 text-xs text-stone-500">
            Grain and curry categories account for over 65% of recorded ingredient losses.
          </div>
        </div>
      </div>

      {/* Recurring Kitchen Waste Patterns with Practical Explanations */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-forest-50 text-forest-700 rounded-lg border border-forest-200 shadow-2xs">
            <Lightbulb className="w-4 h-4 text-forest-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Recurring Kitchen Patterns & Practical Explanations
            </h3>
            <p className="text-xs text-stone-500">
              Operational observations and actionable reduction strategies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(insights?.recurring_patterns || []).map((pattern, idx) => (
            <div
              key={idx}
              className="card-hover group bg-warm-50/80 hover:bg-white rounded-xl p-4 border border-warm-200 hover:border-forest-300 flex flex-col justify-between space-y-3 transition-all duration-200 shadow-2xs hover:shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-stone-900 text-xs group-hover:text-forest-900 transition-colors">{pattern.title}</h4>
                  <span
                    className={`badge-hover text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-2xs ${
                      pattern.severity === 'high'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : pattern.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {pattern.severity} Priority
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed mb-3">
                  {pattern.finding}
                </p>
              </div>

              <div className="pt-2 border-t border-warm-200/80 text-xs">
                <span className="font-semibold text-forest-800 block text-[11px] mb-0.5">
                  Actionable Step:
                </span>
                <p className="text-stone-600 group-hover:text-stone-800 transition-colors">{pattern.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Realistic Prototype Disclosure Notice */}
      <div className="card-hover p-4 bg-warm-100/70 rounded-xl border border-warm-200 text-xs text-stone-600 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-stone-800">Operational Disclaimer</p>
          <p className="mt-0.5 text-stone-600 leading-relaxed">
            All analytical trends and cost distributions reflect persisted meal-service and kitchen scale logs.
            Predicted portion recommendations should always be reviewed against daily kitchen bookings, reservations, and chef discretion.
          </p>
        </div>
      </div>
    </div>
  );
};
