import { Zap, Package, X, RefreshCw, AlertCircle, CheckCircle, Loader2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateCheckResult } from '../utils/update';
import type { UpdateFlowState } from '../hooks/useUpdateCheck';

interface UpdateModalProps {
  result: UpdateCheckResult;
  flow: UpdateFlowState;
  onUpdate: () => void;
  onClose: () => void;
  onSkip: () => void;
  /** 整包更新回调（当热更新可用但用户想整包更新时调用） */
  onApkUpdate?: () => void;
}

export const UpdateModal = ({ result, flow, onUpdate, onClose, onSkip, onApkUpdate }: UpdateModalProps) => {
  const { t } = useTranslation();
  const [showApkOption, setShowApkOption] = useState(false);
  const isHot = result.type === 'hot';
  const mandatory = result.mandatory;
  const busy = flow.phase === 'downloading' || flow.phase === 'installing';
  const closable = !busy && !mandatory;

  const handleMaskClick = () => {
    if (closable) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={handleMaskClick}
    >
      <div
        className="card relative w-full max-w-sm mx-4 p-5 animate-bounce-in flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative flex-shrink-0">
          {closable && (
            <button
              onClick={onClose}
              className="icon-btn w-9 h-9 absolute -top-1 -right-1 z-10"
            >
              <X size={18} />
            </button>
          )}
          <div className="flex items-center gap-3 pr-10">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              {isHot ? <Zap size={24} /> : <Package size={24} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>
                {t('update.title', { version: result.version })}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ink-2)' }}>
                {isHot ? t('update.hotHint') : t('update.fullHint')}
                {mandatory && t('update.importantSuffix')}
              </p>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto py-4">
          {flow.phase === 'error' ? (
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
              >
                <AlertCircle size={28} />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('update.errorTitle')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{flow.error}</p>
              {!isHot && result.apkUrl && (
                <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t('update.browserHint1')}
                  <a
                    href={result.apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline mx-1"
                    style={{ color: 'var(--primary)' }}
                  >
                    {t('update.downloadPage')}
                  </a>
                  {t('update.browserHint2')}
                </p>
              )}
            </div>
          ) : flow.phase === 'downloading' ? (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 size={22} className="animate-spin flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                    {isHot ? t('update.downloadingHot') : t('update.downloadingFull')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    {isHot
                      ? t('update.percentHot', { percent: flow.percent })
                      : t('update.percentFull', { percent: flow.percent })}
                  </p>
                </div>
              </div>
              <div
                className="w-full h-2.5 rounded-full overflow-hidden"
                style={{ background: 'var(--paper-deep)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(flow.percent, 2)}%`, background: 'var(--primary)' }}
                />
              </div>
            </div>
          ) : flow.phase === 'installing' ? (
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
              >
                <Package size={28} />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('update.installingTitle')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {t('update.installingDesc')}
              </p>
            </div>
          ) : flow.phase === 'done' ? (
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
              >
                <CheckCircle size={28} />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                {isHot ? t('update.doneHotTitle') : t('update.doneFullTitle')}
              </p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {isHot ? t('update.doneHotDesc') : t('update.doneFullDesc')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="chip chip-inactive text-xs">
                  {t('update.currentVersion', { version: isHot ? result.webVersion : result.nativeVersion })}
                </span>
                <span
                  className="chip text-xs"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}
                >
                  {t('update.latestVersion', { version: result.version })}
                </span>
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                {t('update.changelogTitle')}
              </p>
              <div
                className="rounded-card p-4 max-h-48 overflow-y-auto"
                style={{ background: 'var(--paper-deep)' }}
              >
                {result.changelog ? (
                  <pre
                    className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
                    style={{ color: 'var(--ink)' }}
                  >
                    {result.changelog}
                  </pre>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    {t('update.changelogFallback')}
                  </p>
                )}
              </div>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {isHot
                  ? t('update.hotNote')
                  : result.requireApk
                    ? t('update.apkRequiredNote')
                    : t('update.fullNote')}
              </p>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div
          className="flex-shrink-0 -mx-5 -mb-5 px-5 py-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {flow.phase === 'error' ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="btn-ghost flex-1"
              >
                {t('update.close')}
              </button>
              <button
                onClick={onUpdate}
                className="btn-primary flex-1"
              >
                <RefreshCw size={18} />
                {t('common.retry')}
              </button>
            </div>
          ) : flow.phase === 'idle' ? (
            <div className="space-y-2">
              <div className="flex gap-3">
                {!mandatory && (
                  <button
                    onClick={onSkip}
                    className="btn-ghost flex-1"
                  >
                    {t('update.later')}
                  </button>
                )}
                <button
                  onClick={onUpdate}
                  className="btn-primary flex-1"
                >
                  {isHot ? <Zap size={18} /> : <Package size={18} />}
                  {t('update.updateNow')}
                </button>
              </div>
              {isHot && result.apkUrl && onApkUpdate && (
                <>
                  <button
                    onClick={() => setShowApkOption((v) => !v)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    <ChevronDown size={14} className={`transition-transform ${showApkOption ? 'rotate-180' : ''}`} />
                    {t('update.apkOption')}
                  </button>
                  {showApkOption && (
                    <button
                      onClick={onApkUpdate}
                      className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
                    >
                      <Package size={16} />
                      {t('update.downloadApk')}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : flow.phase === 'done' && !isHot ? (
            <button
              onClick={onClose}
              className="btn-ghost w-full"
            >
              {t('update.gotIt')}
            </button>
          ) : (
            <button
              disabled
              className="btn-primary w-full"
            >
              <Loader2 size={18} className="animate-spin" />
              {t('update.waiting')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
