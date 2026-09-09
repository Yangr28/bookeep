import AppUpdate, { type VersionInfo } from '../plugins/appUpdate';

/**
 * GitHub 仓库配置（格式：用户名/仓库名），在 .env 中配置 VITE_GITHUB_REPO
 * 发布约定（GitHub Release）：
 *  - tag 名：v<版本号>，如 v4.5.0
 *  - 资产：bookeep_v<版本号>.apk（整包）、dist_v<版本号>.zip（热更新包，zip 内为 dist 内容）
 *  - 资产 update.json（可选）：{ "minNativeVersion": "4.4.0", "mandatory": false }
 *  - Release 正文（body）作为更新日志展示
 */
const GITHUB_REPO = (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim();

export type UpdateType = 'hot' | 'apk' | 'none';

export interface UpdateCheckResult {
  /** hot: 可热更新；apk: 需整包更新；none: 已是最新 */
  type: UpdateType;
  /** 远程最新版本号 */
  version: string;
  /** 本地原生版本 */
  nativeVersion: string;
  /** 本地当前运行的 Web 版本 */
  webVersion: string;
  /** 更新日志（Release body） */
  changelog: string;
  /** 是否强制更新 */
  mandatory: boolean;
  /** 热更新包下载地址 */
  hotUrl?: string;
  /** 整包 APK 下载地址 */
  apkUrl?: string;
  /** 热更新包要求的最低原生版本 */
  minNativeVersion?: string;
  /** 该版本必须整包更新（包含原生改动），热更新无法覆盖 */
  requireApk?: boolean;
}

/**
 * 语义化版本比较：返回 1 表示 a > b，-1 表示 a < b，0 表示相等
 * 按数字段拆分比较，禁止字符串直接比较（避免 "1.0.10" < "1.0.2" 的错误）
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  body: string | null;
  draft: boolean;
  assets: GithubAsset[];
}

interface UpdateMeta {
  minNativeVersion?: string;
  mandatory?: boolean;
  /** 该版本必须整包更新（包含原生改动：图标、权限、插件等），热更新无法覆盖 */
  requireApk?: boolean;
}

/** 获取本地版本信息（原生环境取插件数据，Web 环境降级到构建版本号） */
export async function getLocalVersions(): Promise<VersionInfo> {
  try {
    const info = await AppUpdate.getVersionInfo();
    if (info.nativeVersion) return info;
  } catch {
    // 插件不可用（Web 环境）
  }
  const v = (import.meta.env.APP_VERSION as string) || '0.0.0';
  return { nativeVersion: v, hotVersion: '', webVersion: v };
}

export function isUpdateConfigured(): boolean {
  return !!GITHUB_REPO;
}

/**
 * 检查 GitHub Releases 最新版本并决策更新方式：
 * 1. 远程原生版本 > 本地原生版本 → 整包 APK 更新
 * 2. 否则远程 Web 版本 > 本地 Web 版本且满足最低原生版本要求 → 热更新
 * 3. 否则已是最新
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const local = await getLocalVersions();

  const base = {
    version: '',
    nativeVersion: local.nativeVersion,
    webVersion: local.webVersion,
    changelog: '',
    mandatory: false,
  };

  if (!GITHUB_REPO) {
    return { ...base, type: 'none' };
  }

  const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (resp.status === 404) {
    throw new Error('未找到发布版本，请确认仓库配置');
  }
  if (!resp.ok) {
    throw new Error(`版本服务异常（${resp.status}），请稍后重试`);
  }

  const release: GithubRelease = await resp.json();
  if (release.draft) {
    return { ...base, type: 'none' };
  }

  const remoteVersion = (release.tag_name || '').replace(/^v/, '').trim();
  if (!remoteVersion) {
    return { ...base, type: 'none' };
  }

  let apkAsset: GithubAsset | undefined;
  let zipAsset: GithubAsset | undefined;
  let metaAsset: GithubAsset | undefined;
  for (const asset of release.assets) {
    if (/\.apk$/i.test(asset.name)) {
      apkAsset = asset;
    } else if (/^dist_.*\.zip$/i.test(asset.name)) {
      zipAsset = asset;
    } else if (asset.name === 'update.json') {
      metaAsset = asset;
    }
  }

  let meta: UpdateMeta = {};
  if (metaAsset) {
    try {
      const metaResp = await fetch(metaAsset.browser_download_url);
      if (metaResp.ok) {
        meta = await metaResp.json();
      }
    } catch {
      // 元数据拉取失败不阻断流程，按默认规则处理
    }
  }

  const result: UpdateCheckResult = {
    ...base,
    type: 'none',
    version: remoteVersion,
    changelog: (release.body || '').trim(),
    mandatory: !!meta.mandatory,
    requireApk: !!meta.requireApk,
  };

  // 1. 如果该版本标记了 requireApk（包含原生改动：图标/权限/插件等），必须整包更新
  if (meta.requireApk && apkAsset && compareVersions(remoteVersion, local.nativeVersion) > 0) {
    result.type = 'apk';
    result.apkUrl = apkAsset.browser_download_url;
    return result;
  }

  // 2. 热更新优先（Web 版本落后，且满足最低原生版本要求）
  //    热更新优先于整包更新，确保旧基座用户也能通过热更新获取最新 Web 资源
  if (zipAsset && compareVersions(remoteVersion, local.webVersion) > 0) {
    const minNative = (meta.minNativeVersion || '').replace(/^v/, '').trim();
    const nativeOk = !minNative || compareVersions(local.nativeVersion, minNative) >= 0;
    if (nativeOk) {
      result.type = 'hot';
      result.hotUrl = zipAsset.browser_download_url;
      result.minNativeVersion = minNative || undefined;
      // 如果同时有 APK 且原生版本也落后，附上 APK 地址供用户可选整包更新
      if (apkAsset && compareVersions(remoteVersion, local.nativeVersion) > 0) {
        result.apkUrl = apkAsset.browser_download_url;
      }
      return result;
    }
  }

  // 3. 整包更新（热更新不可用或原生版本不满足要求，但原生版本落后）
  if (apkAsset && compareVersions(remoteVersion, local.nativeVersion) > 0) {
    result.type = 'apk';
    result.apkUrl = apkAsset.browser_download_url;
    return result;
  }

  result.type = 'none';
  return result;
}

/** 本地"跳过此版本"标记（手动检查时忽略跳过标记） */
const SKIP_KEY = 'bookeep_update_skipped';
export function getSkippedVersion(): string {
  try {
    return localStorage.getItem(SKIP_KEY) || '';
  } catch {
    return '';
  }
}
export function setSkippedVersion(version: string): void {
  try {
    localStorage.setItem(SKIP_KEY, version);
  } catch {
    // ignore
  }
}

/**
 * 手动回退到指定历史版本（通过下载并激活该版本的热更新包实现）
 * 要求该版本在 GitHub Releases 上有 dist_v<version>.zip 资产
 * 返回可直接传给 AppUpdate.downloadHotUpdate 的 url 与 version
 */
export async function resolveRollbackTarget(targetVersion: string): Promise<{ url: string; version: string } | null> {
  if (!GITHUB_REPO) return null;
  const v = targetVersion.replace(/^v/, '').trim();
  if (!v) return null;
  // GitHub Release 资产下载地址是稳定可预测的
  return {
    url: `https://github.com/${GITHUB_REPO}/releases/download/v${v}/dist_v${v}.zip`,
    version: v,
  };
}

/** 自动检查节流：5 分钟内不重复自动检查（检查成本极低，保证新版本发布后尽快弹出提示） */
const LAST_CHECK_KEY = 'bookeep_update_last_check';
const AUTO_CHECK_INTERVAL = 5 * 60 * 1000;

export function shouldAutoCheck(): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || '0');
    return Date.now() - last > AUTO_CHECK_INTERVAL;
  } catch {
    return true;
  }
}

export function markAutoChecked(): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}
