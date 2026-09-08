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
      className="fixed inset-0 bg-black/50 z-[110] flex items-end sm:items-center justify-center"
      onClick={handleMaskClick}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-card max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          {closable && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-card flex items-center justify-center flex-shrink-0">
              {isHot ? <Zap size={26} /> : <Package size={26} />}
            </div>
            <div>
              <h3 className="text-lg font-bold">发现新版本 v{result.version}</h3>
              <p className="text-sm text-white/80">
                {isHot ? '快速更新 · 无需重新安装' : '完整更新 · 需下载安装包'}
                {mandatory && ' · 重要更新'}
              </p>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {flow.phase === 'error' ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-white mb-1">更新失败</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{flow.error}</p>
            </div>
          ) : flow.phase === 'downloading' ? (
            <div className="py-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 size={22} className="text-indigo-500 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-white">
                    正在下载{isHot ? '更新包' : '安装包'}...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {flow.percent}%{isHot ? ' · 更新包很小，请稍候' : ' · 请保持网络畅通'}
                  </p>
                </div>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(flow.percent, 2)}%` }}
                />
              </div>
            </div>
          ) : flow.phase === 'installing' ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-3">
                <Package size={28} className="text-indigo-500" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-white mb-1">安装包已下载</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                即将调起系统安装器，请在安装完成后重新打开 Bookeep
              </p>
            </div>
          ) : flow.phase === 'done' ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-3">
                <CheckCircle size={28} className="text-primary-500" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-white mb-1">
                {isHot ? '更新完成，正在重新加载...' : '安装器已启动'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isHot ? '页面将自动刷新到新版本' : '请在系统安装器中完成安装，安装后重新打开应用'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-medium rounded-full">
                  当前版本 v{isHot ? result.webVersion : result.nativeVersion}
                </span>
                <span className="px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 text-xs font-medium rounded-full">
                  最新版本 v{result.version}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                更新内容
              </p>
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-card p-4 max-h-48 overflow-y-auto">
                {result.changelog ? (
                  <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {result.changelog}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    性能优化与问题修复，建议及时更新。
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                {isHot
                  ? '热更新仅更新界面资源，下载后自动生效，不影响您的数据。'
                  : '整包更新会下载完整安装包，需在系统安装器中确认安装，记账数据不会丢失。'}
              </p>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          {flow.phase === 'error' ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-card bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={onUpdate}
                className="flex-1 py-3 rounded-card bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
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
                  className="flex-1 py-3 rounded-card bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  以后再说
                </button>
              )}
              <button
                onClick={onUpdate}
                className="flex-1 py-3 rounded-card bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
              >
                {isHot ? <Zap size={18} /> : <Package size={18} />}
                立即更新
              </button>
            </div>
          ) : flow.phase === 'done' && !isHot ? (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-card bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              我知道了
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3 rounded-card bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium cursor-not-allowed flex items-center justify-center gap-2"
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
