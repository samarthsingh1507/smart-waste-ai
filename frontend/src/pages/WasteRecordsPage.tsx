import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { WasteEvent, Dish } from '../types';
import { Dialog } from '../components/common/Dialog';

export const WasteRecordsPage: React.FC = () => {
  const { formatCost, formatWeight, settings } = useSettings();

  const [records, setRecords] = useState<WasteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterWasteType, setFilterWasteType] = useState('');
  const [filterMealPeriod, setFilterMealPeriod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'timestamp' | 'weight_kg' | 'estimated_cost'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [viewingRecord, setViewingRecord] = useState<WasteEvent | null>(null);
  const [editingRecord, setEditingRecord] = useState<WasteEvent | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editWeightGrams, setEditWeightGrams] = useState<string>('');
  const [editCostPerKg, setEditCostPerKg] = useState<string>('');
  const [editWasteType, setEditWasteType] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getWasteEvents({
        search: searchTerm || undefined,
        category: filterCategory || undefined,
        waste_type: filterWasteType || undefined,
        meal_period: filterMealPeriod || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: 150,
      });
      setRecords(data);
    } catch (err: any) {
      console.error('Failed to fetch records:', err);
      setFetchError(err.message || 'Unable to load waste records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [searchTerm, filterCategory, filterWasteType, filterMealPeriod, dateFrom, dateTo]);

  // Sorting logic
  const sortedRecords = [...records].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'timestamp') {
      comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortField === 'weight_kg') {
      comparison = a.weight_grams - b.weight_grams;
    } else if (sortField === 'estimated_cost') {
      comparison = a.estimated_cost - b.estimated_cost;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'timestamp' | 'weight_kg' | 'estimated_cost') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Open Edit Modal
  const openEditModal = (r: WasteEvent) => {
    setEditingRecord(r);
    setEditWeightGrams(String(r.weight_grams));
    setEditCostPerKg(String(r.ingredient_cost_per_kg));
    setEditWasteType(r.waste_type);
    setEditCategory(r.category);
    setEditNotes(r.notes || '');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      const updated = await api.updateWasteEvent(editingRecord.id, {
        weight_grams: parseFloat(editWeightGrams),
        ingredient_cost_per_kg: parseFloat(editCostPerKg),
        waste_type: editWasteType as any,
        category: editCategory,
        notes: editNotes,
      });

      setRecords((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingRecord(null);
    } catch (err) {
      console.error('Failed to update waste record:', err);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.deleteWasteEvent(deletingId);
      setRecords((prev) => prev.filter((item) => item.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete waste record:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculated totals of matching records
  const totalFilteredWeight = sortedRecords.reduce((acc, r) => acc + r.weight_kg, 0);
  const totalFilteredCost = sortedRecords.reduce((acc, r) => acc + r.estimated_cost, 0);

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by dish name, category, or kitchen notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-warm-50 border border-warm-300 hover:border-warm-400 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700 font-medium transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-500 shrink-0 bg-warm-50/80 px-3 py-1.5 rounded-lg border border-warm-200">
            <span>
              Showing <strong className="text-stone-900 font-bold">{sortedRecords.length}</strong> records
            </span>
            <span>•</span>
            <span>
              Total: <strong className="text-forest-900 font-bold">{formatWeight(totalFilteredWeight)}</strong>
            </span>
            <span>•</span>
            <span>
              Cost: <strong className="text-forest-900 font-bold">{formatCost(totalFilteredCost)}</strong>
            </span>
          </div>
        </div>

        {/* Detailed Filter Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-warm-100 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-md p-1.5 font-medium text-stone-700 shadow-2xs"
            >
              <option value="">All Categories</option>
              <option value="Rice & Grains">Rice & Grains</option>
              <option value="Curries & Gravies">Curries & Gravies</option>
              <option value="Breads & Flatbreads">Breads</option>
              <option value="Salads & Starters">Salads</option>
              <option value="Vegetables & Sides">Vegetables</option>
              <option value="Desserts & Sweets">Desserts</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Waste Type</label>
            <select
              value={filterWasteType}
              onChange={(e) => setFilterWasteType(e.target.value)}
              className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-md p-1.5 font-medium text-stone-700 shadow-2xs"
            >
              <option value="">All Types</option>
              <option value="preparation_surplus">Preparation Surplus</option>
              <option value="plate_returns">Plate Returns</option>
              <option value="spoilage">Storage & Spoilage</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Meal Period</label>
            <select
              value={filterMealPeriod}
              onChange={(e) => setFilterMealPeriod(e.target.value)}
              className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-md p-1.5 font-medium text-stone-700 shadow-2xs"
            >
              <option value="">All Periods</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-md p-1 text-[11px] font-medium text-stone-700 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-white border border-warm-300 hover:border-warm-400 rounded-md p-1 text-[11px] font-medium text-stone-700 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={fetchRecords}
            className="px-3 py-1 bg-white hover:bg-red-100 text-red-800 border border-red-300 rounded font-semibold text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Records Table */}
      <div className="card-hover bg-white rounded-xl border border-warm-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-100 border-b border-warm-200 text-stone-600 font-bold uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('timestamp')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-warm-200/70 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date / Time</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5">Dish / Food Item</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Source / Type</th>
                <th
                  onClick={() => handleSort('weight_kg')}
                  className="py-3 px-3.5 text-right cursor-pointer hover:bg-warm-200/70 select-none transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Measured Weight</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('estimated_cost')}
                  className="py-3 px-3.5 text-right cursor-pointer hover:bg-warm-200/70 select-none transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Estimated Cost</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 text-sm">
                    No waste records found matching the specified filters.
                  </td>
                </tr>
              ) : (
                sortedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-forest-50/20 group transition-all duration-150">
                    <td className="py-3 px-3.5 text-stone-600 whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-stone-900">
                      <div className="flex items-center gap-2.5">
                        {r.image_url ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-warm-200 shrink-0 shadow-2xs">
                            <img
                              src={r.image_url}
                              alt={r.dish_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-warm-100 border border-warm-200 flex items-center justify-center text-[10px] text-stone-400 shrink-0 group-hover:bg-warm-200 transition-colors">
                            AI
                          </div>
                        )}
                        <div>
                          <span className="group-hover:text-forest-900 transition-colors">{r.dish_name}</span>
                          {r.notes && (
                            <p className="text-[11px] text-stone-400 font-normal truncate max-w-xs">
                              {r.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-stone-600">{r.category}</td>
                    <td className="py-3 px-3.5">
                      <span className="capitalize text-stone-700 bg-warm-100 px-2 py-0.5 rounded text-[11px] font-medium border border-warm-200 shadow-2xs">
                        {r.waste_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-stone-900">
                      {formatWeight(r.weight_kg)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-stone-900 group-hover:text-forest-800 transition-colors">
                      {formatCost(r.estimated_cost)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {r.is_verified ? (
                        <span className="badge-hover inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <span className="badge-hover inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingRecord(r)}
                          title="View Details"
                          className="btn-press p-1.5 text-stone-400 hover:text-stone-800 hover:bg-warm-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          title="Edit Record"
                          className="btn-press p-1.5 text-stone-400 hover:text-forest-700 hover:bg-forest-50 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(r.id)}
                          title="Delete Record"
                          className="btn-press p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setViewingRecord(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl border border-warm-200 max-w-lg w-full p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Waste Event Details</h3>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingRecord.image_url && (
              <div className="rounded-lg overflow-hidden border border-warm-200 bg-stone-900 max-h-56 flex items-center justify-center">
                <img
                  src={viewingRecord.image_url}
                  alt={viewingRecord.dish_name}
                  className="w-full h-full object-contain max-h-56"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 block font-medium">Dish Name</span>
                <span className="font-bold text-stone-900 text-sm">
                  {viewingRecord.dish_name}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Food Category</span>
                <span className="font-bold text-stone-900 text-sm">
                  {viewingRecord.category}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">AI Suggested Category</span>
                <span className="text-stone-700">
                  {viewingRecord.ai_suggested_category || 'Direct Manual Log'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Waste Source</span>
                <span className="text-stone-700 capitalize">
                  {viewingRecord.waste_type.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Measured Weight</span>
                <span className="font-bold text-stone-900">
                  {formatWeight(viewingRecord.weight_kg)} ({viewingRecord.weight_grams} g)
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Estimated Cost</span>
                <span className="font-bold text-stone-900">
                  {formatCost(viewingRecord.estimated_cost)}
                </span>
              </div>
              {viewingRecord.portions_prepared !== null && (
                <div>
                  <span className="text-stone-400 block font-medium">Portions Prepared</span>
                  <span className="text-stone-700">{viewingRecord.portions_prepared} portions</span>
                </div>
              )}
              {viewingRecord.portions_served !== null && (
                <div>
                  <span className="text-stone-400 block font-medium">Portions Served</span>
                  <span className="text-stone-700">{viewingRecord.portions_served} portions</span>
                </div>
              )}
            </div>

            {viewingRecord.notes && (
              <div className="p-3 bg-warm-50 rounded-lg border border-warm-200 text-xs">
                <span className="font-semibold text-stone-600 block mb-1">Kitchen Notes:</span>
                <p className="text-stone-800">{viewingRecord.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-stone-700 font-semibold text-xs rounded-lg border border-warm-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setEditingRecord(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl border border-warm-200 max-w-md w-full p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Edit Waste Record #{editingRecord.id}</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Measured Weight (grams)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={editWeightGrams}
                  onChange={(e) => setEditWeightGrams(e.target.value)}
                  className="w-full p-2 border border-warm-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Ingredient Cost per kg ({settings.currency})</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={editCostPerKg}
                  onChange={(e) => setEditCostPerKg(e.target.value)}
                  className="w-full p-2 border border-warm-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Waste Type</label>
                <select
                  value={editWasteType}
                  onChange={(e) => setEditWasteType(e.target.value)}
                  className="w-full p-2 border border-warm-300 rounded-lg"
                >
                  <option value="preparation_surplus">Preparation Surplus</option>
                  <option value="plate_returns">Customer Plate Returns</option>
                  <option value="spoilage">Storage & Spoilage</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Food Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2 border border-warm-300 rounded-lg"
                >
                  <option value="Rice & Grains">Rice & Grains</option>
                  <option value="Curries & Gravies">Curries & Gravies</option>
                  <option value="Breads & Flatbreads">Breads & Flatbreads</option>
                  <option value="Salads & Starters">Salads & Starters</option>
                  <option value="Vegetables & Sides">Vegetables & Sides</option>
                  <option value="Desserts & Sweets">Desserts & Sweets</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2 border border-warm-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-warm-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3 py-2 text-stone-600 hover:bg-warm-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white font-bold rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Waste Record"
        description="Are you sure you want to permanently delete this waste event? All linked portion metrics and dashboard analytics will recalculate immediately."
        confirmText="Delete Record"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
