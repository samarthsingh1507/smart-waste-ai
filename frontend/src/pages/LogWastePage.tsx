import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Calendar,
  Clock,
  ArrowRight,
  ImageIcon,
  Plus,
  Utensils
} from 'lucide-react';

import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { Dish, VisionAnalysis, SampleImage } from '../types';
import { CameraModal } from '../components/common/CameraModal';
import { AddDishModal } from '../components/common/AddDishModal';

export const LogWastePage: React.FC = () => {
  const navigate = useNavigate();
  const { formatCost, settings } = useSettings();

  // State for dishes & sample images
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [sampleImages, setSampleImages] = useState<SampleImage[]>([]);

  // Image upload & preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSampleFilename, setSelectedSampleFilename] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<VisionAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Dish Modal state
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);

  // Form Fields
  const [dishId, setDishId] = useState<number | ''>('');
  const [confirmedDishName, setConfirmedDishName] = useState<string>('');
  const [confirmedCategory, setConfirmedCategory] = useState<string>('Rice & Grains');
  const [wasteType, setWasteType] = useState<'preparation_surplus' | 'plate_returns' | 'spoilage'>('preparation_surplus');
  const [mealPeriod, setMealPeriod] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );

  // Weight entry (Grams vs Kilograms)
  const [weightUnitInput, setWeightUnitInput] = useState<'kg' | 'g'>('kg');
  const [weightValue, setWeightValue] = useState<string>('');

  // Cost & Portion fields
  const [costPerKg, setCostPerKg] = useState<string>('150');
  const [portionsPrepared, setPortionsPrepared] = useState<string>('');
  const [portionsServed, setPortionsServed] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(true);

  // Submission feedback
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDishesAndSamples();
  }, []);

  const loadDishesAndSamples = async () => {
    try {
      const [dishList, samples] = await Promise.all([
        api.getDishes(),
        api.getSampleImages(),
      ]);
      setDishes(dishList);
      setSampleImages(samples);

      if (dishList.length > 0) {
        setDishId(dishList[0].id);
        setConfirmedDishName(dishList[0].name);
        setConfirmedCategory(dishList[0].category);
        setCostPerKg(String(dishList[0].default_cost_per_kg));
      }
    } catch (err) {
      console.error('Error loading dishes or samples:', err);
    }
  };

  // Dish selection change
  const handleDishChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    setDishId(selectedId);
    const d = dishes.find((item) => item.id === selectedId);
    if (d) {
      setConfirmedDishName(d.name);
      setConfirmedCategory(d.category);
      setCostPerKg(String(d.default_cost_per_kg));
    }
  };

  // Callback when a new dish is added via AddDishModal
  const handleDishCreated = (newDish: Dish) => {
    setDishes((prev) => [newDish, ...prev]);
    setDishId(newDish.id);
    setConfirmedDishName(newDish.name);
    setConfirmedCategory(newDish.category);
    setCostPerKg(String(newDish.default_cost_per_kg));
  };

  // Image selection handler
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedSampleFilename('');
    setAiResult(null);
    setAiError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSampleSelect = (filename: string, fullUrl: string) => {
    setSelectedSampleFilename(filename);
    setSelectedFile(null);
    setAiResult(null);
    setAiError(null);
    setPreviewUrl(fullUrl);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setSelectedSampleFilename('');
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run AI Vision Analysis
  const handleAnalyzeImage = async () => {
    if (!selectedFile && !selectedSampleFilename) return;

    setAnalyzing(true);
    setAiError(null);
    try {
      const analysis = await api.analyzeImage(selectedFile, selectedSampleFilename);
      setAiResult(analysis);

      // Auto pre-populate category and dish suggestion
      setConfirmedCategory(analysis.suggested_category);

      // If AI matched a known dish in the DB, link it
      if (analysis.dish_id) {
        setDishId(analysis.dish_id);
        const d = dishes.find((item) => item.id === analysis.dish_id);
        if (d) {
          setConfirmedDishName(d.name);
          if (analysis.default_cost_per_kg) {
            setCostPerKg(String(analysis.default_cost_per_kg));
          }
        }
      } else {
        setConfirmedDishName(analysis.suggested_dish);
      }
    } catch (err: any) {
      console.error('Vision analysis failed:', err);
      setAiError(err.message || 'Vision analysis failed. Please verify category manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Weight in grams calculation
  const getWeightInGrams = (): number => {
    const val = parseFloat(weightValue) || 0;
    return weightUnitInput === 'kg' ? val * 1000 : val;
  };

  // Calculated estimated cost
  const calculatedCost = (): number => {
    const kg = getWeightInGrams() / 1000.0;
    const costKg = parseFloat(costPerKg) || 0;
    return Math.round(kg * costKg * 100) / 100;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const weightGrams = getWeightInGrams();
    if (weightGrams <= 0) {
      setErrorMessage('Please enter a measured waste weight greater than zero.');
      return;
    }

    if (!dishId) {
      setErrorMessage('Please select a food dish or item.');
      return;
    }

    if (!isVerified) {
      setErrorMessage('Please check the verification confirmation box before logging.');
      return;
    }

    setSubmitting(true);
    try {
      const eventTimestamp = `${eventDate}T${eventTime}:00`;

      await api.createWasteEvent({
        timestamp: eventTimestamp,
        dish_id: Number(dishId),
        date: eventDate,
        meal_period: mealPeriod,
        portions_prepared: portionsPrepared ? parseInt(portionsPrepared) : undefined,
        portions_served: portionsServed ? parseInt(portionsServed) : undefined,
        category: confirmedCategory,
        waste_type: wasteType,
        weight_grams: weightGrams,
        ingredient_cost_per_kg: parseFloat(costPerKg) || 0,
        image_url: previewUrl ? (selectedSampleFilename ? `/uploads/${selectedSampleFilename}` : aiResult?.image_url || previewUrl) : undefined,
        ai_suggested_category: aiResult?.suggested_category,
        ai_suggested_dish: aiResult?.suggested_dish,
        staff_confirmed_category: confirmedCategory,
        staff_confirmed_dish: confirmedDishName,
        is_verified: true,
        notes: notes || undefined,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/records');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to log waste event:', err);
      setErrorMessage(err.message || 'Failed to record waste event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-xl border border-warm-200 p-6 shadow-2xs card-hover">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight">
          Record Kitchen Food Waste
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Capture photo → AI identifies category → Staff verifies → Record measured scale weight & meal data.
        </p>
      </div>

      {submitSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-sm animate-pulse-soft">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <p className="font-bold text-sm">Waste Event Logged Successfully!</p>
            <p className="text-xs text-emerald-700">Updating kitchen analytics and redirecting to records table...</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Photo & AI Vision Identification */}
        <div className="bg-white rounded-xl border border-warm-200 p-6 shadow-2xs card-hover space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-forest-700 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                1
              </span>
              <h3 className="font-bold text-stone-900 text-sm">
                Capture Waste Photo & AI Categorization
              </h3>
            </div>

            {/* AI Engine Status badge */}
            {settings.gemini_configured ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 badge-hover shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live Gemini Vision ({settings.gemini_model})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 badge-hover shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Demo Mode Active (Simulated Classifier)
              </span>
            )}
          </div>

          {/* Upload Area / Preview */}
          {!previewUrl ? (
            <div className="group border-2 border-dashed border-warm-300 rounded-xl p-6 text-center hover:border-forest-500 hover:bg-forest-50/20 transition-all duration-300 bg-warm-50/50">
              <UploadCloud className="w-10 h-10 text-stone-400 group-hover:text-forest-600 group-hover:scale-110 transition-all duration-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">
                Drag and drop a food waste photo, or choose capture method
              </p>
              <p className="text-xs text-stone-500 mt-1">JPEG, PNG, or WEBP up to 10MB</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-press inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-warm-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-warm-100 hover:border-forest-400 shadow-2xs"
                >
                  <UploadCloud className="w-4 h-4 text-forest-700" />
                  <span>Browse Device Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="btn-press btn-glow inline-flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Kitchen Camera</span>
                </button>
              </div>

              {/* Sample test images selector */}
              {sampleImages.length > 0 && (
                <div className="mt-6 pt-5 border-t border-warm-200">
                  <p className="text-xs font-semibold text-stone-500 mb-2 flex items-center justify-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
                    <span>Quick Demo: Or test immediately with an illustrative sample image</span>
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {sampleImages.map((s) => (
                      <button
                        key={s.filename}
                        type="button"
                        onClick={() => handleSampleSelect(s.filename, s.url)}
                        className="btn-press text-[11px] font-medium px-2.5 py-1 bg-white hover:bg-forest-50/70 text-stone-700 hover:text-forest-900 border border-warm-300 hover:border-forest-300 rounded-md shadow-2xs hover:shadow-xs transition-all duration-150"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-warm-50 rounded-xl p-4 border border-warm-200 flex flex-col sm:flex-row items-center gap-5">
              <div className="group relative w-40 h-32 rounded-lg overflow-hidden border border-warm-300 bg-stone-900 shrink-0 shadow-2xs">
                <img
                  src={previewUrl}
                  alt="Waste capture preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-stone-600">
                    <span className="font-semibold text-stone-900">
                      {selectedFile ? selectedFile.name : selectedSampleFilename}
                    </span>
                    {selectedFile && (
                      <span className="ml-2 text-stone-400">
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="btn-press text-stone-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={handleAnalyzeImage}
                    className="group btn-press btn-glow inline-flex items-center gap-2 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                    <span>{analyzing ? 'Analyzing Image...' : 'Analyze Image with AI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-press text-xs text-stone-600 hover:text-stone-900 font-medium px-3 py-2 border border-warm-300 rounded-lg bg-white hover:bg-warm-100"
                  >
                    Replace Image
                  </button>
                </div>

                {/* AI Result Card */}
                {aiResult && (
                  <div className="card-hover bg-white rounded-lg p-3.5 border border-forest-200 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-forest-700" />
                        AI Visual Identification
                      </span>
                      <span
                        className={`badge-hover text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-2xs ${
                          aiResult.is_demo_mode
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {aiResult.confidence_label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-stone-700 pt-1">
                      <div>
                        <span className="text-stone-400 block text-[11px]">Suggested Category</span>
                        <span className="font-semibold text-stone-900 text-sm">
                          {aiResult.suggested_category}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">Possible Dish Match</span>
                        <span className="font-semibold text-stone-900 text-sm">
                          {aiResult.suggested_dish}
                        </span>
                      </div>
                    </div>

                    {aiResult.detected_items && aiResult.detected_items.length > 0 && (
                      <div className="pt-1 text-[11px] text-stone-500">
                        <span className="font-medium text-stone-600">Visual elements:</span>{' '}
                        {aiResult.detected_items.join(', ')}
                      </div>
                    )}

                    {aiResult.notes && (
                      <p className="text-[11px] text-stone-500 italic border-t border-warm-100 pt-1.5">
                        {aiResult.notes}
                      </p>
                    )}
                  </div>
                )}

                {aiError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    {aiError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Staff Verification & Dish Details */}
        <div className="bg-white rounded-xl border border-warm-200 p-6 shadow-2xs card-hover space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-forest-700 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              2
            </span>
            <h3 className="font-bold text-stone-900 text-sm">
              Staff Verification & Food Classification
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dish Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-stone-700">
                  Select Dish / Recipe *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddDishModalOpen(true)}
                  className="btn-press inline-flex items-center gap-1 text-[11px] font-bold text-forest-700 hover:text-forest-800 bg-forest-50 hover:bg-forest-100 px-2.5 py-1 rounded-md border border-forest-200 hover:border-forest-300 transition-all shadow-2xs hover:shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Custom Dish</span>
                </button>
              </div>
              <select
                value={dishId}
                onChange={handleDishChange}
                required
                className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              >
                {dishes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.category} - {formatCost(d.default_cost_per_kg)}/kg)
                  </option>
                ))}
              </select>

              {/* Selected Dish Visual Preview Badge */}
              {(() => {
                const currentDish = dishes.find((d) => d.id === dishId);
                if (!currentDish) return null;
                return (
                  <div className="flex items-center gap-2 p-1.5 bg-warm-50 rounded-lg border border-warm-200 text-[11px] text-stone-600 hover:border-forest-300 transition-colors">
                    {currentDish.image_url ? (
                      <img
                        src={currentDish.image_url}
                        alt={currentDish.name}
                        className="w-7 h-7 rounded object-cover border border-warm-300 shrink-0 hover:scale-110 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded bg-warm-200 flex items-center justify-center text-stone-500 shrink-0">
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="truncate font-semibold text-stone-800">
                      {currentDish.name}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="shrink-0 text-stone-500">{currentDish.category}</span>
                    <span className="text-stone-300">•</span>
                    <span className="shrink-0 font-medium text-stone-700">
                      {formatCost(currentDish.default_cost_per_kg)}/kg
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Confirmed Food Category */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Confirmed Food Category *
              </label>
              <select
                value={confirmedCategory}
                onChange={(e) => setConfirmedCategory(e.target.value)}
                required
                className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              >
                <option value="Rice & Grains">Rice & Grains</option>
                <option value="Curries & Gravies">Curries & Gravies</option>
                <option value="Breads & Flatbreads">Breads & Flatbreads</option>
                <option value="Salads & Starters">Salads & Starters</option>
                <option value="Vegetables & Sides">Vegetables & Sides</option>
                <option value="Desserts & Sweets">Desserts & Sweets</option>
                <option value="Soups & Beverages">Soups & Beverages</option>
              </select>
            </div>

            {/* Waste Type / Source */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Waste Source / Type *
              </label>
              <select
                value={wasteType}
                onChange={(e: any) => setWasteType(e.target.value)}
                required
                className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              >
                <option value="preparation_surplus">
                  Preparation Surplus (Unserved from kitchen counter/batch)
                </option>
                <option value="plate_returns">
                  Customer Plate Returns (Dining table leftovers)
                </option>
                <option value="spoilage">
                  Storage & Spoilage (Cold storage inspection/damaged)
                </option>
              </select>
            </div>

            {/* Meal Period */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Meal Service Period *
              </label>
              <select
                value={mealPeriod}
                onChange={(e: any) => setMealPeriod(e.target.value)}
                required
                className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Event Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Event Time
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Measured Scale Weight & Cost Calculation */}
        <div className="bg-white rounded-xl border border-warm-200 p-6 shadow-2xs card-hover space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-forest-700 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                3
              </span>
              <h3 className="font-bold text-stone-900 text-sm">
                Measured Weight & Cost Estimation
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-medium flex items-center gap-1 group">
              <Scale className="w-3.5 h-3.5 text-forest-700 group-hover:scale-110 transition-transform" />
              Physical Kitchen Scale Reading
            </span>
          </div>

          {/* Strict AI disclaimer banner */}
          <div className="p-3 bg-warm-100 rounded-lg border border-warm-200 text-xs text-stone-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <p>
              <strong>Important Principle:</strong> AI image analysis never estimates weight.
              Enter the exact reading measured on your physical kitchen scale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Weight Input with unit toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700">
                  Measured Scale Weight *
                </label>
                <div className="inline-flex rounded border border-warm-300 text-[11px] overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setWeightUnitInput('kg')}
                    className={`btn-press px-2 py-0.5 transition-colors ${
                      weightUnitInput === 'kg'
                        ? 'bg-forest-700 text-white font-bold'
                        : 'bg-white text-stone-600 hover:bg-warm-100'
                    }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnitInput('g')}
                    className={`btn-press px-2 py-0.5 transition-colors ${
                      weightUnitInput === 'g'
                        ? 'bg-forest-700 text-white font-bold'
                        : 'bg-white text-stone-600 hover:bg-warm-100'
                    }`}
                  >
                    grams
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={weightUnitInput === 'kg' ? 'e.g. 2.45' : 'e.g. 2450'}
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                className="w-full text-sm bg-white border border-warm-300 rounded-lg p-2.5 font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              />
            </div>

            {/* Ingredient Cost per kg */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ingredient Cost / kg ({settings.currency})
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={costPerKg}
                onChange={(e) => setCostPerKg(e.target.value)}
                className="w-full text-sm bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
              />
            </div>

            {/* Computed Estimated Waste Cost Card */}
            <div className="card-hover bg-warm-50 rounded-lg p-3 border border-warm-200 flex flex-col justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Estimated Waste Cost
              </span>
              <span className="text-xl font-bold text-stone-900 mt-0.5">
                {formatCost(calculatedCost())}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5">
                Formula: {(getWeightInGrams() / 1000).toFixed(2)} kg × {settings.currency}
                {costPerKg || 0}
              </span>
            </div>
          </div>

          {/* Section 4: Meal Service Portions (Prepared vs Served) */}
          <div className="pt-3 border-t border-warm-200">
            <h4 className="text-xs font-bold text-stone-800 mb-2">
              Associated Meal Service Records (Feeds Prep Prediction Engine)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-stone-600 mb-1">
                  Portions Prepared (Total batch size)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={portionsPrepared}
                  onChange={(e) => setPortionsPrepared(e.target.value)}
                  className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-600 mb-1">
                  Portions Served (Customer consumption)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 42"
                  value={portionsServed}
                  onChange={(e) => setPortionsServed(e.target.value)}
                  className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Operational Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. End of banquet service hot well remainder, customer complained of spice"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-white border border-warm-300 rounded-lg p-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
            />
          </div>

          {/* Human verification checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="w-4 h-4 text-forest-700 rounded border-warm-300 focus:ring-forest-700 cursor-pointer"
              />
              <span className="text-xs font-semibold text-stone-800 group-hover:text-forest-900 transition-colors">
                Staff Verification: I confirm that the food category and scale weight have been verified by kitchen staff.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-press px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="group btn-press btn-glow inline-flex items-center gap-2 px-6 py-2.5 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>{submitting ? 'Recording Event...' : 'Record Waste Event'}</span>
          </button>
        </div>
      </form>
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleFileSelect}
      />
      <AddDishModal
        isOpen={isAddDishModalOpen}
        onClose={() => setIsAddDishModalOpen(false)}
        onDishCreated={handleDishCreated}
      />
    </div>
  );
};
