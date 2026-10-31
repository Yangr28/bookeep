import { StateCreator } from 'zustand';
import i18n, { LanguagePreference, resolveLanguage } from '../i18n';
import { loadPreferences, savePreferences } from '../utils/storage';

export interface HomeCardConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface PreferencesSlice {
  lastUsedAccountId: string | null;
  lastUsedCategoryId: string | null;
  lastUsedType: 'expense' | 'income' | null;
  quickAmounts: string[];
  /** 界面语言：system 跟随系统，否则固定中/英 */
  language: LanguagePreference;
  /** 首页卡片配置（顺序 + 显隐），按 order 升序渲染 */
  homeCards: HomeCardConfig[];
  setLastUsedAccountId: (id: string | null) => void;
  setLastUsedCategoryId: (id: string | null) => void;
  setLastUsedType: (type: 'expense' | 'income' | null) => void;
  addQuickAmount: (amount: string) => void;
  removeQuickAmount: (amount: string) => void;
  setPreferences: (preferences: Partial<PreferencesSlice>) => void;
  setLanguage: (language: LanguagePreference) => void;
  setHomeCards: (cards: HomeCardConfig[]) => void;
  toggleHomeCard: (id: string) => void;
  moveHomeCard: (id: string, direction: 'up' | 'down') => void;
}

/** 默认首页卡片顺序与显隐：与历史首页渲染顺序一致，老用户无感升级 */
export const DEFAULT_HOME_CARDS: HomeCardConfig[] = [
  { id: 'monthOverview', visible: true, order: 0 },
  { id: 'budget', visible: true, order: 1 },
  { id: 'quickTools', visible: true, order: 2 },
  { id: 'today', visible: true, order: 3 },
  { id: 'recent', visible: true, order: 4 },
];

const PREFERENCES_DEFAULTS = {
  lastUsedAccountId: null as string | null,
  lastUsedCategoryId: null as string | null,
  lastUsedType: null as 'expense' | 'income' | null,
  quickAmounts: ['5', '10', '20', '50', '100', '500'],
  language: 'system' as LanguagePreference,
  homeCards: DEFAULT_HOME_CARDS,
};

/** 组合 store 中 get() 返回全部 slice，这里只挑偏好字段落盘，避免把账本数据写进偏好存储 */
const pickPreferences = (s: PreferencesSlice) => ({
  lastUsedAccountId: s.lastUsedAccountId,
  lastUsedCategoryId: s.lastUsedCategoryId,
  lastUsedType: s.lastUsedType,
  quickAmounts: s.quickAmounts,
  language: s.language,
  homeCards: s.homeCards,
});

/**
 * 规范化首页卡片配置：以默认卡片为基准，合并用户已保存的显隐/顺序，
 * 保证所有默认卡片都存在且 order 连续。用于老用户（无 homeCards）或
 * 历史数据缺卡片时自动补齐，避免首页出现空白。
 */
const normalizeHomeCards = (stored: HomeCardConfig[] | undefined): HomeCardConfig[] => {
  const map = new Map((stored ?? []).map((c) => [c.id, c]));
  const merged = DEFAULT_HOME_CARDS.map((dc) => {
    const sc = map.get(dc.id);
    return sc ? { ...dc, visible: sc.visible, order: sc.order } : dc;
  });
  merged.sort((a, b) => a.order - b.order);
  return merged.map((c, i) => ({ ...c, order: i }));
};

export const createPreferencesSlice: StateCreator<PreferencesSlice> = (set, get) => {
  const persist = (partial: Partial<PreferencesSlice>) => {
    savePreferences({ ...pickPreferences(get()), ...partial });
    set(partial);
  };

  const stored = loadPreferences<Partial<PreferencesSlice>>({});

  return {
    ...PREFERENCES_DEFAULTS,
    ...stored,
    homeCards: normalizeHomeCards(stored.homeCards),

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

    setHomeCards: (cards) => persist({ homeCards: normalizeHomeCards(cards) }),

    toggleHomeCard: (id) => {
      const next = get().homeCards.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c));
      persist({ homeCards: next });
    },

    moveHomeCard: (id, direction) => {
      const list = [...get().homeCards].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((c) => c.id === id);
      if (idx < 0) return;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= list.length) return;
      [list[idx], list[target]] = [list[target], list[idx]];
      persist({ homeCards: list.map((c, i) => ({ ...c, order: i })) });
    },
  };
};
