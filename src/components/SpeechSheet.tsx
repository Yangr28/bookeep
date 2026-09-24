/**
 * 语音记账底部浮层（Task 8）。
 *
 * 打开即自动开始识别；partial 实时显示在浮层内；静音超时或点"停止"落定后，
 * 展示识别文本并提供「重说 / 填入输入框」——填入仅写入智能输入框并走
 * parseSmartInput 预填管道，绝不自动入账。
 *
 * 权限拒绝/设备不可用：浮层内说明（错误文案 speech.error.*），
 * permissionDenied 文案本身引导去系统设置；不崩溃。
 * 聆听波纹 .speech-ripple 已被全局 prefers-reduced-motion 守卫关停。
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, X, RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface SpeechSheetProps {
  open: boolean;
  onClose: () => void;
  /** 用户确认使用识别文本时回调（填入智能输入框，不自动保存） */
  onResult: (text: string) => void;
}

export const SpeechSheet = ({ open, onClose, onResult }: SpeechSheetProps) => {
  const { t } = useTranslation();
  const {
    state,
    partialText,
    finalText,
    errorKey,
    start,
    stop,
    reset,
  } = useSpeechToText();

  // 打开浮层时自动开始一次识别；关闭时停止。open 是唯一触发点。
  const startedForOpenRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (!startedForOpenRef.current) {
      startedForOpenRef.current = true;
      void start();
    }
    return () => {
      // 关闭：停止识别并复位标记，下次打开重新开始
      startedForOpenRef.current = false;
      void stop();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isActive = state === 'listening' || state === 'requesting' || state === 'stopping';
  const isError = state === 'error';
  const hasFinal = state === 'idle' && finalText !== null;

  const handleUseText = () => {
    const text = (finalText ?? partialText).trim();
    if (text) onResult(text);
    onClose();
  };

  const handleRetry = () => {
    reset();
    void start();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={onClose}
    >
      <div
        className="sheet w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('speech.sheetTitle')}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('speech.sheetTitle')}</h3>
          <button onClick={onClose} className="icon-btn w-9 h-9" aria-label={t('common.cancel')}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-7 pb-5 safe-bottom flex flex-col items-center">
          {/* 麦克风状态视觉 */}
          <div className="relative w-20 h-20 flex items-center justify-center mb-5">
            {state === 'listening' && (
              <>
                <span className="speech-ripple" />
                <span className="speech-ripple speech-ripple-delay" />
              </>
            )}
            <button
              type="button"
              onClick={() => (isActive ? void stop() : undefined)}
              disabled={!isActive}
              aria-label={isActive ? t('speech.stop') : t('speech.tapToSpeak')}
              className="relative w-20 h-20 rounded-full flex items-center justify-center transition-transform card-press"
              style={{
                background: isError ? 'var(--expense-soft)' : 'var(--primary-soft)',
                color: isError ? 'var(--expense)' : 'var(--primary-ink)',
              }}
            >
              {isError
                ? <AlertTriangle size={32} />
                : isActive
                  ? <Square size={26} fill="currentColor" />
                  : <Mic size={32} />}
            </button>
          </div>

          {/* 状态文案 / 识别文本 */}
          {isError ? (
            <p className="text-sm text-center leading-relaxed min-h-[2.5rem] flex items-center" style={{ color: 'var(--expense)' }}>
              {errorKey ? t(errorKey) : t('speech.error.generic')}
            </p>
          ) : hasFinal ? (
            <p
              className="text-base font-medium text-center leading-relaxed min-h-[2.5rem] w-full break-words"
              style={{ color: finalText ? 'var(--ink)' : 'var(--ink-2)' }}
            >
              {finalText || t('speech.emptyResult')}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {state === 'requesting' ? t('speech.preparing') : t('speech.listening')}
              </p>
              <p className="text-xs mt-1 text-center break-words min-h-[1.25rem]" style={{ color: 'var(--ink-2)' }}>
                {partialText || t('speech.hint')}
              </p>
            </>
          )}

          {/* 操作区 */}
          <div className="flex items-center gap-3 mt-6 w-full">
            {isError ? (
              <button onClick={onClose} className="btn-primary flex-1 py-3">
                {t('speech.gotIt')}
              </button>
            ) : hasFinal ? (
              <>
                <button onClick={handleRetry} className="btn-ghost flex-1 py-3 flex items-center justify-center gap-1.5">
                  <RotateCcw size={16} />
                  {t('speech.retry')}
                </button>
                <button
                  onClick={handleUseText}
                  disabled={!finalText}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-1.5"
                >
                  {t('speech.useText')}
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => void stop()}
                disabled={state === 'stopping'}
                className="btn-primary flex-1 py-3"
              >
                {t('speech.stop')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
