/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Category } from '../types';
import * as LucideIcons from 'lucide-react';
import { Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const HABIT_ICONS = [
  { name: 'Dumbbell', desc: 'Workout / Gym' },
  { name: 'BookOpen', desc: 'Reading / Learn' },
  { name: 'Brain', desc: 'Mindfulness / Focus' },
  { name: 'Apple', desc: 'Diet / Nutrition' },
  { name: 'GlassWater', desc: 'Hydration' },
  { name: 'Code', desc: 'Coding / Building' },
  { name: 'Clock', desc: 'Early Rise / Time' },
  { name: 'CircleDollarSign', desc: 'Finances' },
  { name: 'Heart', desc: 'Social / Soul' },
  { name: 'Bed', desc: 'Rest / Sleep' },
  { name: 'Sparkles', desc: 'Growth / Aura' },
  { name: 'Activity', desc: 'General Cardio' },
];

const HABIT_COLORS = [
  { name: 'emerald', bgClass: 'bg-emerald-500', hex: '#10b981' },
  { name: 'indigo', bgClass: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'rose', bgClass: 'bg-rose-500', hex: '#f43f5e' },
  { name: 'blue', bgClass: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'amber', bgClass: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'violet', bgClass: 'bg-violet-500', hex: '#8b5cf6' },
  { name: 'orange', bgClass: 'bg-orange-500', hex: '#f97316' },
  { name: 'teal', bgClass: 'bg-teal-500', hex: '#14b8a6' },
];

interface CategoryAdminProps {
  categories: Category[];
  onAddCategory: (name: string, icon: string, color: string) => void;
  onEditCategory: (id: string, name: string, icon: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
}

export default function CategoryAdmin({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryAdminProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('Dumbbell');
  const [formColor, setFormColor] = useState('emerald');

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormIcon('Dumbbell');
    setFormColor('emerald');
    setIsOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setIsOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      onEditCategory(editingId, formName.trim(), formIcon, formColor);
    } else {
      onAddCategory(formName.trim(), formIcon, formColor);
    }
    setIsOpen(false);
  };

  const renderIcon = (iconName: string, size = 16) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Activity;
    return <IconComponent size={size} />;
  };

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  };

  return (
    <div className="mt-8" id="category-admin-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
        <div>
          <h2 className="text-white font-sans font-medium text-lg tracking-tight">
            Manage Discipline Categories
          </h2>
          <p className="text-gray-500 text-xs font-sans mt-0.5">
            Configure habits, daily goals, and structural guidelines of your routine.
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-emerald-600 text-white font-sans font-semibold text-xs hover:bg-emerald-550 active:scale-98 transition-all shadow-md cursor-pointer"
          id="add-category-btn"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 border border-dashed border-white/10 rounded-3xl bg-[#0C0E12] text-center" id="empty-categories-banner">
          <p className="text-sm font-sans font-medium text-gray-400">No discipline categories created yet.</p>
          <p className="text-xs text-gray-500 mt-1">Configure habits like 'Morning Exercise', 'Healthy eating', or 'Deep work' to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="categories-grid-list">
          {categories.map((cat) => {
            const styleClass = colorMap[cat.color] || 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            const colorPrefix = cat.color || 'indigo';

            return (
              <div
                key={cat.id}
                className="p-4.5 rounded-2xl border border-white/5 bg-[#0C0E12] flex items-center justify-between group hover:border-white/10 transition-all duration-300 animate-fade-in"
                id={`cat-item-${cat.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`p-2.5 rounded-xl ${styleClass.split(' ')[0]} ${styleClass.split(' ')[1]} shrink-0`}>
                    {renderIcon(cat.icon, 16)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      {colorPrefix}
                    </p>
                    <p className="text-sm font-sans font-medium text-white truncate pr-1">
                      {cat.name}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Edit category"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-2 rounded-xl text-rose-450 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Creation / Modification Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="category-modal">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg bg-[#0C0E12] border border-white/5 rounded-3xl shadow-xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-sans font-medium text-white">
                    {editingId ? 'Edit Tracked Category' : 'Create Tracked Category'}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Configure a clear name, color scheme, and graphic icon.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Text Input */}
                <div className="space-y-1.5">
                  <label htmlFor="cat-name-input" className="block text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] font-medium">
                    Category Name (e.g. Daily Gym Workout)
                  </label>
                  <input
                    id="cat-name-input"
                    type="text"
                    required
                    maxLength={32}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Wake up at 5:00 AM..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0A0C10] text-sm text-gray-200 placeholder-gray-600 focus:outline-hidden focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] font-medium">
                    Theme Color Accent
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {HABIT_COLORS.map((col) => {
                      const isSelected = formColor === col.name;
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => setFormColor(col.name)}
                          className={`w-8 h-8 rounded-full ${col.bgClass} flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 text-white ${
                            isSelected ? 'ring-2 ring-offset-2 ring-emerald-500 ring-offset-[#0C0E12]' : 'opacity-85'
                          }`}
                          title={`Select ${col.name}`}
                        >
                          {isSelected && <Check size={14} className="stroke-[3.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Icon Grid */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] font-medium">
                    Graphic Representation Icon
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-[#0A0C10]/50 p-3.5 rounded-2xl border border-white/5">
                    {HABIT_ICONS.map((ico) => {
                      const isSelected = formIcon === ico.name;
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          onClick={() => setFormIcon(ico.name)}
                          className={`p-3 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer gap-1.5 ${
                            isSelected
                              ? 'border-white/20 bg-white/5 text-white scale-102 font-bold shadow-xs'
                              : 'border-transparent text-gray-500 hover:text-gray-300'
                          }`}
                          title={ico.desc}
                        >
                          {renderIcon(ico.name, 18)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit & Delete Panel */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {editingId ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteCategory(editingId);
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/20 text-rose-450 hover:bg-rose-550/10 text-xs font-sans font-semibold transition-all cursor-pointer order-2 sm:order-1"
                    >
                      <Trash2 size={13} />
                      <span>Remove Category</span>
                    </button>
                  ) : (
                    <div className="order-2 sm:order-1" />
                  )}

                  <div className="flex gap-2.5 order-1 sm:order-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4.5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white text-xs font-sans font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-sans font-semibold hover:bg-emerald-500 transition-all cursor-pointer shadow-md"
                    >
                      {editingId ? 'Save Changes' : 'Create Category'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
