import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { exportData, downloadExportFile } from '../utils/export';
import { getLocalVersions } from '../utils/update';
import { ArrowLeft, Download, Upload, Info, HelpCircle, Shield, Sun, Moon, X, RefreshCw } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  isDark: boolean;
  onToggleTheme: () => void;
  onCheckUpdate: () => void;
}

const GITHUB_REPO = (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim();

/** 从 GitHub Releases 拉取的更新日志条目 */
interface FetchedRelease {
  version: string;
  date: string;
  notes: string[];
}

export const Settings = ({ onBack, isDark, onToggleTheme, onCheckUpdate }: SettingsProps) => {
  const [showChangelog, setShowChangelog] = useState(false);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const transactions = useStore((state) => state.transactions);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const setTransactions = useStore((state) => state.setTransactions);
  const setAccounts = useStore((state) => state.setAccounts);
  const setCategories = useStore((state) => state.setCategories);

  const handleExport = async () => {
    try {
      const data = exportData(transactions, accounts, categories);
      await downloadExportFile(data);
      const fileName = `bookeep_backup_${new Date().toISOString().split('T')[0]}.json`;
      alert(`数据导出成功！\n\n文件名称：${fileName}\n\n保存位置：\n📁 文件管理 → 下载文件夹\n📱 或在手机文件管理器中搜索 "${fileName}"\n\n可在设置页面点击「导入数据」恢复此备份文件`);
    } catch (error) {
      console.error('Export error:', error);
      alert('数据导出失败，请重试');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const importedData = JSON.parse(jsonString);
          
          if (importedData.transactions) {
            setTransactions(importedData.transactions);
          }
          if (importedData.accounts) {
            setAccounts(importedData.accounts);
          }
          if (importedData.categories) {
            setCategories(importedData.categories);
          }
          
          alert('数据导入成功');
        } catch {
          alert('数据导入失败，请确保文件格式正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const [appVersion, setAppVersion] = useState(import.meta.env.APP_VERSION || '4.4.4');

  // 显示当前实际运行版本（热更新后为热更新版本号）
  useEffect(() => {
    getLocalVersions()
      .then((v) => {
        if (v.webVersion) setAppVersion(v.webVersion);
      })
      .catch(() => {
        // Web 环境使用构建版本号
      });
  }, []);

  // 从 GitHub Releases 拉取更新日志（与发版自动同步；失败时回退到内置日志）
  const [releases, setReleases] = useState<FetchedRelease[] | null>(null);

  useEffect(() => {
    if (!showChangelog || !GITHUB_REPO) return;
    let cancelled = false;
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(
        (data: Array<{ tag_name: string; body: string | null; published_at: string; draft: boolean }>) => {
          if (cancelled || !Array.isArray(data)) return;
          const list = data
            .filter((rel) => !rel.draft)
            .map((rel) => ({
              version: (rel.tag_name || '').replace(/^v/, ''),
              date: (rel.published_at || '').split('T')[0],
              notes: (rel.body || '')
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => l.replace(/^\d+\.\s*/, '')),
            }))
            .filter((rel) => rel.version);
          if (list.length > 0) setReleases(list);
        },
      )
      .catch(() => {
        // 网络异常时保留内置更新日志
      });
    return () => {
      cancelled = true;
    };
  }, [showChangelog]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">设置</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">数据管理</h3>
          </div>
          
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Download size={22} className="text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 dark:text-white">导出数据</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">将所有数据导出为 JSON 文件</p>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </button>
          
          <button
            onClick={handleImport}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <Upload size={22} className="text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 dark:text-white">导入数据</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">从 JSON 文件恢复数据</p>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mt-4">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">外观</h3>
          </div>
          
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-900/30' : 'bg-amber-50'}`}>
              {isDark ? (
                <Moon size={22} className="text-indigo-400" />
              ) : (
                <Sun size={22} className="text-amber-600" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 dark:text-white">深色模式</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isDark ? '已开启' : '已关闭'}</p>
            </div>
            <div className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDark ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mt-4">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">关于</h3>
          </div>
          
          <button
            onClick={() => setShowChangelog(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <Info size={22} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 dark:text-white">版本与更新</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">当前版本 v{appVersion} · 更新日志</p>
            </div>
            <span
              role="button"
              aria-label="检查更新"
              onClick={(e) => {
                e.stopPropagation();
                onCheckUpdate();
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full active:bg-indigo-100 dark:active:bg-indigo-900/50 transition-colors flex-shrink-0"
            >
              <RefreshCw size={12} />
              检查更新
            </span>
          </button>
          
          <button 
            onClick={() => alert('帮助与反馈功能开发中，敬请期待！')}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
              <HelpCircle size={22} className="text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 dark:text-white">帮助与反馈</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">使用指南和问题反馈</p>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </button>
          
          <button 
            onClick={() => alert('隐私政策功能开发中，敬请期待！')}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <Shield size={22} className="text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 dark:text-white">隐私政策</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">了解数据处理方式</p>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </button>
        </div>
      </div>

      {showChangelog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">版本更新日志</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={onCheckUpdate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <RefreshCw size={12} />
                  检查更新
                </button>
                <button
                  onClick={() => setShowChangelog(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {releases ? (
                releases.map((rel) => (
                  <div key={rel.version}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v{rel.version}</span>
                      {rel.version === appVersion && (
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full">当前版本</span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">{rel.date}</span>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {rel.notes.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
              <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.6</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-09-07</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>分类删除按钮恢复隐藏样式，配合确认弹窗与撤销机制防误删</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>侧滑返回改为边缘手势触发，与系统返回手感对齐，避免误触</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>交易明细页新增分类筛选，支持筛选未分类记录</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.5</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-09-07</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复记账完成后首页余额卡片显示丢失的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>合并首页重复的交易明细入口</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复进入明细页先滚动到页面中部再跳顶部的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>全部交易明细新增分类筛选（含未分类）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复列表滑动误触编辑或删除的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>编辑记录保存后返回进入前的页面</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化键盘自动弹出时机，仅在首次启动时聚焦</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>分类删除增加二次确认与撤销机制，防误删</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.4</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>智能记账支持币种识别，自动识别美元、欧元、港币、日元等常见币种</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复汇率换算弹窗定位异常问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.3</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复汇率换算器切换币种弹窗位置异常及底部遮挡问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>桌面小组件缩小为2×1尺寸，优化紧凑布局</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复小组件输入弹窗被键盘遮挡的问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.2</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>小组件改为智能输入模式，桌面直接输入记账内容，跳转应用自动解析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>货币种类扩展至150+种，覆盖全球所有ISO 4217货币代码</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.1</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>汇率支持实时更新，从开放API获取最新汇率数据</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>货币种类扩展至80+种，覆盖全球各大洲包括小众货币</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>货币选择器支持搜索，快速找到目标货币</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>汇率列表按地区分组，显示汇率来源（实时/默认/自定义）</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.4.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增汇率转换工具，支持16种主流货币实时换算</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>记账支持选择外币，自动按汇率换算为人民币入账</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>支持自定义汇率编辑，可手动调整各货币对人民币汇率</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增 2x2 桌面小组件，支持直接在桌面一键记账，无需打开应用</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.3.5</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>支持银行简称+尾号识别（如"工商6894"→工商银行6894账户）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复银行卡尾号被误判为金额的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化金额提取：先识别并移除账户关键词，再提取金额</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.3.4</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复"午餐"等关键词无法识别分类的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复银行名称被误识别为分类关键词的问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.3.3</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化智能记账识别算法：优先匹配用户现有账户和分类名称</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>更换应用图标为最新版本</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.3.2</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化智能记账：支持自动识别账户（银行名、支付宝、微信等）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>智能记账识别账户后自动从备注中去除账户关键词</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.3.1</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复账户选择弹窗被底部导航栏遮挡的问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-medium rounded-full">v4.3.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增周期记账功能：支持每天/每周/每月/每年定时自动记账</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记账模板功能：保存常用记录，一键快速记账</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>重新设计账户选择：改为选择器条+底部弹出面板，支持查看余额</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>快捷操作改为4宫格布局：周期记账、记账模板、预算、统计</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-medium rounded-full">v4.2.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化快速记账布局：备注上移、日期时间下移</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化分类图标尺寸和间距，提升视觉体验</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-medium rounded-full">v4.1.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复全部记录页面缺失快捷日期预设的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复日期筛选重置按钮的逻辑错误</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化全部记录页面深色模式适配</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-medium rounded-full">v4.0.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-07-16</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化记账统计页面：减少连续记账天数强调，新增月均金额和使用分类统计</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化首页记账提醒：调整为超过3天才显示提醒，不再每天催促</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>更换应用图标，使用全新设计</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>移除连续记账相关成就，新增累计活跃天数成就</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-medium rounded-full">v3.8.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-07-16</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记账提醒功能（未记账天数提醒）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增账户余额预警功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增批量操作优化（多选+批量删除）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增快捷操作栏</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记录卡片手势操作（左滑删除+右滑编辑）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增日期选择器快捷选项</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增应用锁功能（4位数字密码）</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-xs font-medium rounded-full">v3.7.0</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">2026-07-16</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增全局搜索功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增预算管理功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记账统计功能（连续记账天数+成就徽章）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>改进快速记账智能识别功能</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 text-xs font-medium rounded-full">v3.0.0+</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">早期版本</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>基础记账功能（收入/支出记录）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>账户管理（银行卡、现金等）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>分类管理（自定义分类）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>数据统计与图表展示</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span>数据导出/导入功能</span>
                  </li>
                </ul>
              </div>
              </>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowChangelog(false)}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};