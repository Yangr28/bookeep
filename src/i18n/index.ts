import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import { loadPreferences } from '../utils/storage';

export type LanguagePreference = 'system' | 'zh-CN' | 'en-US';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
};

/** 任意系统语言收敛到受支持语言：zh* → zh-CN，其余 → en-US */
export const resolveLanguage = (candidate: string): 'zh-CN' | 'en-US' => {
  const lower = (candidate || '').toLowerCase();
  return lower.startsWith('zh') ? 'zh-CN' : 'en-US';
};

/** 读取持久化的语言偏好，解析出初始 i18n 语言（同步，早于 React 渲染） */
const resolveInitialLanguage = (): 'zh-CN' | 'en-US' => {
  const stored = loadPreferences<{ language?: LanguagePreference }>({}).language;
  if (stored === 'zh-CN' || stored === 'en-US') return stored;
  const systemLang = typeof navigator !== 'undefined' ? navigator.language : 'zh-CN';
  return resolveLanguage(systemLang);
};

i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage(),
  fallbackLng: 'zh-CN',
  interpolation: {
    // React 已默认防 XSS，转义反而会破坏含引号文案
    escapeValue: false,
  },
});

export default i18n;
