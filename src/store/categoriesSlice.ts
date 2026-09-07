import { StateCreator } from 'zustand';
import { Category } from '../types';
import { initialCategories } from '../data/initialData';
import { loadCategories, saveCategories } from '../utils/storage';

export interface CategoriesSlice {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
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

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

  setCategories: (categories) => {
    saveCategories(categories);
    set({ categories });
  },
});