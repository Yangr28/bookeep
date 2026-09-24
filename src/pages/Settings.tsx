import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import {
  exportData,
  downloadExportFile,
  parseImportData,
  loadBackupRecords,
  saveBackupRecord,
  deleteBackupRecord,
  readBackupFile,
  type BackupRecord,
} from '../utils/export';
import { getLocalVersions, compareVersions } from '../utils/update';
import type { UpdateFlowState } from '../hooks/useUpdateCheck';
import {
  ArrowLeft,
  Download,
  Upload,
  Info,
  HelpCircle,
  Shield,
  Sun,
  Moon,
  X,
  RefreshCw,
  RotateCcw,
  Loader2,
  AlertCircle,
  Tags,
  ChevronRight,
  Trash2,
  FileText,
  History,
  CheckCircle2,
  Scale,
} from 'lucide-react';

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
  const { t } = useTranslation();
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const [showChangelog, setShowChangelog] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [subPage, setSubPage] = useState<'help' | 'privacy' | 'backups' | null>(null);
  const [nativeVersion, setNativeVersion] = useState('');
  const [hotVersion, setHotVersion] = useState('');

  /** 操作反馈弹窗（替代 alert） */
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /** 导入确认弹窗（覆盖当前数据） */
  const [importConfirm, setImportConfirm] = useState<{ data: ReturnType<typeof parseImportData> } | null>(null);
  /** 备份管理：备份列表 */
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const refreshBackups = useCallback(() => setBackups(loadBackupRecords()), []);
  useEffect(() => {
    refreshBackups();
  }, [refreshBackups]);

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
  const getAccountReconciliation = useStore((state) => state.getAccountReconciliation);
  const recalculateAllBalances = useStore((state) => state.recalculateAllBalances);
  /** 余额与流水对不上的账户数 */
  const mismatchCount = accounts.filter((a) => Math.abs(getAccountReconciliation(a.id).diff) >= 0.005).length;

  /** 按流水重算所有账户余额 */
  const handleRecalculate = () => {
    const changed = recalculateAllBalances();
    if (changed > 0) {
      showToast('success', t('settings.toast.recalcDoneTitle'), t('settings.toast.recalcDoneMessage', { count: changed }));
    } else {
      showToast('success', t('settings.toast.balancedTitle'), t('settings.toast.balancedMessage'));
    }
  };

  const handleExport = async () => {
    try {
      const data = exportData({ transactions, accounts, categories, transfers, recurringRecords, templates, budgets, fixedDeposits, loans });
      const { uri, fileName } = await downloadExportFile(data);

      // 保存备份记录到应用内
      saveBackupRecord({
        id: `${Date.now()}`,
        fileName,
        fileUri: uri,
        exportTime: data.exportTime,
        stats: {
          transactions: transactions.length,
          accounts: accounts.length,
          categories: categories.length,
          transfers: transfers.length,
          recurringRecords: recurringRecords.length,
          templates: templates.length,
          budgets: budgets.length,
          fixedDeposits: fixedDeposits.length,
          loans: loans.length,
        },
      });
      refreshBackups();

      showToast('success', t('settings.toast.exportSuccessTitle'), t('settings.toast.exportSuccessMessage'));
    } catch (error) {
      console.error('Export error:', error);
      showToast('error', t('settings.toast.exportFailedTitle'), t('settings.toast.exportFailedMessage'));
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
          // 弹出确认覆盖弹窗
          setImportConfirm({ data: imported });
        } catch (err) {
          showToast('error', t('settings.toast.importFailedTitle'), err instanceof Error ? err.message : t('settings.toast.invalidFile'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /** 确认导入：覆盖当前数据 */
  const confirmImport = () => {
    if (!importConfirm) return;
    const imported = importConfirm.data;
    setTransactions(imported.transactions);
    setAccounts(imported.accounts);
    setCategories(imported.categories);
    setTransfers(imported.transfers);
    setRecurringRecords(imported.recurringRecords);
    setTemplates(imported.templates);
    setBudgets(imported.budgets);
    setFixedDeposits(imported.fixedDeposits);
    setLoans(imported.loans);

    setImportConfirm(null);
    showToast(
      'success',
      t('settings.toast.importSuccessTitle'),
      t('settings.toast.importSuccessMessage', {
        transactions: imported.transactions.length,
        accounts: imported.accounts.length,
        categories: imported.categories.length,
      }),
    );
  };

  /** 从备份记录恢复 */
  const handleRestoreBackup = async (record: BackupRecord) => {
    try {
      const imported = await readBackupFile(record);
      setTransactions(imported.transactions);
      setAccounts(imported.accounts);
      setCategories(imported.categories);
      setTransfers(imported.transfers);
      setRecurringRecords(imported.recurringRecords);
      setTemplates(imported.templates);
      setBudgets(imported.budgets);
      setFixedDeposits(imported.fixedDeposits);
      setLoans(imported.loans);

      showToast('success', t('settings.toast.restoreSuccessTitle'), t('settings.toast.restoreSuccessMessage', { name: record.fileName }));
    } catch (err) {
      showToast('error', t('settings.toast.restoreFailedTitle'), err instanceof Error ? err.message : t('settings.toast.fileMissing'));
    }
  };

  /** 删除备份记录（及文件） */
  const handleDeleteBackup = async (record: BackupRecord) => {
    try {
      await deleteBackupRecord(record.id, true);
      refreshBackups();
      showToast('success', t('settings.toast.deletedTitle'), t('settings.toast.backupDeletedMessage', { name: record.fileName }));
    } catch (err) {
      showToast('error', t('settings.toast.deleteFailedTitle'), err instanceof Error ? err.message : t('settings.toast.pleaseRetry'));
    }
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
   * 可回退的历史版本列表：取比当前运行版本旧、且附带热更新包的所有 Release。
   * 当前运行版本 = 热更新版本（若有），否则为整包内置 Web 版本——
   * 纯整包安装（从未应用过热更新）也允许回退 Web 版本。
   */
  const rollbackTargets = (() => {
    if (!onRollback || !releases) return [];
    const runningWeb = hotVersion || appVersion;
    return releases.filter(
      (r) => r.hasHotPackage && compareVersions(r.version, runningWeb) < 0,
    );
  })();

  const rollbackBusy = rollbackFlow?.phase === 'downloading' || rollbackFlow?.phase === 'installing';

  /** 内置更新日志（GitHub 拉取失败时回退显示），随语言切换更新 */
  const builtinReleases = useMemo<FetchedRelease[]>(() => {
    const obj = t('settings.builtinChangelog', { returnObjects: true }) as unknown as
      | Record<string, { date: string; notes: string[] }>
      | undefined;
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).map(([key, v]) => ({
      version: key.replace(/^v/, '').replace(/_plus$/, '+').replace(/_/g, '.'),
      date: v.date,
      notes: v.notes,
      hasHotPackage: false,
    }));
  }, [t]);

  /** 确认回退：触发下载并激活用户选择的旧版本热更新包（激活后 WebView 自动重载） */
  const handleRollback = (version: string) => {
    if (!version || !onRollback || rollbackBusy) return;
    onRollback(version);
  };

  return (
    <div className={`page-root ${isTab ? 'pb-nav' : 'pb-24'}`}>
      {/* 帮助与反馈子页面 */}
      {subPage === 'help' && (
        <>
          <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
            <button onClick={() => setSubPage(null)} className="icon-btn" aria-label={t('settings.back')}>
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="page-title">{t('settings.help.title')}</h1>
            </div>
          </div>
          <div className="px-4 mt-3 space-y-3">
            <div className="card p-4">
              <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>{t('settings.help.quickStart')}</h3>
              <div className="space-y-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.recordTitle')}</p>
                  <p>{t('settings.help.recordBody')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.accountTitle')}</p>
                  <p>{t('settings.help.accountBody')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.statsTitle')}</p>
                  <p>{t('settings.help.statsBody')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.backupTitle')}</p>
                  <p>{t('settings.help.backupBody')}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>{t('settings.help.faqTitle')}</h3>
              <div className="space-y-3 text-sm" style={{ color: 'var(--ink-2)' }}>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.faq1q')}</p>
                  <p>{t('settings.help.faq1a')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.faq2q')}</p>
                  <p>{t('settings.help.faq2a')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.help.faq3q')}</p>
                  <p>{t('settings.help.faq3a')}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>{t('settings.help.feedbackTitle')}</h3>
              <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>{t('settings.help.feedbackIntro')}</p>
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
                      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('settings.help.githubIssuesDesc')}</p>
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
            <button onClick={() => setSubPage(null)} className="icon-btn" aria-label={t('settings.back')}>
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="page-title">{t('settings.about.privacy')}</h1>
            </div>
          </div>
          <div className="px-4 mt-3 space-y-3 pb-6">
            <div className="card p-4 space-y-4 text-sm" style={{ color: 'var(--ink-2)' }}>
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('settings.privacy.updated')}</p>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s1Title')}</h3>
                <p>{t('settings.privacy.s1Lead')}<strong>{t('settings.privacy.s1Strong')}</strong>{t('settings.privacy.s1Tail')}</p>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s2Title')}</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('settings.privacy.s2Item1')}</li>
                  <li>{t('settings.privacy.s2Item2')}</li>
                  <li>{t('settings.privacy.s2Item3')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s3Title')}</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('settings.privacy.s3Item1')}</li>
                  <li>{t('settings.privacy.s3Item2')}</li>
                  <li>{t('settings.privacy.s3Item3')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s4Title')}</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>{t('settings.privacy.s4StorageTitle')}</strong>{t('settings.privacy.s4StorageBody')}</li>
                  <li><strong>{t('settings.privacy.s4CameraTitle')}</strong>{t('settings.privacy.s4CameraBody')}</li>
                  <li><strong>{t('settings.privacy.s4NotifyTitle')}</strong>{t('settings.privacy.s4NotifyBody')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s5Title')}</h3>
                <p>{t('settings.privacy.s5Intro')}</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>GitHub（{t('settings.privacy.s5GithubDesc')}）：https://github.com</li>
                  <li>{t('settings.privacy.s5RateDesc')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s6Title')}</h3>
                <p>{t('settings.privacy.s6Body')}</p>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s7Title')}</h3>
                <p>{t('settings.privacy.s7Body')}</p>
              </div>

              <div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--ink)' }}>{t('settings.privacy.s8Title')}</h3>
                <p>{t('settings.privacy.s8Body')}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 已导出数据管理子页面 */}
      {subPage === 'backups' && (
        <>
          <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
            <button onClick={() => setSubPage(null)} className="icon-btn" aria-label={t('settings.back')}>
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="page-title">{t('settings.backupPage.title')}</h1>
            </div>
          </div>
          <div className="px-4 mt-3 space-y-3 pb-6">
            <div className="card p-4 text-sm" style={{ color: 'var(--ink-2)' }}>
              {t('settings.backupPage.intro')}
            </div>

            {backups.length === 0 ? (
              <div className="card p-8 flex flex-col items-center text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                  style={{ background: 'var(--paper-deep)' }}
                >
                  <FileText size={28} style={{ color: 'var(--ink-2)' }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.backupPage.emptyTitle')}</p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.backupPage.emptyHint')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((b) => {
                  const date = new Date(b.exportTime);
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                  const totalItems = b.stats.transactions + b.stats.transfers + b.stats.recurringRecords;
                  return (
                    <div key={b.id} className="card overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                          >
                            <FileText size={21} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{b.fileName}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{dateStr}</p>
                          </div>
                          {b.fileUri.startsWith('downloads://') && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                            >
                              {t('settings.backupPage.browserBadge')}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                          <div className="rounded-button py-1.5" style={{ background: 'var(--paper-deep)' }}>
                            <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>{b.stats.transactions}</p>
                            <p className="text-[10px]" style={{ color: 'var(--ink-2)' }}>{t('settings.backupPage.statTransactions')}</p>
                          </div>
                          <div className="rounded-button py-1.5" style={{ background: 'var(--paper-deep)' }}>
                            <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>{b.stats.accounts}</p>
                            <p className="text-[10px]" style={{ color: 'var(--ink-2)' }}>{t('settings.backupPage.statAccounts')}</p>
                          </div>
                          <div className="rounded-button py-1.5" style={{ background: 'var(--paper-deep)' }}>
                            <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>{totalItems}</p>
                            <p className="text-[10px]" style={{ color: 'var(--ink-2)' }}>{t('settings.backupPage.statOthers')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex" style={{ borderTop: '1px solid var(--line)' }}>
                        <button
                          onClick={() => handleRestoreBackup(b)}
                          disabled={b.fileUri.startsWith('downloads://')}
                          className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 active:brightness-95 disabled:opacity-40"
                          style={{ color: 'var(--primary)' }}
                        >
                          <RotateCcw size={15} />
                          {t('settings.backupPage.restore')}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b)}
                          className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 active:brightness-95"
                          style={{ borderLeft: '1px solid var(--line)', color: 'var(--expense)' }}
                        >
                          <Trash2 size={15} />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!subPage && (
      <>
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        {!isTab && onBack && (
          <button onClick={onBack} className="icon-btn" aria-label={t('settings.back')}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="page-title">{isTab ? t('settings.profileTitle') : t('settings.title')}</h1>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* 数据管理 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('settings.data.sectionTitle')}</h3>
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Download size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.data.export')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.data.exportDesc')}</p>
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
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.data.import')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.data.importDesc')}</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button
            onClick={() => setSubPage('backups')}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <History size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.data.backups')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {backups.length > 0 ? t('settings.data.backupCount', { count: backups.length }) : t('settings.data.backupsDesc')}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button
            onClick={handleRecalculate}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div
              className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0"
              style={mismatchCount > 0
                ? { background: 'var(--expense-soft)', color: 'var(--expense)' }
                : { background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <Scale size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.data.recalculate')}</p>
              <p className="text-sm" style={{ color: mismatchCount > 0 ? 'var(--expense)' : 'var(--ink-2)' }}>
                {mismatchCount > 0 ? t('settings.data.recalculateMismatch', { count: mismatchCount }) : t('settings.data.recalculateDesc')}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>
        </div>

        {/* 分类管理（仅当传入回调时显示） */}
        {onGoToCategories && (
          <div className="card overflow-hidden">
            <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('settings.manage.sectionTitle')}</h3>
            </div>
            <button
              onClick={onGoToCategories}
              className="w-full flex items-center gap-4 p-4 active:brightness-95"
            >
              <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <Tags size={21} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.manage.categories')}</p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.manage.categoriesDesc')}</p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
            </button>
          </div>
        )}

        {/* 外观 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('settings.appearance.sectionTitle')}</h3>
          </div>

          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
          >
            <div
              className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0"
              style={isDark
                ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                : { background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}
            >
              {isDark ? <Moon size={21} /> : <Sun size={21} />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.appearance.darkMode')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{isDark ? t('settings.appearance.darkOn') : t('settings.appearance.darkOff')}</p>
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

          {/* 语言选择：跟随系统 / 中文 / English */}
          <div className="w-full flex items-center gap-4 p-4" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>
              <FileText size={21} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.language.title')}</p>
              <div className="flex gap-1.5 mt-2">
                {(['system', 'zh-CN', 'en-US'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`chip px-3 py-1 text-xs ${language === lang ? 'chip-active' : 'chip-inactive'}`}
                  >
                    {lang === 'system' ? t('settings.language.system') : lang === 'zh-CN' ? t('settings.language.zh') : t('settings.language.en')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{t('settings.about.sectionTitle')}</h3>
          </div>

          <button
            onClick={() => setShowChangelog(true)}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Info size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.about.version')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {t('settings.about.currentVersion', { version: appVersion })}
                {hotVersion && nativeVersion && (
                  <span style={{ color: 'var(--primary)' }}>{t('settings.about.hotVersion', { version: nativeVersion })}</span>
                )}
                {rollbackTargets.length > 0 && (
                  <span style={{ color: 'var(--expense)' }}>{t('settings.about.rollbackAvailable', { count: rollbackTargets.length })}</span>
                )}
                {t('settings.about.changelogLink')}
              </p>
            </div>
            <span
              role="button"
              aria-label={t('settings.about.ariaCheckUpdate')}
              onClick={(e) => {
                e.stopPropagation();
                onCheckUpdate();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full flex-shrink-0 active:brightness-95"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <RefreshCw size={12} />
              {t('settings.about.checkUpdate')}
            </span>
          </button>

          <button
            onClick={() => setSubPage('help')}
            className="w-full flex items-center gap-4 p-4 active:brightness-95"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
              <HelpCircle size={21} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.about.help')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.about.helpDesc')}</p>
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
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.about.privacy')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.about.privacyDesc')}</p>
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
              <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('settings.changelog.title')}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCheckUpdate}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full active:brightness-95"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                >
                  <RefreshCw size={12} />
                  {t('settings.about.checkUpdate')}
                </button>
                <button onClick={() => setShowChangelog(false)} className="icon-btn w-9 h-9">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {(releases ?? builtinReleases).map((rel) => (
                <div key={rel.version}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${rel.version.endsWith('+') ? 'bg-[var(--paper-deep)] text-[var(--ink)]' : 'bg-[var(--primary-soft)] text-[var(--primary-ink)]'}`}>v{rel.version}</span>
                    {rel.version === appVersion && (
                      <span className="px-2 py-1 bg-[var(--primary-soft)] text-[var(--primary-ink)] text-xs font-medium rounded-full">{t('settings.changelog.currentBadge')}</span>
                    )}
                    <span className="text-sm text-[var(--ink-2)]">{rel.date}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-[var(--ink)]">
                    {rel.notes.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${rel.version.endsWith('+') ? 'bg-[var(--ink-2)]' : 'bg-[var(--primary)]'}`} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
              {rollbackTargets.length > 0 && !rollbackBusy && rollbackFlow?.phase !== 'done' && (
                <button
                  onClick={() => {
                    setRollbackOpen(true);
                    setShowChangelog(false);
                  }}
                  className="w-full py-2.5 text-sm font-medium flex items-center justify-center gap-2 rounded-button active:brightness-95"
                  style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
                >
                  <RotateCcw size={16} />
                  {t('settings.changelog.rollbackButton', { count: rollbackTargets.length })}
                </button>
              )}
              <button
                onClick={() => setShowChangelog(false)}
                className="btn-primary w-full py-3 font-medium"
              >
                {t('settings.changelog.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回退版本确认/进度弹窗 */}
      {rollbackOpen && rollbackTargets.length > 0 && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => !rollbackBusy && setRollbackOpen(false)}
        >
          <div
            className="card w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4" style={{ background: 'var(--expense-soft)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-card flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--card)', color: 'var(--expense)' }}
                >
                  <RotateCcw size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('settings.rollback.title')}</h3>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.rollback.subtitle')}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {rollbackFlow?.phase === 'downloading' ? (
                <div className="py-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 size={22} className="animate-spin flex-shrink-0" style={{ color: 'var(--expense)' }} />
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: 'var(--ink)' }}>{t('settings.rollback.downloading')}</p>
                      <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.rollback.downloadProgress', { percent: rollbackFlow.percent })}</p>
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
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.rollback.failed')}</p>
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
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.rollback.done')}</p>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.rollback.doneHint')}</p>
                </div>
              ) : (
                <div className="py-2 space-y-2">
                  {rollbackTargets.map((r) => (
                    <button
                      key={r.version}
                      onClick={() => handleRollback(r.version)}
                      className="w-full flex items-center justify-between p-3 rounded-button transition-colors active:scale-[0.98]"
                      style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                    >
                      <div className="text-left">
                        <p className="font-semibold">v{r.version}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{r.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('settings.rollback.updatesCount', { count: r.notes.length })}</span>
                        <ChevronRight size={16} style={{ color: 'var(--ink-2)' }} />
                      </div>
                    </button>
                  ))}
                  <ul className="text-xs space-y-1.5 mt-3" style={{ color: 'var(--ink-2)' }}>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--expense)' }} />
                      <span>{t('settings.rollback.notice1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--expense)' }} />
                      <span>{t('settings.rollback.notice2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--expense)' }} />
                      <span>{t('settings.rollback.notice3')}</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {(rollbackFlow?.phase === 'error' || !rollbackFlow || rollbackFlow.phase === 'idle') && (
              <div className="px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
                {rollbackFlow?.phase === 'error' ? (
                  <div className="flex gap-3">
                    <button onClick={() => setRollbackOpen(false)} className="btn-ghost flex-1">{t('settings.rollback.close')}</button>
                    <button onClick={() => { const first = rollbackTargets[0]; if (first) handleRollback(first.version); }} className="btn-danger flex-1 flex items-center justify-center gap-2">
                      <RefreshCw size={18} />
                      {t('common.retry')}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setRollbackOpen(false)} className="btn-ghost w-full">{t('common.cancel')}</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* 导入数据确认弹窗 */}
      {importConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setImportConfirm(null)}
        >
          <div
            className="card w-full max-w-md overflow-hidden animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4" style={{ background: 'var(--expense-soft)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-card flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--card)', color: 'var(--expense)' }}
                >
                  <AlertCircle size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('settings.importConfirm.title')}</h3>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('settings.importConfirm.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ink-2)' }}>
                {t('settings.importConfirm.intro')}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-button py-2" style={{ background: 'var(--paper-deep)' }}>
                  <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>{importConfirm.data.transactions.length}</p>
                  <p style={{ color: 'var(--ink-2)' }}>{t('settings.importConfirm.statTransactions')}</p>
                </div>
                <div className="rounded-button py-2" style={{ background: 'var(--paper-deep)' }}>
                  <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>{importConfirm.data.accounts.length}</p>
                  <p style={{ color: 'var(--ink-2)' }}>{t('settings.importConfirm.statAccounts')}</p>
                </div>
                <div className="rounded-button py-2" style={{ background: 'var(--paper-deep)' }}>
                  <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>{importConfirm.data.categories.length}</p>
                  <p style={{ color: 'var(--ink-2)' }}>{t('settings.importConfirm.statCategories')}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex gap-3">
                <button onClick={() => setImportConfirm(null)} className="btn-ghost flex-1">{t('common.cancel')}</button>
                <button onClick={confirmImport} className="btn-primary flex-1">{t('settings.importConfirm.confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作反馈 Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] animate-slide-up">
          <div
            className="card flex items-center gap-3 px-4 py-3 shadow-lg"
            style={{ minWidth: '280px', maxWidth: '90vw' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: toast.type === 'success' ? 'var(--primary-soft)' : toast.type === 'error' ? 'var(--expense-soft)' : 'var(--paper-deep)',
                color: toast.type === 'success' ? 'var(--primary)' : toast.type === 'error' ? 'var(--expense)' : 'var(--ink-2)',
              }}
            >
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{toast.title}</p>
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="icon-btn w-7 h-7 -mr-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};