import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import { loadPreferences } from '../utils/storage';

export type LanguagePreference = 'system' | 'zh-CN' | 'en-US';

/**
 * 页面级分片资源：locales/pages/<语言>/<namespace>.json
 * 文件名即顶层 namespace（如 search.json → t('search.xxx')）。
 * 与主资源按 namespace 深合并：若 shard 和主 JSON 均有 "settings"，
 * 结果为 { ...base.settings, ...shard.settings }，两边 key 互补。
 * 用于大页面 i18n 并行开发，避免多人改同一 JSON。
 */
const collectPageResources = (modules: Record<string, unknown>): Record<string, Record<string, unknown>> =>
  Object.entries(modules).reduce<Record<string, Record<string, unknown>>>((acc, [path, mod]) => {
    const namespace = path.split('/').pop()?.replace(/\.json$/, '');
    if (namespace) acc[namespace] = mod as Record<string, unknown>;
    return acc;
  }, {});

/** 按 namespace 深合并主资源与分片：shard 中同名 key 覆盖 base */
const mergeResources = (
  base: Record<string, unknown>,
  shards: Record<string, Record<string, unknown>>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };
  for (const [ns, value] of Object.entries(shards)) {
    result[ns] = { ...((result[ns] as Record<string, unknown>) || {}), ...value };
  }
  return result;
};

const pageZh = collectPageResources(
  import.meta.glob('./locales/pages/zh-CN/*.json', { eager: true, import: 'default' }) as Record<string, unknown>,
);
const pageEn = collectPageResources(
  import.meta.glob('./locales/pages/en-US/*.json', { eager: true, import: 'default' }) as Record<string, unknown>,
);

const resources = {
  'zh-CN': { translation: mergeResources(zhCN, pageZh) },
  'en-US': { translation: mergeResources(enUS, pageEn) },
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
