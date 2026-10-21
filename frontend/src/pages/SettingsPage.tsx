import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  DollarSign,
  Scale,
  Building,
  RotateCcw,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Save,
  Key,
  Utensils,
  Plus,
  Trash2,
  Search
} from 'lucide-react';

import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { Dialog } from '../components/common/Dialog';
import { AddDishModal } from '../components/common/AddDishModal';
import { Dish } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, refreshSettings } = useSettings();

  // Local form state
  const [outletName, setOutletName] = useState(settings.outlet_name);
  const [currency, setCurrency] = useState(settings.currency);
  const [weightUnit, setWeightUnit] = useState(settings.weight_unit);
  const [safetyBuffer, setSafetyBuffer] = useState<number>(settings.safety_buffer_percent);
  const [geminiModel, setGeminiModel] = useState(settings.gemini_model);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Restore demo data dialog state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Dishes management state
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [dishSearch, setDishSearch] = useState('');
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [dishActionMessage, setDishActionMessage] = useState<string | null>(null);

  // Test Vision State
  const [testingVision, setTestingVision] = useState(false);
  const [visionTestResult, setVisionTestResult] = useState<any>(null);

  useEffect(() => {
    setOutletName(settings.outlet_name);
    setCurrency(settings.currency);
    setWeightUnit(settings.weight_unit);
    setSafetyBuffer(settings.safety_buffer_percent);
    setGeminiModel(settings.gemini_model);
  }, [settings]);

  const loadDishes = async () => {
    setLoadingDishes(true);
    try {
      const data = await api.getDishes();
      setDishes(data);
    } catch (err) {
      console.error('Failed to load dishes:', err);
    } finally {
      setLoadingDishes(false);
    }
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const handleDishCreated = (newDish: Dish) => {
    setDishes((prev) => [newDish, ...prev]);
    setDishActionMessage(`"${newDish.name}" added to menu successfully!`);
    setTimeout(() => setDishActionMessage(null), 3500);
  };

  const handleDeleteDish = async (dishId: number, dishName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${dishName}" from your active menu?`)) {
      return;
    }
    try {
      const res = await api.deleteDish(dishId);
      setDishActionMessage(res.message);
      setTimeout(() => setDishActionMessage(null), 3500);
      await loadDishes();
    } catch (err: any) {
      alert(err.message || 'Failed to remove dish.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings({
        outlet_name: outletName,
        currency,
        weight_unit: weightUnit,
        safety_buffer_percent: Number(safetyBuffer),
        gemini_model: geminiModel,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemoData();
      await refreshSettings();
      setIsResetDialogOpen(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to restore demo dataset:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleTestVision = async () => {
    setTestingVision(true);
    setVisionTestResult(null);
    try {
      const res = await api.analyzeImage(undefined, 'sample_biryani.jpg');
      setVisionTestResult(res);
    } catch (err: any) {
      setVisionTestResult({ error: err.message || 'Vision test failed.' });
    } finally {
      setTestingVision(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 p-6 shadow-2xs">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight">
          Kitchen & AI Operational Settings
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Configure safety buffers, currency, units, outlet details, and inspect AI vision engine connection.
        </p>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-2xs animate-pulse-soft">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>Operational settings updated successfully! New values are persisted.</span>
        </div>
      )}

      {resetSuccess && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3 text-amber-900 text-xs font-semibold shadow-2xs animate-pulse-soft">
          <CheckCircle2 className="w-4 h-4 text-amber-700" />
          <span>Demo dataset restored successfully with 30 days of clean illustrative records!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Card 1: Kitchen Outlet & Presentation Settings */}
        <div className="card-hover bg-white rounded-xl border border-warm-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-warm-100 pb-3">
            <div className="p-1.5 bg-forest-50 text-forest-700 rounded-lg border border-forest-200 shadow-2xs">
              <Building className="w-4 h-4 text-forest-700" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">Kitchen & Display Preferences</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Kitchen Name */}
            <div className="sm:col-span-3">
              <label className="block font-semibold text-stone-700 mb-1">
                Kitchen / Outlet Name
              </label>
              <input
                type="text"
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                required
                className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700 shadow-2xs transition-colors"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-lg p-2.5 font-bold text-stone-900 shadow-2xs transition-colors"
              >
                <option value="₹">₹ (INR - Indian Rupee)</option>
                <option value="$">$ (USD - US Dollar)</option>
                <option value="€">€ (EUR - Euro)</option>
                <option value="£">£ (GBP - British Pound)</option>
                <option value="AED">AED (Emirati Dirham)</option>
              </select>
            </div>

            {/* Weight Units */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Display Weight Units
              </label>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-lg p-2.5 font-bold text-stone-900 shadow-2xs transition-colors"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
              </select>
            </div>

            {/* Safety Buffer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-stone-700">
                  Prep Safety Buffer (%)
                </label>
                <span className="font-bold text-forest-700">{safetyBuffer}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-lg p-2.5 font-bold text-stone-900 shadow-2xs transition-colors"
              />
            </div>
          </div>
          <p className="text-[11px] text-stone-400">
            The safety buffer is applied on top of 4-week weekday served portions to calculate prep quantities.
          </p>
        </div>

        {/* Card 2: AI Vision Engine Settings */}
        <div className="card-hover bg-white rounded-xl border border-warm-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-forest-50 text-forest-700 rounded-lg border border-forest-200 shadow-2xs">
                <Bot className="w-4 h-4 text-forest-700" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm">AI Vision Service Configuration</h3>
            </div>

            {settings.gemini_configured ? (
              <span className="badge-hover inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live Gemini API Active
              </span>
            ) : (
              <span className="badge-hover inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Demo Mode Active (API Key Not Set)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Gemini Vision Model
              </label>
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                placeholder="gemini-2.0-flash"
                className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-lg p-2.5 font-medium text-stone-900 shadow-2xs transition-colors"
              />
            </div>

            <div className="bg-warm-50 rounded-lg p-3 border border-warm-200 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
                API Key Security Status
              </span>
              <p className="text-stone-800 mt-1 font-medium">
                {settings.gemini_configured
                  ? 'Configured in backend environment (Never exposed to client).'
                  : 'Operating with transparent kitchen demo fallback classifier.'}
              </p>
            </div>
          </div>

          {/* Test Vision Engine Button */}
          <div className="pt-2 flex items-center justify-between border-t border-warm-100">
            <button
              type="button"
              disabled={testingVision}
              onClick={handleTestVision}
              className="btn-press inline-flex items-center gap-2 px-3.5 py-2 bg-warm-100 hover:bg-forest-50 hover:text-forest-800 hover:border-forest-300 text-stone-800 rounded-lg text-xs font-semibold border border-warm-300 transition-all shadow-2xs disabled:opacity-50"
            >
              <Bot className="w-3.5 h-3.5 text-forest-700" />
              <span>{testingVision ? 'Testing Vision Engine...' : 'Test Vision Engine Classification'}</span>
            </button>

            <span className="text-[11px] text-stone-500">
              To activate genuine Gemini analysis: add <code className="text-stone-800 font-bold">GEMINI_API_KEY</code> to backend <code className="text-stone-800">.env</code>.
            </span>
          </div>

          {visionTestResult && (
            <div className="card-hover p-3 bg-warm-50 rounded-lg border border-warm-200 text-xs text-stone-700 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900">Vision Test Result:</span>
                <span className="font-semibold text-forest-700">{visionTestResult.confidence_label}</span>
              </div>
              <p>
                Identified: <strong>{visionTestResult.suggested_dish}</strong> ({visionTestResult.suggested_category})
              </p>
              {visionTestResult.notes && (
                <p className="text-[11px] text-stone-500 italic">{visionTestResult.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="group btn-press btn-glow inline-flex items-center gap-2 px-6 py-2.5 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Card: Restaurant Menu & Custom Dishes Management */}
      {(() => {
        const filteredDishes = dishes.filter((d) => {
          if (!dishSearch.trim()) return true;
          const query = dishSearch.toLowerCase();
          return (
            d.name.toLowerCase().includes(query) ||
            d.category.toLowerCase().includes(query) ||
            (d.description && d.description.toLowerCase().includes(query))
          );
        });

        return (
          <div className="card-hover bg-white rounded-xl border border-warm-200 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-forest-50 text-forest-700 rounded-lg border border-forest-200 shadow-2xs">
                  <Utensils className="w-4 h-4 text-forest-700" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Restaurant Menu & Custom Dishes</h3>
                  <p className="text-xs text-stone-500">
                    Add new dishes on your own terms with custom name, ingredient price, and dish photo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-warm-50 border border-warm-300 hover:border-warm-400 rounded-lg text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-forest-700 w-40 sm:w-48 shadow-2xs transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDishModalOpen(true)}
                  className="btn-press btn-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Dish</span>
                </button>
              </div>
            </div>

            {dishActionMessage && (
              <div className="bg-forest-50 border border-forest-200 rounded-lg p-3 flex items-center gap-2 text-forest-900 text-xs font-semibold animate-pulse-soft">
                <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
                <span>{dishActionMessage}</span>
              </div>
            )}

            {/* Dishes Grid */}
            {loadingDishes ? (
              <div className="py-8 text-center text-stone-400 text-xs font-medium">
                Loading kitchen dishes...
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs bg-warm-50/50 rounded-xl border border-dashed border-warm-200">
                {dishSearch ? 'No dishes match your search.' : 'No custom dishes added yet. Click "+ Add New Dish" to add one!'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="card-hover bg-warm-50/70 hover:bg-white border border-warm-200 hover:border-forest-300 rounded-xl p-3 flex items-start gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs group relative"
                  >
                    {/* Dish Photo or Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-warm-300 bg-stone-100 shrink-0 flex items-center justify-center shadow-2xs">
                      {dish.image_url ? (
                        <img
                          src={dish.image_url}
                          alt={dish.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <Utensils className="w-5 h-5 text-stone-400 group-hover:text-forest-700 transition-colors" />
                      )}
                    </div>

                    {/* Dish Details */}
                    <div className="flex-1 min-w-0 pr-5">
                      <h4 className="font-bold text-stone-900 text-xs truncate group-hover:text-forest-900 transition-colors" title={dish.name}>
                        {dish.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="badge-hover text-[10px] font-medium px-1.5 py-0.5 bg-white border border-warm-200 rounded text-stone-600 shadow-2xs">
                          {dish.category}
                        </span>
                        <span className="text-[11px] font-bold text-forest-800">
                          {settings.currency}{dish.default_cost_per_kg}/kg
                        </span>
                      </div>
                      {dish.description && (
                        <p className="text-[10px] text-stone-500 line-clamp-1 mt-1 italic">
                          {dish.description}
                        </p>
                      )}
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDish(dish.id, dish.name)}
                      className="btn-press opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-all absolute top-2.5 right-2.5"
                      title="Deactivate / remove dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Card 3: Danger / Reset Demo Data Zone */}
      <div className="card-hover bg-white rounded-xl border border-red-200 p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Demo Data Management</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Restore clean 30-day illustrative dataset for testing kitchen operations workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsResetDialogOpen(true)}
            className="btn-press inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 hover:border-red-400 rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Demo Dataset</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleRestoreDemo}
        title="Restore Demo Dataset"
        description="This will clear recent manual waste entries and reseed the database with 30 days of representative commercial kitchen records. This is safe to run anytime for testing."
        confirmText="Yes, Restore Demo Data"
        variant="warning"
        isLoading={resetting}
      />

      {/* Add Custom Dish Modal */}
      <AddDishModal
        isOpen={isAddDishModalOpen}
        onClose={() => setIsAddDishModalOpen(false)}
        onDishCreated={handleDishCreated}
      />
    </div>
  );
};
