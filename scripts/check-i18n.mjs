#!/usr/bin/env node
/**
 * i18n 完整性校验（TR-13.1）
 *
 * 复现 src/i18n/index.ts 的资源合并逻辑：
 *   主资源 locales/<lang>.json + 分片 locales/pages/<lang>/*.json
 *   按顶层 namespace 深合并（shard key 覆盖主 key）。
 *
 * 校验项：
 *   1. zh-CN 与 en-US 合并后的扁平 key 集合必须完全一致（差集报错）
 *   2. 扫描 src/**\/*.{ts,tsx} 中 t('a.b') / t("a.b") 引用，
 *      报告在两个语言资源里都不存在的 key（拼写错误/漏翻）
 *
 * 退出码：0 通过；1 发现差异。
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'src', 'i18n', 'locales');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** 合并某语言的主资源 + pages/<lang> 下所有分片（按 namespace 深合并一层） */
const buildResources = (lang) => {
  const base = readJson(join(localesDir, `${lang}.json`));
  const shardDir = join(localesDir, 'pages', lang);
  if (existsSync(shardDir)) {
    for (const file of readdirSync(shardDir)) {
      if (extname(file) !== '.json') continue;
      const ns = file.replace(/\.json$/, '');
      const shard = readJson(join(shardDir, file));
      base[ns] = { ...(base[ns] || {}), ...shard };
    }
  }
  return base;
};

/** i18next 复数后缀：base 与其复数形式互为别名（day 与 day_one/day_other 都算已定义） */
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other', '0', '1'];

/** 展平为点路径 key 集合；同时注册复数 key 的 base 形式 */
const flattenKeys = (obj, prefix = '') => {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const ck of flattenKeys(v, path)) keys.add(ck);
    } else {
      keys.add(path);
      const underscore = k.lastIndexOf('_');
      if (underscore > 0 && PLURAL_SUFFIXES.includes(k.slice(underscore + 1))) {
        keys.add(prefix ? `${prefix}.${k.slice(0, underscore)}` : k.slice(0, underscore));
      }
    }
  }
  return keys;
};

const zh = flattenKeys(buildResources('zh-CN'));
const en = flattenKeys(buildResources('en-US'));

let failures = 0;

const missingInEn = [...zh].filter((k) => !en.has(k)).sort();
const missingInZh = [...en].filter((k) => !zh.has(k)).sort();

if (missingInEn.length) {
  failures++;
  console.error(`\n✗ ${missingInEn.length} 个 key 仅存在于 zh-CN（en-US 缺失）：`);
  missingInEn.forEach((k) => console.error(`  - ${k}`));
}
if (missingInZh.length) {
  failures++;
  console.error(`\n✗ ${missingInZh.length} 个 key 仅存在于 en-US（zh-CN 缺失）：`);
  missingInZh.forEach((k) => console.error(`  - ${k}`));
}

// 扫描源码中 t('...') 的静态 key 引用
const srcDir = join(root, 'src');
const referenced = new Set();
const tKeyRe = /\bt\(\s*['"`]([a-zA-Z][\w.]+)['"`]/g;
const readdirSafe = (p) => {
  try {
    return statSync(p);
  } catch {
    return null;
  }
};
/** 剥离行/块注释，避免把注释中的示例 key 误判为引用 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === 'locales') continue;
    const full = join(dir, name);
    const stat = readdirSafe(full);
    if (stat?.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(name)) {
      const content = stripComments(readFileSync(full, 'utf8'));
      let m;
      while ((m = tKeyRe.exec(content)) !== null) {
        // 动态拼接（t('ns.') + x）无法静态解析，跳过
        if (m[1].endsWith('.')) continue;
        referenced.add(m[1]);
      }
    }
  }
};
walk(srcDir);

// 含插值/动态后缀的引用可能只写前缀，这里只报"连最长前缀都匹配不到"的 key
const orphaned = [...referenced]
  .filter((key) => {
    if (zh.has(key) || en.has(key)) return false;
    // 是否存在以此 key 为前缀的已定义 key（动态拼接场景）
    const prefix = `${key}.`;
    for (const defined of zh) if (defined.startsWith(prefix)) return false;
    return true;
  })
  .sort();

if (orphaned.length) {
  failures++;
  console.error(`\n✗ ${orphaned.length} 个源码 t() key 在两种语言中均未定义：`);
  orphaned.forEach((k) => console.error(`  - ${k}`));
}

if (failures === 0) {
  console.log(`✓ i18n 校验通过：zh-CN ${zh.size} 键 / en-US ${en.size} 键，引用无悬空 key`);
  process.exit(0);
}
console.error(`\ni18n 校验失败，共 ${failures} 类问题。`);
process.exit(1);
