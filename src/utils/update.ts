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
  /** 热更新包 SHA-256 哈希（下载后校验完整性，防篡改/损坏） */
  sha256?: string;
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
  prerelease?: boolean;
  assets: GithubAsset[];
}

interface UpdateMeta {
  minNativeVersion?: string;
  mandatory?: boolean;
  /** 该版本必须整包更新（包含原生改动：图标、权限、插件等），热更新无法覆盖 */
  requireApk?: boolean;
  /** 热更新包 SHA-256 哈希，原生层下载后校验 */
  sha256?: string;
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

/** 带超时的 fetch：避免网络/镜像挂起导致更新检查无响应（表现为永远不弹更新提示） */
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 解析一个 Release 的整包 / 热更包 / 元数据资产 */
function parseReleaseAssets(release: GithubRelease): {
  apk?: GithubAsset;
  zip?: GithubAsset;
  meta?: GithubAsset;
} {
  let apk: GithubAsset | undefined;
  let zip: GithubAsset | undefined;
  let meta: GithubAsset | undefined;
  for (const asset of release.assets) {
    if (/\.apk$/i.test(asset.name)) {
      apk = asset;
    } else if (/^dist_.*\.zip$/i.test(asset.name)) {
      zip = asset;
    } else if (asset.name === 'update.json') {
      meta = asset;
    }
  }
  return { apk, zip, meta };
}

/**
 * 检查 GitHub Releases 并决策更新方式：
 * 1. 本地原生基座落后于「最近发布的整包版本」→ 整包 APK 更新（回溯历史 Release 找 APK，
 *    不依赖 update.json——旧基座只发热更包时必须能找到 APK，否则永远收不到更新）
 * 2. 否则最新版的热更包版本 > 本地 Web 版本且满足最低原生版本要求 → 热更新
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

  // 一次拉取最近 20 个 Release（按创建时间倒序，第一个为最新发布）：
  // 最新版决定热更新；最近带 APK 的 Release 决定基座落后时的整包引导
  const resp = await fetchWithTimeout(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!resp.ok) {
    throw new Error(`版本服务异常（${resp.status}），请稍后重试`);
  }

  const releases: GithubRelease[] = await resp.json();
  const published = releases.filter(
    (r) => !r.draft && !r.prerelease && !!r.tag_name.replace(/^v/, '').trim(),
  );
  if (published.length === 0) {
    return { ...base, type: 'none' };
  }
  const latest = published[0];
  const latestAssets = parseReleaseAssets(latest);
  const remoteVersion = latest.tag_name.replace(/^v/, '').trim();

  // 拉取最新版的 update.json 元数据（走镜像候选 + 超时；全部失败按默认规则处理）
  let meta: UpdateMeta = {};
  if (latestAssets.meta) {
    for (const url of getDownloadCandidates(latestAssets.meta.browser_download_url)) {
      try {
        const metaResp = await fetchWithTimeout(url);
        if (metaResp.ok) {
          meta = await metaResp.json();
          break;
        }
      } catch {
        // 换下一个候选地址
      }
    }
  }

  const result: UpdateCheckResult = {
    ...base,
    type: 'none',
    version: remoteVersion,
    changelog: (latest.body || '').trim(),
    mandatory: !!meta.mandatory,
    requireApk: !!meta.requireApk,
    sha256: meta.sha256,
  };

  // 1. 基座落后 → 直接整包更新（一次到位）。回溯最近带 APK 的 Release：
  //    最新版只发热更包时（如 v4.15.3），旧基座用户不能被静默卡死，也不能误推热更——
  //    必须引导安装最近整包（该判断不依赖 update.json，元数据拉取失败不影响）
  let apkPick: { version: string; url: string; changelog: string } | null = null;
  for (const release of published) {
    const { apk } = parseReleaseAssets(release);
    if (apk) {
      apkPick = {
        version: release.tag_name.replace(/^v/, '').trim(),
        url: apk.browser_download_url,
        changelog: (release.body || '').trim(),
      };
      break;
    }
  }
  if (apkPick && compareVersions(apkPick.version, local.nativeVersion) > 0) {
    result.type = 'apk';
    result.version = apkPick.version;
    result.changelog = apkPick.changelog;
    result.apkUrl = apkPick.url;
    return result;
  }

  // 2. 热更新（原生已是最新整包，Web 版本落后且满足最低原生版本要求）
  if (latestAssets.zip && compareVersions(remoteVersion, local.webVersion) > 0) {
    const minNative = (meta.minNativeVersion || '').replace(/^v/, '').trim();
    const nativeOk = !minNative || compareVersions(local.nativeVersion, minNative) >= 0;
    if (nativeOk) {
      result.type = 'hot';
      result.hotUrl = latestAssets.zip.browser_download_url;
      result.minNativeVersion = minNative || undefined;
      result.sha256 = meta.sha256;
      return result;
    }
  }

  // 3. 其余情况视为最新（例如基座不满足热更要求且无更新的整包可装）
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

/**
 * GitHub 下载加速镜像（国内直连 github.com/releases/download 会跳转 objects.githubusercontent.com，
 * 速度慢且经常断连）。镜像地址 = 前缀 + 完整 GitHub 文件 URL。
 * 列表可随热更新调整；全部失败后自动降级到 GitHub 直链。
 */
const GITHUB_MIRROR_PREFIXES = [
  'https://ghproxy.net/',
  'https://gh-proxy.com/',
  'https://ghfast.top/',
  'https://gh.llkk.cc/',
];

/**
 * 生成下载候选地址：加速镜像在前，GitHub 直链兜底。
 * 原生下载器依次尝试，镜像快速失败切换（见 AppUpdatePlugin.downloadFile）。
 */
export function getDownloadCandidates(directUrl: string): string[] {
  const candidates = GITHUB_MIRROR_PREFIXES.map((prefix) => prefix + directUrl);
  candidates.push(directUrl);
  return candidates;
}

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
