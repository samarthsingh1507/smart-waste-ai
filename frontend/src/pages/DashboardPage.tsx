import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  IndianRupee,
  TrendingDown,
  Layers,
  Sparkles,
  Calendar,
  Filter,
  CheckCircle2,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { StatCard } from '../components/common/StatCard';
import { DemoBanner } from '../components/common/DemoBanner';

const COLORS = ['#15803d', '#d97706', '#3b82f6', '#8b5cf6', '#ec4899'];
const MEAL_PERIOD_COLORS: Record<string, string> = {
  breakfast: '#f59e0b', // warm amber for morning
  lunch: '#15803d',     // vibrant emerald forest green for lunch
  dinner: '#4338ca',    // rich indigo twilight for dinner
};
const SOURCE_COLORS: Record<string, string> = {
  preparation_surplus: '#d97706', // amber
  plate_returns: '#2563eb',       // blue
  spoilage: '#dc2626',            // red
};

export const DashboardPage: React.FC = () => {
  const { formatCost, formatWeight, settings } = useSettings();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilterDays, setDateFilterDays] = useState<number>(30);
  const [mealPeriodFilter, setMealPeriodFilter] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<any>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - dateFilterDays);

      const params: any = {
        date_from: pastDate.toISOString().split('T')[0],
        date_to: today.toISOString().split('T')[0],
      };
      if (mealPeriodFilter) {
        params.meal_period = mealPeriodFilter;
      }

      const data = await api.getDashboardSummary(params);
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard summary:', err);
      setFetchError(err.message || 'Unable to connect to kitchen operations server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [dateFilterDays, mealPeriodFilter]);

  const handleResetDemo = async () => {
    try {
      await api.resetDemoData();
      await fetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest-700"></div>
        <p className="mt-4 text-sm text-stone-500 font-medium">Aggregating kitchen metrics from database...</p>
      </div>
    );
  }

  if (fetchError && !summary) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm space-y-3">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="font-bold text-stone-900 text-base">Connection Error</h3>
        <p className="text-xs text-stone-600">{fetchError}</p>
        <button
          onClick={fetchSummary}
          className="mt-2 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo dataset indicator banner */}
      <DemoBanner onResetDemo={handleResetDemo} />

      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-warm-200/90 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs card-hover hover:border-warm-300">
        <div className="flex items-center gap-2 text-stone-700 text-sm font-bold">
          <Filter className="w-4 h-4 text-forest-700 transition-transform duration-300 hover:rotate-180" />
          <span>Operational Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Date range presets */}
          <div className="flex items-center bg-warm-100/80 rounded-xl p-1 border border-warm-200 text-xs font-semibold">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setDateFilterDays(days)}
                className={`px-3 py-1 rounded-lg transition-all duration-200 btn-press ${
                  dateFilterDays === days
                    ? 'bg-white text-stone-900 font-extrabold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                Last {days}d
              </button>
            ))}
          </div>

          {/* Meal period filter */}
          <select
            value={mealPeriodFilter}
            onChange={(e) => setMealPeriodFilter(e.target.value)}
            className="text-xs bg-white border border-warm-300 rounded-xl px-3 py-1.5 font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-forest-600/30 hover:border-forest-400 transition-colors shadow-2xs"
          >
            <option value="">All Meal Periods</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>
      </div>

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Food Waste"
          value={formatWeight(summary?.total_waste_kg || 0)}
          subtitle={`Across ${summary?.records_count || 0} logged events`}
          icon={Scale}
          accentColor="forest"
        />

        <StatCard
          title="Estimated Waste Cost"
          value={formatCost(summary?.total_cost || 0)}
          subtitle="Direct ingredient loss calculation"
          icon={IndianRupee}
          accentColor="amber"
        />

        <StatCard
          title="Key Opportunity"
          value={
            summary?.by_waste_source.find((s) => s.key === 'preparation_surplus')?.percentage + '%' ||
            '0%'
          }
          subtitle="Preparation surplus in total waste"
          icon={Layers}
          accentColor="stone"
        />

        <StatCard
          title="Daily Waste Average"
          value={formatWeight((summary?.total_waste_kg || 0) / (summary?.filter_period_days || 30))}
          subtitle={`Over ${summary?.filter_period_days || 30} days window`}
          icon={TrendingDown}
          accentColor="forest"
        />
      </div>

      {/* Actionable Kitchen Insights Callout */}
      {summary?.key_insights && summary.key_insights.length > 0 && (
        <div className="bg-gradient-to-r from-forest-50/90 via-emerald-50/40 to-white border border-forest-200/90 rounded-2xl p-5 shadow-2xs card-hover hover:border-forest-300 transition-all">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest-700 animate-float" />
              <h2 className="text-sm font-extrabold text-forest-950 tracking-tight">
                Kitchen Operations Findings & Recommendations
              </h2>
            </div>
            <Link
              to="/prep-planner"
              className="group/link text-xs font-bold text-forest-700 hover:text-forest-900 flex items-center gap-1.5 transition-colors"
            >
              <span>Open Tomorrow's Prep Planner</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.key_insights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-white/90 border border-forest-100 rounded-xl p-3.5 text-xs text-stone-700 leading-relaxed flex items-start gap-2.5 shadow-2xs card-hover hover:border-forest-300 hover:bg-white cursor-default"
              >
                <span className="w-2 h-2 rounded-full bg-forest-600 mt-1 shrink-0 animate-pulse-soft" />
                <span className="font-medium text-stone-800">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section: Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waste Trend Over Time (Area Chart) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-warm-200 p-5 shadow-2xs card-hover hover:border-forest-200/70">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Waste Trend Over Time</h2>
              <p className="text-xs text-stone-500">Daily recorded food waste in kilograms</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.waste_trend || []}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e8e6dc' }}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" kg"
                />
                <Tooltip
                  formatter={(val: any) => [`${val} kg`, 'Waste Weight']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="weight_kg"
                  stroke="#15803d"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorWeight)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waste Distribution by Meal Period (Donut Chart) */}
        {(() => {
          const mealPeriodData = summary?.by_meal_period || [];
          const activeMealSlices = mealPeriodData.filter((item) => item.weight_kg > 0);
          const totalMealWaste = activeMealSlices.reduce((acc, curr) => acc + curr.weight_kg, 0);
          const totalMealCost = activeMealSlices.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

          // Dedicated custom tooltip with crisp high-contrast text and zero overlap
          const CustomPieTooltip = ({ active, payload }: any) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const color = MEAL_PERIOD_COLORS[data.key] || '#15803d';
              return (
                <div className="bg-stone-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-stone-700/80 text-xs min-w-[155px] pointer-events-none z-50">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-800">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-bold text-white text-xs">{data.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-300">
                      {data.percentage}%
                    </span>
                  </div>
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-3 text-stone-300">
                      <span className="text-[11px]">Waste:</span>
                      <span className="font-bold text-white text-xs">{data.weight_kg} kg</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-stone-300">
                      <span className="text-[11px]">Cost:</span>
                      <span className="font-bold text-emerald-400 text-xs">
                        {formatCost(data.estimated_cost)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          };

          return (
            <div className="bg-white rounded-xl border border-warm-200 p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-stone-900">Waste by Meal Period</h2>
                  <span className="text-[11px] font-semibold text-stone-500">
                    {activeMealSlices.length} active service{activeMealSlices.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-2">Breakfast, lunch vs dinner volume</p>

                {activeMealSlices.length === 0 ? (
                  <div className="h-44 w-full flex flex-col items-center justify-center bg-warm-50/50 rounded-xl border border-dashed border-warm-200 p-4 text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-warm-200 flex items-center justify-center mb-2">
                      <span className="text-stone-300 font-bold text-xs">0 kg</span>
                    </div>
                    <p className="text-xs font-semibold text-stone-700">No Waste Logged</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      No records match the current filter selection
                    </p>
                  </div>
                ) : (
                  <div className="relative h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={176}>
                      <PieChart>
                        <Pie
                          data={activeMealSlices}
                          dataKey="weight_kg"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={activeMealSlices.length > 1 ? 3 : 0}
                          minAngle={12}
                          onMouseEnter={(_, index) => setHoveredSlice(activeMealSlices[index])}
                          onMouseLeave={() => setHoveredSlice(null)}
                        >
                          {activeMealSlices.map((item) => {
                            const isHovered = hoveredSlice?.key === item.key;
                            const color = MEAL_PERIOD_COLORS[item.key] || '#15803d';
                            return (
                              <Cell
                                key={`cell-${item.key}`}
                                fill={color}
                                stroke="#ffffff"
                                strokeWidth={isHovered ? 2.5 : 1.5}
                                opacity={hoveredSlice ? (isHovered ? 1 : 0.6) : 1}
                                className="cursor-pointer transition-all duration-150"
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} offset={15} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Donut Badge - gracefully hides while hovering a slice to prevent any text overlap with the tooltip */}
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-150 ${
                        hoveredSlice ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total</span>
                      <span className="text-sm font-extrabold text-stone-900 tracking-tight leading-tight">
                        {formatWeight(totalMealWaste)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">
                        {formatCost(totalMealCost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend with clean spacing and hover interactions */}
              <div className="space-y-1 pt-2.5 border-t border-warm-100">
                {mealPeriodData.map((item) => {
                  const color = MEAL_PERIOD_COLORS[item.key] || '#15803d';
                  const isZero = item.weight_kg === 0;
                  const isHovered = hoveredSlice?.key === item.key;
                  return (
                    <div
                      key={item.key}
                      onMouseEnter={() => !isZero && setHoveredSlice(item)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={`flex items-center justify-between text-xs transition-all duration-150 rounded-lg px-2 py-1 ${
                        isZero
                          ? 'opacity-40 cursor-default'
                          : isHovered
                          ? 'bg-warm-100 font-bold'
                          : 'hover:bg-warm-50 cursor-pointer opacity-100'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-stone-700">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-stone-800">{item.name}</span>
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-stone-400 text-[11px]">
                          {formatCost(item.estimated_cost)}
                        </span>
                        <span className="font-bold text-stone-900 w-16 text-right">
                          {formatWeight(item.weight_kg)}
                        </span>
                        <span className="text-stone-500 text-[11px] w-10 text-right">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Charts Section: Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Dishes by Waste Volume (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-warm-200/90 p-5 shadow-2xs card-hover hover:border-forest-200/70">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-stone-900">Top Dishes by Waste Volume</h2>
            <p className="text-xs text-stone-500">Dishes contributing the highest cumulative waste</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary?.top_dishes || []}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} unit=" kg" />
                <YAxis
                  type="category"
                  dataKey="dish_name"
                  tick={{ fontSize: 11, fill: '#1c1917' }}
                  width={140}
                />
                <Tooltip
                  formatter={(val: any, _, item: any) => [
                    `${val} kg (${formatCost(item.payload.estimated_cost)})`,
                    'Waste',
                  ]}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                />
                <Bar dataKey="weight_kg" fill="#15803d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waste Source Breakdown */}
        <div className="bg-white rounded-2xl border border-warm-200/90 p-5 shadow-2xs card-hover hover:border-forest-200/70 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Waste-Source Breakdown</h2>
            <p className="text-xs text-stone-500 mb-4">
              Separation of preparation surplus, plate returns, and spoilage
            </p>
            <div className="space-y-3.5">
              {(summary?.by_waste_source || []).map((source) => (
                <div key={source.key} className="group p-2 -mx-2 rounded-xl hover:bg-warm-50/80 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-stone-800 group-hover:text-forest-900 transition-colors">
                      {source.name}
                    </span>
                    <span className="text-stone-500 text-[11px]">
                      {formatWeight(source.weight_kg)} ({source.percentage}%) •{' '}
                      <span className="font-bold text-stone-900">{formatCost(source.estimated_cost)}</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-warm-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-105"
                      style={{
                        width: `${Math.min(100, source.percentage)}%`,
                        backgroundColor: SOURCE_COLORS[source.key] || '#15803d',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3.5 bg-warm-50/80 rounded-xl border border-warm-200 text-xs text-stone-600 flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-stone-800">Surplus Note:</strong> Preparation surplus is avoidable through tighter prep portioning.
              Visit Tomorrow's Prep Planner to optimize batch sizes.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Waste Records Table */}
      <div className="bg-white rounded-2xl border border-warm-200/90 p-5 shadow-2xs card-hover hover:border-forest-200/70">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Recent Waste Events</h2>
            <p className="text-xs text-stone-500">Latest recorded kitchen scale events</p>
          </div>
          <Link
            to="/records"
            className="group/records text-xs font-bold text-forest-700 hover:text-forest-900 flex items-center gap-1.5 transition-colors"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/records:translate-x-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-50/80 border-y border-warm-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Dish / Food Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Waste Source</th>
                <th className="py-2.5 px-3 text-right">Measured Weight</th>
                <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {(summary?.recent_records || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                    No waste records logged for this filter period. Click "Log Waste" to record the first event.
                  </td>
                </tr>
              ) : (
                (summary?.recent_records || []).map((record) => (
                <tr key={record.id} className="group hover:bg-forest-50/40 transition-colors duration-150">
                  <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                    {new Date(record.timestamp).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-stone-900">
                    <div className="flex items-center gap-2.5">
                      {record.image_url ? (
                        <img
                          src={record.image_url}
                          alt={record.dish_name}
                          className="w-7 h-7 rounded-lg object-cover border border-warm-200 shrink-0 transition-transform duration-200 group-hover:scale-115 group-hover:shadow-2xs"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-warm-100 border border-warm-200 flex items-center justify-center text-[10px] text-stone-400 shrink-0 transition-transform duration-200 group-hover:scale-110">
                          AI
                        </div>
                      )}
                      <span className="group-hover:text-forest-900 transition-colors">{record.dish_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600">{record.category}</td>
                  <td className="py-2.5 px-3">
                    <span className="capitalize text-stone-700 bg-warm-100/80 px-2 py-0.5 rounded-md text-[11px] font-medium border border-warm-200">
                      {record.waste_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-stone-900">
                    {formatWeight(record.weight_kg)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-stone-900 group-hover:text-forest-800 transition-colors">
                    {formatCost(record.estimated_cost)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {record.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 bg-forest-50 px-2.5 py-0.5 rounded-full border border-forest-200 group-hover:border-forest-300 group-hover:bg-forest-100/70 transition-colors">
                        <CheckCircle2 className="w-3 h-3 text-forest-600" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
