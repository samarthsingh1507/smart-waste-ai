import React, { useState, useRef } from 'react';
import { X, UploadCloud, Utensils, CheckCircle2, AlertCircle, Trash2, IndianRupee } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { api } from '../../services/api';
import { Dish } from '../../types';

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDishCreated: (dish: Dish) => void;
}

const DEFAULT_CATEGORIES = [
  'Rice & Grains',
  'Curries & Gravies',
  'Breads & Flatbreads',
  'Salads & Starters',
  'Vegetables & Sides',
  'Desserts & Sweets',
  'Soups & Beverages',
  'Main Course',
  'Snacks & Appetizers',
];

export const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  onDishCreated,
}) => {
  const { settings } = useSettings();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Rice & Grains');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [defaultCostPerKg, setDefaultCostPerKg] = useState('150');
  const [description, setDescription] = useState('');

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter a valid dish name (at least 2 characters).');
      return;
    }

    const costNum = parseFloat(defaultCostPerKg);
    if (isNaN(costNum) || costNum < 0) {
      setErrorMessage('Please enter a valid ingredient cost per kilogram (0 or greater).');
      return;
    }

    const finalCategory = isCustomCategory
      ? (customCategory.trim() || 'Other')
      : category;

    setSaving(true);
    try {
      let uploadedImageUrl: string | undefined = undefined;

      // 1. Upload photo if selected
      if (photoFile) {
        const uploadRes = await api.uploadDishPhoto(photoFile);
        uploadedImageUrl = uploadRes.image_url;
      }

      // 2. Create dish in database
      const newDish = await api.createDish({
        name: trimmedName,
        category: finalCategory,
        default_cost_per_kg: costNum,
        description: description.trim() || undefined,
        image_url: uploadedImageUrl,
        is_active: true,
      });

      onDishCreated(newDish);
      handleResetForm();
      onClose();
    } catch (err: any) {
      console.error('Failed to create dish:', err);
      setErrorMessage(err.message || 'Failed to save dish. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setCategory('Rice & Grains');
    setCustomCategory('');
    setIsCustomCategory(false);
    setDefaultCostPerKg('150');
    setDescription('');
    clearPhoto();
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-2xs transition-opacity"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-warm-200 max-w-lg w-full overflow-hidden z-10 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-700 text-white flex items-center justify-center shadow-xs">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base leading-tight">Add Custom Dish</h3>
              <p className="text-xs text-stone-500">Define dish name, category, pricing, and photo</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!saving) onClose();
            }}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dish Name */}
          <div>
            <label className="block font-bold text-stone-800 mb-1">
              Dish Name (Your restaurant's custom name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Mughlai Paneer, Grandma's Special Dal, Midnight Biryani"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-warm-300 rounded-lg p-2.5 font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700 text-sm"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-800 mb-1">Food Category *</label>
              <select
                value={isCustomCategory ? '__custom__' : category}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setCategory(e.target.value);
                  }
                }}
                className="w-full bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-700"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Custom Category...</option>
              </select>
            </div>

            {/* Custom Category Input if selected */}
            {isCustomCategory && (
              <div>
                <label className="block font-bold text-stone-800 mb-1">Custom Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Street Food, Tandoor Special"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            )}

            {/* Default Ingredient Cost / kg */}
            <div className={!isCustomCategory ? 'sm:col-span-1' : ''}>
              <label className="block font-bold text-stone-800 mb-1">
                Cost per kg ({settings.currency}) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                placeholder="e.g. 180"
                value={defaultCostPerKg}
                onChange={(e) => setDefaultCostPerKg(e.target.value)}
                className="w-full bg-white border border-warm-300 rounded-lg p-2.5 font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700 text-sm"
              />
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <label className="block font-bold text-stone-800 mb-1">
              Description / Recipe Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked with cashew paste, cardamom and slow-braised onions"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-warm-300 rounded-lg p-2.5 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-700"
            />
          </div>

          {/* Dish Picture Upload */}
          <div>
            <label className="block font-bold text-stone-800 mb-1">
              Dish Picture (Optional)
            </label>

            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-warm-300 hover:border-forest-500 rounded-xl p-4 text-center cursor-pointer bg-warm-50/50 hover:bg-forest-50/30 transition-all duration-300"
              >
                <UploadCloud className="w-7 h-7 text-stone-400 group-hover:text-forest-600 group-hover:scale-110 transition-all duration-300 mx-auto mb-1.5" />
                <p className="font-semibold text-stone-700 text-xs">
                  Click to choose a photo of this dish
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">JPEG, PNG, or WEBP up to 10MB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoSelect(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="card-hover flex items-center gap-4 bg-warm-50 p-3 rounded-xl border border-warm-200 shadow-2xs">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-warm-300 bg-stone-900 shrink-0">
                  <img
                    src={photoPreview}
                    alt="Dish preview"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 truncate">
                    {photoFile ? photoFile.name : 'Dish Photo'}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {photoFile ? `${Math.round(photoFile.size / 1024)} KB` : 'Ready to attach'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="btn-press p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove picture"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-warm-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                handleResetForm();
                onClose();
              }}
              className="btn-press px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="group btn-press btn-glow inline-flex items-center gap-1.5 px-5 py-2.5 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>{saving ? 'Adding Dish...' : 'Add Dish to Menu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
