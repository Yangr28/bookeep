import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface VersionInfo {
  /** 原生 APK 版本（build.gradle versionName） */
  nativeVersion: string;
  /** 当前热更新版本（无热更新时为空串） */
  hotVersion: string;
  /** 当前实际运行的 Web 版本：有热更新用热更新版本，否则用原生版本 */
  webVersion: string;
}

export interface DownloadProgress {
  /** hot: 热更新包；apk: 整包 */
  kind: 'hot' | 'apk';
  loaded: number;
  total: number;
  percent: number;
}

export interface AppUpdatePlugin {
  /** 获取版本信息（原生版本 / 热更新版本 / 当前 Web 版本） */
  getVersionInfo(): Promise<VersionInfo>;
  /** 新版本页面加载成功后调用，确认本次更新可用（用于失败回滚） */
  markReady(): Promise<void>;
  /** 下载并解压热更新包。urls 为下载候选地址（镜像加速优先），url 为兼容旧版的单个地址 */
  downloadHotUpdate(options: { url?: string; urls?: string[]; version: string }): Promise<{ version: string; path: string }>;
  /** 激活热更新版本（WebView 自动重载到新版本） */
  activateHotUpdate(options: { version: string }): Promise<void>;
  /** 下载整包 APK。urls 为下载候选地址（镜像加速优先），url 为兼容旧版的单个地址 */
  downloadApk(options: { url?: string; urls?: string[]; version: string }): Promise<{ path: string }>;
  /** 调起系统安装器安装 APK（未授权时先引导授权） */
  installApk(options?: { path?: string }): Promise<{ resultCode: number }>;
  /**
   * 从 APK 内置 assets(public/ocr/) 复制 OCR 识别资源到 filesDir/ocr_cache/。
   * Java 直接访问 AssetManager，不受热更新 setServerBasePath 切换影响。
   * 返回 ready=false 表示当前基座 APK 不含 OCR 资源（旧基座），调用方降级 CDN 下载。
   */
  prepareOcrAssets(): Promise<{ ready: boolean }>;
  /** 下载进度事件 */
  addListener(
    eventName: 'downloadProgress',
    listener: (progress: DownloadProgress) => void,
  ): Promise<PluginListenerHandle>;
}

const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate', {
  web: {
    getVersionInfo: async () => ({ nativeVersion: '', hotVersion: '', webVersion: '' }),
    markReady: async () => undefined,
    downloadHotUpdate: async () => {
      throw new Error('Web 环境不支持热更新');
    },
    activateHotUpdate: async () => undefined,
    downloadApk: async () => {
      throw new Error('Web 环境不支持 APK 下载');
    },
    installApk: async () => ({ resultCode: 0 }),
    prepareOcrAssets: async () => ({ ready: false }),
  },
});

export default AppUpdate;
