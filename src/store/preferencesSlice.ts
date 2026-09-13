import { StateCreator } from 'zustand';
import i18n, { LanguagePreference, resolveLanguage } from '../i18n';
import { loadPreferences, savePreferences } from '../utils/storage';

export interface PreferencesSlice {
  lastUsedAccountId: string | null;
  lastUsedCategoryId: string | null;
  lastUsedType: 'expense' | 'income' | null;
  quickAmounts: string[];
  /** 界面语言：system 跟随系统，否则固定中/英 */
  language: LanguagePreference;
  setLastUsedAccountId: (id: string | null) => void;
  setLastUsedCategoryId: (id: string | null) => void;
  setLastUsedType: (type: 'expense' | 'income' | null) => void;
  addQuickAmount: (amount: string) => void;
  removeQuickAmount: (amount: string) => void;
  setPreferences: (preferences: Partial<PreferencesSlice>) => void;
  setLanguage: (language: LanguagePreference) => void;
}

const PREFERENCES_DEFAULTS = {
  lastUsedAccountId: null as string | null,
  lastUsedCategoryId: null as string | null,
  lastUsedType: null as 'expense' | 'income' | null,
  quickAmounts: ['5', '10', '20', '50', '100', '500'],
  language: 'system' as LanguagePreference,
};

/** 组合 store 中 get() 返回全部 slice，这里只挑偏好字段落盘，避免把账本数据写进偏好存储 */
const pickPreferences = (s: PreferencesSlice) => ({
  lastUsedAccountId: s.lastUsedAccountId,
  lastUsedCategoryId: s.lastUsedCategoryId,
  lastUsedType: s.lastUsedType,
  quickAmounts: s.quickAmounts,
  language: s.language,
});

export const createPreferencesSlice: StateCreator<PreferencesSlice> = (set, get) => {
  const persist = (partial: Partial<PreferencesSlice>) => {
    savePreferences({ ...pickPreferences(get()), ...partial });
    set(partial);
  };

  return {
    ...PREFERENCES_DEFAULTS,
    ...loadPreferences<Partial<PreferencesSlice>>({}),

    setLastUsedAccountId: (id) => persist({ lastUsedAccountId: id }),

    setLastUsedCategoryId: (id) => persist({ lastUsedCategoryId: id }),

    setLastUsedType: (type) => persist({ lastUsedType: type }),

    addQuickAmount: (amount) =>
      persist({
        quickAmounts: [...new Set([amount, ...get().quickAmounts])].slice(0, 10),
      }),

    removeQuickAmount: (amount) =>
      persist({ quickAmounts: get().quickAmounts.filter((a) => a !== amount) }),

    setPreferences: (preferences) => persist(preferences),

    // 切语言：持久化偏好 + 立即切换 i18n（system 按系统语言解析）
    setLanguage: (language) => {
      persist({ language });
      const target =
        language === 'system'
          ? resolveLanguage(typeof navigator !== 'undefined' ? navigator.language : 'zh-CN')
          : language;
      if (i18n.language !== target) i18n.changeLanguage(target);
    },
  };
};
