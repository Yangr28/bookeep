import { StateCreator } from 'zustand';
import { Category } from '../types';
import { initialCategories } from '../data/initialData';
import { loadCategories, saveCategories } from '../utils/storage';

export interface CategoriesSlice {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  /** 撤销删除：把分类放回原位置（记录的分类 ID 未变，可完全恢复） */
  restoreCategory: (category: Category, index?: number) => void;
  getCategoryById: (id: string) => Category | undefined;
  setCategories: (categories: Category[]) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createCategoriesSlice: StateCreator<CategoriesSlice> = (set, get) => ({
  categories: loadCategories(initialCategories),

  addCategory: (category) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
    };
    set((state) => {
      const updated = [...state.categories, newCategory];
      saveCategories(updated);
      return { categories: updated };
    });
  },

  deleteCategory: (id) => {
    set((state) => {
      const updated = state.categories.filter((c) => c.id !== id);
      saveCategories(updated);
      return { categories: updated };
    });
  },

  restoreCategory: (category, index) => {
    set((state) => {
      const updated = [...state.categories];
      const insertAt = index === undefined || index < 0 || index > updated.length ? updated.length : index;
      updated.splice(insertAt, 0, category);
      saveCategories(updated);
      return { categories: updated };
    });
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

  setCategories: (categories) => {
    saveCategories(categories);
    set({ categories });
  },
});