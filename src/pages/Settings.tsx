import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { exportData, downloadExportFile, parseImportData } from '../utils/export';
import { getLocalVersions, compareVersions } from '../utils/update';
import type { UpdateFlowState } from '../hooks/useUpdateCheck';
import { ArrowLeft, Download, Upload, Info, HelpCircle, Shield, Sun, Moon, X, RefreshCw, RotateCcw, Loader2, AlertCircle, Tags, ChevronRight } from 'lucide-react';

interface SettingsProps {
  /** 以 tab 形式渲染（/profile「我的」）：标题改为「我的」、无返回键、底部 pb-nav */
  isTab?: boolean;
  onBack?: () => void;
  theme: 'light' | 'dark';
  isDark: boolean;
  onToggleTheme: () => void;
  onCheckUpdate: () => void;
  /** 跳转到分类管理页 */
  onGoToCategories?: () => void;
  /** 手动回退到指定历史热更新版本 */
  onRollback?: (targetVersion: string) => void;
  /** 回退流程状态（与更新流程共用） */
  rollbackFlow?: UpdateFlowState;
}

const GITHUB_REPO = (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim();

/** 从 GitHub Releases 拉取的更新日志条目 */
interface FetchedRelease {
  version: string;
  date: string;
  notes: string[];
  /** 是否附带热更新包（dist_v*.zip），可作为回退目标 */
  hasHotPackage: boolean;
}

export const Settings = ({ isTab = false, onBack, isDark, onToggleTheme, onCheckUpdate, onGoToCategories, onRollback, rollbackFlow }: SettingsProps) => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [subPage, setSubPage] = useState<'help' | 'privacy' | null>(null);
  const [nativeVersion, setNativeVersion] = useState('');
  const [hotVersion, setHotVersion] = useState('');
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const transactions = useStore((state) => state.transactions);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const transfers = useStore((state) => state.transfers);
  const recurringRecords = useStore((state) => state.recurringRecords);
  const templates = useStore((state) => state.templates);
  const budgets = useStore((state) => state.budgets);
  const fixedDeposits = useStore((state) => state.fixedDeposits);
  const loans = useStore((state) => state.loans);
  const setTransactions = useStore((state) => state.setTransactions);
  const setAccounts = useStore((state) => state.setAccounts);
  const setCategories = useStore((state) => state.setCategories);
  const setTransfers = useStore((state) => state.setTransfers);
  const setRecurringRecords = useStore((state) => state.setRecurringRecords);
  const setTemplates = useStore((state) => state.setTemplates);
  const setBudgets = useStore((state) => state.setBudgets);
  const setFixedDeposits = useStore((state) => state.setFixedDeposits);
  const setLoans = useStore((state) => state.setLoans);

  const handleExport = async () => {
    try {
      const data = exportData({ transactions, accounts, categories, transfers, recurringRecords, templates, budgets, fixedDeposits, loans });
      await downloadExportFile(data);
      const fileName = `bookeep_backup_${new Date().toISOString().split('T')[0]}.json`;
      alert(`数据导出成功！\n\n文件名称：${fileName}\n\n包含：交易记录、账户、分类、转账、定期记录、模板、预算、定期存款、贷款\n\n保存位置：\n📁 文件管理 → 下载文件夹\n📱 或在手机文件管理器中搜索 "${fileName}"\n\n可在设置页面点击「导入数据」恢复此备份文件`);
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
          const imported = parseImportData(jsonString);

          setTransactions(imported.transactions);
          setAccounts(imported.accounts);
          setCategories(imported.categories);
          setTransfers(imported.transfers);
          setRecurringRecords(imported.recurringRecords);
          setTemplates(imported.templates);
          setBudgets(imported.budgets);
          setFixedDeposits(imported.fixedDeposits);
          setLoans(imported.loans);

          alert(`数据导入成功！\n\n交易记录: ${imported.transactions.length} 条\n账户: ${imported.accounts.length} 个\n分类: ${imported.categories.length} 个\n转账: ${imported.transfers.length} 条\n定期记录: ${imported.recurringRecords.length} 条\n模板: ${imported.templates.length} 个`);
        } catch (err) {
          alert(err instanceof Error ? `导入失败: ${err.message}` : '数据导入失败，请确保文件格式正确');
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
        setNativeVersion(v.nativeVersion || '');
        setHotVersion(v.hotVersion || '');
      })
      .catch(() => {
        // Web 环境使用构建版本号
      });
  }, []);

  // 从 GitHub Releases 拉取更新日志（与发版自动同步；失败时回退到内置日志）
  // 同时用于确定可回退的历史版本，因此在页面挂载时即拉取（非仅打开更新日志时）
  const [releases, setReleases] = useState<FetchedRelease[] | null>(null);

  useEffect(() => {
    if (!GITHUB_REPO) return;
    let cancelled = false;
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(
        (data: Array<{ tag_name: string; body: string | null; published_at: string; draft: boolean; assets?: Array<{ name: string }> }>) => {
          if (cancelled || !Array.isArray(data)) return;
          const list = data
            .filter((rel) => !rel.draft)
            .map((rel) => ({
              version: (rel.tag_name || '').replace(/^v/, ''),
              date: (rel.published_at || '').split('T')[0],
              hasHotPackage: (rel.assets || []).some((a) => /^dist_.*\.zip$/i.test(a.name)),
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
  }, []);

  /**
   * 可回退目标版本：当前运行的是热更新版本（hotVersion 非空）时，
   * 取比当前版本旧、且附带热更新包的最新 Release。
   * 回退走与热更新相同的下载/激活流程，数据不受影响；旧版加载失败连续 2 次启动会自动回滚回来。
   */
  const rollbackTarget = (() => {
    if (!hotVersion || !onRollback || !releases) return '';
    const older = releases.filter(
      (r) => r.hasHotPackage && compareVersions(r.version, appVersion) < 0,
    );
    return older.length > 0 ? older[0].version : '';
  })();

  const rollbackBusy = rollbackFlow?.phase === 'downloading' || rollbackFlow?.phase === 'installing';

  /** 确认回退：触发下载并激活旧版本热更新包（激活后 WebView 自动重载） */
  const handleRollback = () => {
    if (!rollbackTarget || !onRollback || rollbackBusy) return;
    onRollback(rollbackTarget);
  };

  return (
    <div className={`page-root ${isTab ? 'pb-nav' : 'pb-24'}`}>
      {/* 帮助与反馈子页面 */}
      {subPage === 'help' && (
        <>
          <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
            <button onClick={() => setSubPage(null)} className="icon-btn" aria-label="返回">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="page-title">帮助与反馈</h1>
            </div>
          </div>
          <div className="px-4 mt-3 space-y-3">
            <div className="card p-4">
              <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>快速上手</h3>
              <div className="space-y-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>📝 记一笔</p>
                  <p>点击底部中央「记一笔」按钮，选择分类、输入金额、选择账户即可完成记账。也可在首页智能输入框输入「午餐30」快速记账。</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>💳 管理账户</p>
                  <p>在「资产」页面添加银行卡、现金、电子钱包等账户，记录每笔收支所属账户，实时掌握资产状况。</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>📊 查看统计</p>
                  <p>在「账单」页面按时间、分类查看收支明细，了解消费趋势。</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>🔄 数据备份</p>
                  <p>在「数据管理」中导出数据为 JSON 文件保存，换机时可导入恢复。</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>常见问题</h3>
              <div className="space-y-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Q: 数据会上传到云端吗？</p>
                  <p>A: 所有数据仅保存在本地，不会上传服务器。建议定期导出备份。</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Q: 换手机如何迁移数据？</p>
                  <p>A: 在旧手机「数据管理 → 导出数据」，将导出的 JSON 文件传到新手机，再「导入数据」即可。</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Q: 如何恢复误删的记录？</p>
                  <p>A: 记录删除后不可恢复，请谨慎操作。可在删除前先导出数据备份。</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>问题反馈</h3>
              <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>如遇问题或有建议，欢迎通过以下方式反馈：</p>
              <div className="space-y-2">
                {GITHUB_REPO && (
                  <a
                    href={`https://github.com/${GITHUB_REPO}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-button transition-all"
                    style={{ background: 'var(--paper)' }}
                  >
                    <div className="w-10 h-10 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      <Info size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold" style={{ color: 'var(--ink)' }}>GitHub Issues</p>
                      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>提交 Bug 或功能建议</p>
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--ink-2)' }} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 隐私政策子页面 */}
      {subPage === 'privacy' && (
        <>
          <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
            <button onClick={() => setSubPage(null)} className="icon-btn" aria-label="返回">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="page-title">隐私政策</h1>
            </div>
          </div>
          <div className="px-4 mt-3 space-y-3 pb-6">
            <div className="card p-4 space-y-4 text-sm" style={{ color: 'var(--ink-2)' }}>
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>最后更新：2026 年 9 月</p>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>一、信息收集</h3>
                <p>本应用尊重并保护用户隐私。我们<strong>不会收集</strong>任何个人身份信息。所有记账数据（交易记录、账户、分类等）均存储在您的设备本地，不会上传至任何服务器。</p>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>二、数据存储</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>记账数据使用浏览器 IndexedDB 本地存储，仅可在当前设备访问</li>
                  <li>导出的数据文件（JSON 格式）由用户自行保管，建议加密存储</li>
                  <li>清除应用数据或卸载应用将导致本地数据丢失，请提前导出备份</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>三、网络使用</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>应用仅在以下场景使用网络：检查更新（连接 GitHub Releases API）、下载热更新包</li>
                  <li>更新检查不会发送任何用户数据，仅请求版本信息</li>
                  <li>汇率转换功能使用在线汇率接口，不携带个人信息</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>四、权限说明</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>存储权限</strong>：用于导出/导入数据文件</li>
                  <li><strong>相机权限</strong>：用于拍票识别功能（OCR），图片仅在本地处理</li>
                  <li><strong>通知权限</strong>：用于周期性记账提醒</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>五、第三方服务</h3>
                <p>本应用使用以下第三方服务，其隐私政策请参考对应服务：</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>GitHub（代码托管、版本发布）：https://github.com</li>
                  <li>汇率数据接口：用于多币种换算</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>六、数据安全</h3>
                <p>我们采取合理的技术措施保护您的数据安全。但请注意，任何存储方式都无法保证 100% 安全，建议您定期导出数据备份。</p>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>七、政策变更</h3>
                <p>本隐私政策可能随应用更新而调整，重大变更将在应用内通知。继续使用即视为同意更新后的政策。</p>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>八、联系我们</h3>
                <p>如对本政策有任何疑问，可通过 GitHub Issues 联系我们。</p>
              </div>
            </div>
          </div>
        </>
      )}

      {!subPage && (
      <>
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        {!isTab && onBack && (
          <button onClick={onBack} className="icon-btn" aria-label="返回">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="page-title">{isTab ? '我的' : '设置'}</h1>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* 数据管理 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>数据管理</h3>
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Download size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>导出数据</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>将所有数据导出为 JSON 文件</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button
            onClick={handleImport}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Upload size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>导入数据</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>从 JSON 文件恢复数据</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>
        </div>

        {/* 分类管理（仅当传入回调时显示） */}
        {onGoToCategories && (
          <div className="card overflow-hidden">
            <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>记账管理</h3>
            </div>
            <button
              onClick={onGoToCategories}
              className="w-full flex items-center gap-4 p-4 active:brightness-95"
            >
              <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <Tags size={21} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>分类管理</p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>自定义收入/支出分类</p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
            </button>
          </div>
        )}

        {/* 外观 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>外观</h3>
          </div>

          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
          >
            <div
              className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0"
              style={isDark
                ? { background: '#1e2c42', color: 'var(--primary)' }
                : { background: '#faf1dc', color: '#d9930f' }}
            >
              {isDark ? <Moon size={21} /> : <Sun size={21} />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>深色模式</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{isDark ? '已开启' : '已关闭'}</p>
            </div>
            <div
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: isDark ? 'var(--primary)' : 'var(--paper-deep)' }}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
                style={{ transform: isDark ? 'translateX(28px)' : 'translateX(4px)' }}
              />
            </div>
          </button>
        </div>

        {/* 关于 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>关于</h3>
          </div>

          <button
            onClick={() => setShowChangelog(true)}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Info size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>版本与更新</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                当前版本 v{appVersion}
                {hotVersion && nativeVersion && (
                  <span style={{ color: 'var(--primary)' }}>（热更新 · 内置 v{nativeVersion}）</span>
                )}
                {' · 更新日志'}
              </p>
            </div>
            <span
              role="button"
              aria-label="检查更新"
              onClick={(e) => {
                e.stopPropagation();
                onCheckUpdate();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full flex-shrink-0 active:brightness-95"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <RefreshCw size={12} />
              检查更新
            </span>
          </button>

          {rollbackTarget && (
            <button
              onClick={() => setRollbackOpen(true)}
              className="w-full flex items-center gap-4 p-4 active:brightness-95"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: '#faf1dc', color: '#d9930f' }}>
                <RotateCcw size={21} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>回退到旧版本</p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                  当前新版界面不满意？可一键回退到 v{rollbackTarget}，数据不受影响
                </p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
            </button>
          )}

          <button
            onClick={() => alert('帮助与反馈功能开发中，敬请期待！')}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
              <HelpCircle size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>帮助与反馈</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>使用指南和问题反馈</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button
            onClick={() => setSubPage('privacy')}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
              <Shield size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>隐私政策</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>了解数据处理方式</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>
        </div>
      </div>

      {showChangelog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setShowChangelog(false)}
        >
          <div
            className="card w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>版本更新日志</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCheckUpdate}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full active:brightness-95"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                >
                  <RefreshCw size={12} />
                  检查更新
                </button>
                <button onClick={() => setShowChangelog(false)} className="icon-btn w-9 h-9">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {releases ? (
                releases.map((rel) => (
                  <div key={rel.version}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v{rel.version}</span>
                      {rel.version === appVersion && (
                        <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">当前版本</span>
                      )}
                      <span className="text-sm text-[var(--ink-2)]">{rel.date}</span>
                    </div>
                    <ul className="space-y-2 text-sm text-[var(--ink)]">
                      {rel.notes.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
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
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.6</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-09-07</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>分类删除按钮恢复隐藏样式，配合确认弹窗与撤销机制防误删</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>侧滑返回改为边缘手势触发，与系统返回手感对齐，避免误触</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>交易明细页新增分类筛选，支持筛选未分类记录</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.5</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-09-07</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复记账完成后首页余额卡片显示丢失的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>合并首页重复的交易明细入口</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复进入明细页先滚动到页面中部再跳顶部的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>全部交易明细新增分类筛选（含未分类）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复列表滑动误触编辑或删除的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>编辑记录保存后返回进入前的页面</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化键盘自动弹出时机，仅在首次启动时聚焦</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>分类删除增加二次确认与撤销机制，防误删</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.4</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>智能记账支持币种识别，自动识别美元、欧元、港币、日元等常见币种</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复汇率换算弹窗定位异常问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.3</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复汇率换算器切换币种弹窗位置异常及底部遮挡问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>桌面小组件缩小为2×1尺寸，优化紧凑布局</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复小组件输入弹窗被键盘遮挡的问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.2</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>小组件改为智能输入模式，桌面直接输入记账内容，跳转应用自动解析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>货币种类扩展至150+种，覆盖全球所有ISO 4217货币代码</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.1</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>汇率支持实时更新，从开放API获取最新汇率数据</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>货币种类扩展至80+种，覆盖全球各大洲包括小众货币</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>货币选择器支持搜索，快速找到目标货币</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>汇率列表按地区分组，显示汇率来源（实时/默认/自定义）</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.4.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增汇率转换工具，支持16种主流货币实时换算</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>记账支持选择外币，自动按汇率换算为人民币入账</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>支持自定义汇率编辑，可手动调整各货币对人民币汇率</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增 2x2 桌面小组件，支持直接在桌面一键记账，无需打开应用</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.3.5</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>支持银行简称+尾号识别（如"工商6894"→工商银行6894账户）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复银行卡尾号被误判为金额的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化金额提取：先识别并移除账户关键词，再提取金额</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.3.4</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复"午餐"等关键词无法识别分类的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复银行名称被误识别为分类关键词的问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.3.3</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化智能记账识别算法：优先匹配用户现有账户和分类名称</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>更换应用图标为最新版本</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.3.2</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-12</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化智能记账：支持自动识别账户（银行名、支付宝、微信等）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>智能记账识别账户后自动从备注中去除账户关键词</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.3.1</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复账户选择弹窗被底部导航栏遮挡的问题</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.3.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增周期记账功能：支持每天/每周/每月/每年定时自动记账</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记账模板功能：保存常用记录，一键快速记账</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>重新设计账户选择：改为选择器条+底部弹出面板，支持查看余额</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>快捷操作改为4宫格布局：周期记账、记账模板、预算、统计</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.2.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化快速记账布局：备注上移、日期时间下移</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化分类图标尺寸和间距，提升视觉体验</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.1.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-08-11</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复全部记录页面缺失快捷日期预设的问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>修复日期筛选重置按钮的逻辑错误</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化全部记录页面深色模式适配</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v4.0.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-07-16</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化记账统计页面：减少连续记账天数强调，新增月均金额和使用分类统计</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>优化首页记账提醒：调整为超过3天才显示提醒，不再每天催促</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>更换应用图标，使用全新设计</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>移除连续记账相关成就，新增累计活跃天数成就</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v3.8.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-07-16</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记账提醒功能（未记账天数提醒）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增账户余额预警功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增批量操作优化（多选+批量删除）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增快捷操作栏</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记录卡片手势操作（左滑删除+右滑编辑）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增日期选择器快捷选项</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增应用锁功能（4位数字密码）</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">v3.7.0</span>
                  <span className="text-sm text-[var(--ink-2)]">2026-07-16</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增全局搜索功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增预算管理功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>新增记账统计功能（连续记账天数+成就徽章）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>改进快速记账智能识别功能</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[var(--paper-deep)] text-[var(--ink)] text-xs font-medium rounded-full">v3.0.0+</span>
                  <span className="text-sm text-[var(--ink-2)]">早期版本</span>
                </div>
                <ul className="space-y-2 text-sm text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--ink-2)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>基础记账功能（收入/支出记录）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--ink-2)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>账户管理（银行卡、现金等）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--ink-2)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>分类管理（自定义分类）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--ink-2)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>数据统计与图表展示</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--ink-2)] rounded-full mt-1.5 flex-shrink-0" />
                    <span>数据导出/导入功能</span>
                  </li>
                </ul>
              </div>
              </>
              )}
            </div>
            <div className="p-4" style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={() => setShowChangelog(false)}
                className="btn-primary w-full py-3 font-medium"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回退版本确认/进度弹窗 */}
      {rollbackOpen && rollbackTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => !rollbackBusy && setRollbackOpen(false)}
        >
          <div
            className="card w-full max-w-md overflow-hidden animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4" style={{ background: 'var(--expense-soft)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-card flex items-center justify-center flex-shrink-0"
                  style={{ background: '#fff', color: 'var(--expense)' }}
                >
                  <RotateCcw size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>回退到 v{rollbackTarget}</h3>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>下载旧版界面资源并自动切换</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {rollbackFlow?.phase === 'downloading' ? (
                <div className="py-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 size={22} className="animate-spin flex-shrink-0" style={{ color: 'var(--expense)' }} />
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: 'var(--ink)' }}>正在下载旧版本...</p>
                      <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{rollbackFlow.percent}% · 资源包很小，请稍候</p>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(rollbackFlow.percent, 2)}%`, background: 'var(--expense)' }}
                    />
                  </div>
                </div>
              ) : rollbackFlow?.phase === 'error' ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'var(--expense-soft)' }}
                  >
                    <AlertCircle size={28} style={{ color: 'var(--expense)' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>回退失败</p>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{rollbackFlow.error}</p>
                </div>
              ) : rollbackFlow?.phase === 'done' ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'var(--primary-soft)' }}
                  >
                    <RotateCcw size={28} style={{ color: 'var(--primary)' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>回退完成，正在重新加载...</p>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>页面将自动刷新到旧版本</p>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ink-2)' }}>
                    将把界面从 <span className="font-semibold" style={{ color: 'var(--ink)' }}>v{appVersion}</span> 回退到 <span className="font-semibold" style={{ color: 'var(--ink)' }}>v{rollbackTarget}</span>。
                  </p>
                  <ul className="text-sm space-y-1.5" style={{ color: 'var(--ink-2)' }}>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--expense)' }} />
                      <span>仅切换界面资源，记账数据、账户、分类等完全不受影响</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--expense)' }} />
                      <span>回退后随时可通过「检查更新」再升级回新版本</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--expense)' }} />
                      <span>若旧版异常无法启动，连续打开 2 次应用会自动恢复到当前版本</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
              {rollbackFlow?.phase === 'error' ? (
                <div className="flex gap-3">
                  <button onClick={() => setRollbackOpen(false)} className="btn-ghost flex-1">关闭</button>
                  <button onClick={handleRollback} className="btn-danger flex-1 flex items-center justify-center gap-2">
                    <RefreshCw size={18} />
                    重试
                  </button>
                </div>
              ) : rollbackBusy || rollbackFlow?.phase === 'done' ? (
                <button
                  disabled
                  className="btn-ghost w-full flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Loader2 size={18} className="animate-spin" />
                  请稍候...
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setRollbackOpen(false)} className="btn-ghost flex-1">取消</button>
                  <button onClick={handleRollback} className="btn-danger flex-1 flex items-center justify-center gap-2">
                    <RotateCcw size={18} />
                    确认回退
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};