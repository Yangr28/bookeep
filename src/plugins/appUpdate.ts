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
  /** 下载并解压热更新包 */
  downloadHotUpdate(options: { url: string; version: string }): Promise<{ version: string; path: string }>;
  /** 激活热更新版本（WebView 自动重载到新版本） */
  activateHotUpdate(options: { version: string }): Promise<void>;
  /** 下载整包 APK */
  downloadApk(options: { url: string; version: string }): Promise<{ path: string }>;
  /** 调起系统安装器安装 APK（未授权时先引导授权） */
  installApk(options?: { path?: string }): Promise<{ resultCode: number }>;
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
  },
});

export default AppUpdate;
