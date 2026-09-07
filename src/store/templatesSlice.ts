import { StateCreator } from 'zustand';
import { RecordTemplate } from '../types';

export interface TemplatesSlice {
  templates: RecordTemplate[];
  addTemplate: (template: Omit<RecordTemplate, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, updates: Partial<RecordTemplate>) => void;
  deleteTemplate: (id: string) => void;
}

const STORAGE_KEY = 'bookeep_templates';

function loadFromStorage(): RecordTemplate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(templates: RecordTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    console.error('Failed to save templates');
  }
}

export const createTemplatesSlice: StateCreator<TemplatesSlice> = (set, get) => ({
  templates: loadFromStorage(),

  addTemplate: (template) => {
    const newTemplate: RecordTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const next = { templates: [...state.templates, newTemplate] };
      saveToStorage(next.templates);
      return next;
    });
  },

  updateTemplate: (id, updates) => {
    set((state) => {
      const next = {
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      };
      saveToStorage(next.templates);
      return next;
    });
  },

  deleteTemplate: (id) => {
    set((state) => {
      const next = {
        templates: state.templates.filter((t) => t.id !== id),
      };
      saveToStorage(next.templates);
      return next;
    });
  },
});
