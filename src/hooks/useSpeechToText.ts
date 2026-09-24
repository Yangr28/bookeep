/**
 * 语音转文字 Hook（基于 @capgo/capacitor-speech-recognition）。
 *
 * 设计目标：
 *  - 旧基座（无原生插件方法）/ Web 环境 → `available=false`，调用方隐藏/禁用麦克风入口。
 *  - 状态机：idle → requesting → listening → stopping → idle；任意阶段失败 → error → idle。
 *  - 静音兜底：每个 partialResults 事件重置计时器；超过 SILENCE_TIMEOUT_MS 仍未收到新转写即主动停止。
 *  - 语言跟随 i18n：zh* → zh-CN，其余 → en-US（与 resolveLanguage 收敛一致）。
 *
 * 仅在 Capacitor 原生平台有实际能力；Web 上插件 WebPlugin 返回 available=false 不抛错。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import i18n from '../i18n';

export type SpeechState = 'idle' | 'requesting' | 'listening' | 'stopping' | 'error';

export interface SpeechToTextResult {
  /** 当前识别状态；idle = 未启动或已结束 */
  state: SpeechState;
  /** 设备是否支持语音识别；null = 首次可用性检查未完成；false = 不可用（Web/旧基座/无语音服务） */
  available: boolean | null;
  /** 当前 partial 转写文本（listening 期间实时更新） */
  partialText: string;
  /** 停止后的最终识别文本；reset() 清空 */
  finalText: string | null;
  /** 失败原因 i18n key（speech.error.*）；null 表示无错误 */
  errorKey: string | null;
  /** 启动识别：自动检查可用性 + 权限，进入 listening 状态 */
  start: () => Promise<void>;
  /** 停止识别并落定 finalText */
  stop: () => Promise<void>;
  /** 重置 error/finalText/partialText，state 回 idle */
  reset: () => void;
}

/** 无新转写时多久后自动停止（兜底，部分设备无原生静音检测） */
const SILENCE_TIMEOUT_MS = 4000;

const languageCode = (): string => (i18n.language?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN');

/** 从 partialResults 事件提取当前最完整文本：优先 accumulatedText > accumulated > matches[0] */
const extractText = (event: {
  matches?: string[];
  accumulated?: string;
  accumulatedText?: string;
}): string => {
  if (event.accumulatedText) return event.accumulatedText;
  if (event.accumulated) return event.accumulated;
  if (event.matches && event.matches.length > 0) return event.matches[0];
  return '';
};

export function useSpeechToText(): SpeechToTextResult {
  const [state, setState] = useState<SpeechState>('idle');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const partialListenerRef = useRef<PluginListenerHandle | null>(null);
  const listeningListenerRef = useRef<PluginListenerHandle | null>(null);
  const errorListenerRef = useRef<PluginListenerHandle | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 当前会话最新 partial 文本，用于停止时落定 finalText，避免闭包陈旧 */
  const latestPartialRef = useRef('');

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const removeListeners = useCallback(async () => {
    const tasks: Promise<unknown>[] = [];
    if (partialListenerRef.current) {
      tasks.push(partialListenerRef.current.remove().catch(() => {}));
      partialListenerRef.current = null;
    }
    if (listeningListenerRef.current) {
      tasks.push(listeningListenerRef.current.remove().catch(() => {}));
      listeningListenerRef.current = null;
    }
    if (errorListenerRef.current) {
      tasks.push(errorListenerRef.current.remove().catch(() => {}));
      errorListenerRef.current = null;
    }
    await Promise.all(tasks);
    try {
      await SpeechRecognition.removeAllListeners();
    } catch {
      // 旧基座可能无此方法，忽略
    }
  }, []);

  // 首次挂载时探测可用性；旧基座拒绝时不抛错，置为 false
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { available: ok } = await SpeechRecognition.available();
        if (!cancelled) setAvailable(ok);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 组件卸载：停止识别并清理监听
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      // 卸载时不 await，避免阻塞卸载流程；插件 stop 内部幂等
      SpeechRecognition.stop().catch(() => {});
      SpeechRecognition.removeAllListeners().catch(() => {});
    };
  }, []);

  const reset = useCallback(() => {
    clearSilenceTimer();
    setState('idle');
    setPartialText('');
    setFinalText(null);
    setErrorKey(null);
    latestPartialRef.current = '';
  }, []);

  const stop = useCallback(async () => {
    clearSilenceTimer();
    setState((prev) => (prev === 'listening' || prev === 'requesting' ? 'stopping' : prev));
    try {
      await SpeechRecognition.stop();
    } catch {
      // 即使 stop 失败也走 listeningState 'stopped' 或超时兜底
    }
    // 落定 finalText；listeningState 事件通常已先触发 'stopped'，这里兜底
    setFinalText((prev) => prev ?? (latestPartialRef.current || ''));
    await removeListeners();
    setState('idle');
  }, [removeListeners]);

  const start = useCallback(async () => {
    if (state === 'listening' || state === 'requesting' || state === 'stopping') return;
    if (available === false) {
      setErrorKey('speech.error.unavailable');
      setState('error');
      return;
    }

    setState('requesting');
    setErrorKey(null);
    setPartialText('');
    setFinalText(null);
    latestPartialRef.current = '';

    try {
      // available === null（首次未完成）时仍尝试调用，失败降级
      const probe = available === null ? (await SpeechRecognition.available().catch(() => ({ available: false }))) : { available };
      if (!probe.available) {
        setAvailable(false);
        setErrorKey('speech.error.unavailable');
        setState('error');
        return;
      }

      // 权限：granted 直跑；prompt/denied 都走 requestPermissions。
      // Android 单次拒绝后仍可能再次弹窗（"不再询问"时系统直接回 denied）；
      // iOS denied 时系统直接回 denied。最终仍非 granted 才报错并引导去系统设置。
      const perm = await SpeechRecognition.checkPermissions().catch(() => ({
        speechRecognition: 'prompt' as const,
      }));
      if (perm.speechRecognition !== 'granted') {
        const req = await SpeechRecognition.requestPermissions().catch(() => ({
          speechRecognition: 'denied' as const,
        }));
        if (req.speechRecognition !== 'granted') {
          setErrorKey('speech.error.permissionDenied');
          setState('error');
          return;
        }
      }

      // 监听 partial / listeningState / error
      partialListenerRef.current = await SpeechRecognition.addListener('partialResults', (event) => {
        const text = extractText(event);
        if (text) {
          latestPartialRef.current = text;
          setPartialText(text);
        }
        // 收到新转写即重置静音计时器
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          // 超时自动停止；用 void 避免未捕获 promise
          void stop();
        }, SILENCE_TIMEOUT_MS);
      });

      listeningListenerRef.current = await SpeechRecognition.addListener('listeningState', (event) => {
        const s = event.state ?? (event.status === 'started' ? 'started' : 'stopped');
        if (s === 'stopped') {
          // 主动落定 finalText，避免 stop() 在 listeningState 之前调用读到 null
          setFinalText(latestPartialRef.current || '');
          clearSilenceTimer();
          void removeListeners();
          setState('idle');
        } else if (s === 'started') {
          // 进入 listening：启动静音兜底计时器（用户可能开口前静音 N 秒）
          clearSilenceTimer();
          silenceTimerRef.current = setTimeout(() => {
            void stop();
          }, SILENCE_TIMEOUT_MS);
        }
      });

      errorListenerRef.current = await SpeechRecognition.addListener('error', (event) => {
        clearSilenceTimer();
        void removeListeners();
        // 服务器不可达/无语音服务等 → 归为 unavailable；其余按通用错误处理
        const code = event?.code ?? '';
        const key = code.includes('NO_MATCH') || code.includes('NO_SPEECH')
          ? 'speech.error.noSpeech'
          : code.includes('BUSY') || code.includes('SERVICE')
            ? 'speech.error.serviceUnavailable'
            : 'speech.error.generic';
        setErrorKey(key);
        setState('error');
      });

      await SpeechRecognition.start({
        language: languageCode(),
        partialResults: true,
        maxResults: 1,
      });

      setState('listening');
    } catch (e) {
      clearSilenceTimer();
      await removeListeners();
      const msg = e instanceof Error ? e.message : String(e);
      // 旧基座/方法缺失通常表现为 "not implemented" / "unimplemented"
      const key = /not.*implement|unimplement|available/i.test(msg)
        ? 'speech.error.unavailable'
        : 'speech.error.generic';
      setErrorKey(key);
      setState('error');
    }
  }, [available, removeListeners, state, stop]);

  return {
    state,
    available,
    partialText,
    finalText,
    errorKey,
    start,
    stop,
    reset,
  };
}
