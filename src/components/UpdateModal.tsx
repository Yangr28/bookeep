import { Zap, Package, X, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { UpdateCheckResult } from '../utils/update';
import type { UpdateFlowState } from '../hooks/useUpdateCheck';

interface UpdateModalProps {
  result: UpdateCheckResult;
  flow: UpdateFlowState;
  onUpdate: () => void;
  onClose: () => void;
  onSkip: () => void;
}

export const UpdateModal = ({ result, flow, onUpdate, onClose, onSkip }: UpdateModalProps) => {
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
                发现新版本 v{result.version}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ink-2)' }}>
                {isHot ? '快速更新 · 无需重新安装' : '完整更新 · 需下载安装包'}
                {mandatory && ' · 重要更新'}
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
              <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>更新失败</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{flow.error}</p>
            </div>
          ) : flow.phase === 'downloading' ? (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 size={22} className="animate-spin flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                    正在下载{isHot ? '更新包' : '安装包'}...
                  </p>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    {flow.percent}%{isHot ? ' · 更新包很小，请稍候' : ' · 请保持网络畅通'}
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
              <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>安装包已下载</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                即将调起系统安装器，请在安装完成后重新打开 Bookeep
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
                {isHot ? '更新完成，正在重新加载...' : '安装器已启动'}
              </p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {isHot ? '页面将自动刷新到新版本' : '请在系统安装器中完成安装，安装后重新打开应用'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="chip chip-inactive text-xs">
                  当前版本 v{isHot ? result.webVersion : result.nativeVersion}
                </span>
                <span
                  className="chip text-xs"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}
                >
                  最新版本 v{result.version}
                </span>
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                更新内容
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
                    性能优化与问题修复，建议及时更新。
                  </p>
                )}
              </div>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {isHot
                  ? '热更新仅更新界面资源，下载后自动生效，不影响您的数据。'
                  : '整包更新会下载完整安装包，需在系统安装器中确认安装，记账数据不会丢失。'}
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
                关闭
              </button>
              <button
                onClick={onUpdate}
                className="btn-primary flex-1"
              >
                <RefreshCw size={18} />
                重试
              </button>
            </div>
          ) : flow.phase === 'idle' ? (
            <div className="flex gap-3">
              {!mandatory && (
                <button
                  onClick={onSkip}
                  className="btn-ghost flex-1"
                >
                  以后再说
                </button>
              )}
              <button
                onClick={onUpdate}
                className="btn-primary flex-1"
              >
                {isHot ? <Zap size={18} /> : <Package size={18} />}
                立即更新
              </button>
            </div>
          ) : flow.phase === 'done' && !isHot ? (
            <button
              onClick={onClose}
              className="btn-ghost w-full"
            >
              我知道了
            </button>
          ) : (
            <button
              disabled
              className="btn-primary w-full"
            >
              <Loader2 size={18} className="animate-spin" />
              请稍候...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
