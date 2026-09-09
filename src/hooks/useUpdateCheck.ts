import { useCallback, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import AppUpdate from '../plugins/appUpdate';
import {
  checkForUpdate,
  getSkippedVersion,
  setSkippedVersion,
  shouldAutoCheck,
  markAutoChecked,
  resolveRollbackTarget,
  type UpdateCheckResult,
} from '../utils/update';

export type UpdatePhase = 'idle' | 'downloading' | 'installing' | 'done' | 'error';

export interface UpdateFlowState {
  phase: UpdatePhase;
  /** hot: 热更新；apk: 整包 */
  kind: 'hot' | 'apk' | null;
  percent: number;
  error: string;
}

const idleFlow: UpdateFlowState = { phase: 'idle', kind: null, percent: 0, error: '' };

/**
 * 应用内更新流程管理：
 * - check(manual)：检查更新，自动模式受"跳过版本"和 10 分钟节流约束
 * - startUpdate：执行下载 + 激活/安装，进度通过 flow 暴露
 */
export function useUpdateCheck() {
  // available: 有可更新版本并展示弹窗；closed: 无弹窗
  const [available, setAvailable] = useState<UpdateCheckResult | null>(null);
  const [flow, setFlow] = useState<UpdateFlowState>(idleFlow);
  const checkingRef = useRef(false);

  /**
   * 检查更新
   * @param manual true=设置页手动检查（忽略跳过标记），返回 'latest' 表示已是最新
   */
  const check = useCallback(
    async (manual = false): Promise<'latest' | 'available' | 'unavailable' | void> => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        // 自动检查：每次启动都检查（不再受节流限制），但跳过用户已跳过的版本
        const result = await checkForUpdate();
        if (!manual) markAutoChecked();

        if (result.type === 'none') {
          return 'latest';
        }
        // 自动检查：用户跳过的版本且非强制更新，不弹窗
        if (!manual && !result.mandatory && result.version === getSkippedVersion()) {
          return 'unavailable';
        }
        setFlow(idleFlow);
        setAvailable(result);
        return 'available';
      } finally {
        checkingRef.current = false;
      }
    },
    [],
  );

  const close = useCallback(() => {
    // 下载/安装流程中不允许关闭，避免流程中断
    if (flow.phase === 'downloading' || flow.phase === 'installing') return;
    setAvailable(null);
    setFlow(idleFlow);
  }, [flow.phase]);

  const skip = useCallback(() => {
    if (available && !available.mandatory) {
      setSkippedVersion(available.version);
    }
    setAvailable(null);
    setFlow(idleFlow);
  }, [available]);

  /** 执行更新：热更新下载后自动激活重载；整包下载后调起安装器 */
  const startUpdate = useCallback(async () => {
    if (!available) return;
    const result = available;
    const kind = result.type === 'hot' ? 'hot' : 'apk';
    setFlow({ phase: 'downloading', kind, percent: 0, error: '' });

    let listener: PluginListenerHandle | undefined;
    try {
      listener = await AppUpdate.addListener('downloadProgress', (p) => {
        if (p.kind === kind) {
          setFlow((prev) =>
            prev.phase === 'downloading' ? { ...prev, percent: p.percent } : prev,
          );
        }
      });

      if (kind === 'hot') {
        await AppUpdate.downloadHotUpdate({ url: result.hotUrl!, version: result.version });
        // 激活后原生端会让 WebView 重新加载新版本，本页面上下文随即销毁
        await AppUpdate.activateHotUpdate({ version: result.version });
        setFlow({ phase: 'done', kind, percent: 100, error: '' });
      } else {
        await AppUpdate.downloadApk({ url: result.apkUrl!, version: result.version });
        setFlow({ phase: 'installing', kind, percent: 100, error: '' });
        await AppUpdate.installApk();
        setFlow({ phase: 'done', kind, percent: 100, error: '' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '更新失败，请重试';
      setFlow({ phase: 'error', kind, percent: 0, error: msg });
    } finally {
      listener?.remove();
    }
  }, [available]);

  /** 新版本页面加载成功后确认（失败回滚机制） */
  const markReady = useCallback(() => {
    AppUpdate.markReady().catch(() => {
      // Web 环境或插件不可用时忽略
    });
  }, []);

  /**
   * 强制整包更新（用户选择整包更新时调用）
   * 当热更新可用但用户想整包更新时，用 APK 地址走整包更新流程
   */
  const startApkUpdate = useCallback(async () => {
    if (!available?.apkUrl) return;
    const version = available.version;
    setFlow({ phase: 'downloading', kind: 'apk', percent: 0, error: '' });
    let listener: PluginListenerHandle | undefined;
    try {
      listener = await AppUpdate.addListener('downloadProgress', (p) => {
        if (p.kind === 'apk') {
          setFlow((prev) =>
            prev.phase === 'downloading' ? { ...prev, percent: p.percent } : prev,
          );
        }
      });
      await AppUpdate.downloadApk({ url: available.apkUrl!, version });
      setFlow({ phase: 'installing', kind: 'apk', percent: 100, error: '' });
      await AppUpdate.installApk();
      setFlow({ phase: 'done', kind: 'apk', percent: 100, error: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '整包更新失败，请重试';
      setFlow({ phase: 'error', kind: 'apk', percent: 0, error: msg });
    } finally {
      listener?.remove();
    }
  }, [available]);

  /**
   * 手动回退到指定历史版本（要求该版本在 GitHub Releases 上有 dist_v<version>.zip）
   * 复用与 startUpdate 相同的下载/激活流程：下载热更新包 -> activateHotUpdate -> WebView 自动重载
   * activateHotUpdate 会把 hot_previous 设为当前版本，4.5.0 加载失败可自动回滚到当前版本
   */
  const rollback = useCallback(async (targetVersion: string) => {
    const target = await resolveRollbackTarget(targetVersion);
    if (!target) return;
    setFlow({ phase: 'downloading', kind: 'hot', percent: 0, error: '' });
    let listener: PluginListenerHandle | undefined;
    try {
      listener = await AppUpdate.addListener('downloadProgress', (p) => {
        if (p.kind === 'hot') {
          setFlow((prev) =>
            prev.phase === 'downloading' ? { ...prev, percent: p.percent } : prev,
          );
        }
      });
      await AppUpdate.downloadHotUpdate({ url: target.url, version: target.version });
      await AppUpdate.activateHotUpdate({ version: target.version });
      setFlow({ phase: 'done', kind: 'hot', percent: 100, error: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '回退失败，请重试';
      setFlow({ phase: 'error', kind: 'hot', percent: 0, error: msg });
    } finally {
      listener?.remove();
    }
  }, []);

  return {
    available,
    flow,
    check,
    close,
    skip,
    startUpdate,
    startApkUpdate,
    markReady,
    rollback,
  };
}
