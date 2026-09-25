import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { CategoryCard } from '../components/CategoryCard';
import { TransactionType, Transaction } from '../types';
import { formatDateTime } from '../utils/format';
import { isSameLocalDate } from '../utils/date';
import { parseSmartInput, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { getFrequentCategories, getFrequentAmounts, predictCategory, recommendAccount } from '../utils/recommender';
import { Check, Calendar, Clock, Wallet, Sparkles, ChevronRight, ArrowLeft, Circle, CheckCircle2, Mic } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { SpeechSheet } from '../components/SpeechSheet';

interface RecordProps {
  editTransaction?: Transaction | null;
  onBack?: () => void;
  selectedDateTime: Date;
  selectedAccountId: string | null;
  onShowDatePicker: () => void;
  onShowTimePicker: () => void;
  onShowAccountPicker: () => void;
  amount: string;
  note: string;
  onAmountChange: (amount: string) => void;
  onNoteChange: (note: string) => void;
  categoryId: string | null;
  type: TransactionType;
  onCategoryChange: (categoryId: string | null) => void;
  onTypeChange: (type: TransactionType) => void;
  onAccountChange: (accountId: string | null) => void;
  onSubmit: () => void;
  /** 连续记账开关（仅新增态生效） */
  continueMode: boolean;
  onContinueModeChange: (value: boolean) => void;
  /** 连续保存后自增，触发为下一笔重新预选分类 */
  resetSignal: number;
}

const RecordComponent = ({ editTransaction, onBack, selectedDateTime, selectedAccountId, onShowDatePicker, onShowTimePicker, onShowAccountPicker, amount, note, onAmountChange, onNoteChange, categoryId, type, onCategoryChange, onTypeChange, onAccountChange, onSubmit, continueMode, onContinueModeChange, resetSignal }: RecordProps) => {
  const { t } = useTranslation();
  const [smartInput, setSmartInput] = useState('');
  const [showSmartResult, setShowSmartResult] = useState(false);
  // 语音记账：仅探测能力决定麦克风渲染；识别在 SpeechSheet 内完成后回填输入框
  const { available: speechAvailable } = useSpeechToText();
  const [speechSheetOpen, setSpeechSheetOpen] = useState(false);

  useEffect(() => {
    // 滚动位置由 App.tsx 统一管理
    if (editTransaction) {
      onTypeChange(editTransaction.type);
      onCategoryChange(editTransaction.categoryId);
    }
    // 非编辑模式不重置 type/categoryId，由外部入口（底部导航/首页智能输入）设置
  }, [editTransaction, onTypeChange, onCategoryChange]);

  const isEditMode = !!editTransaction;

  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);
  const transactions = useStore((state) => state.transactions);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const filteredCategories = categories.filter((c) => c.type === type);

  /**
   * 分类智能排序：近 30 天有使用频次的分类按加权得分排前，其余维持用户配置原序在后；
   * 前 3 名带"常用"角标。无历史时结果等于原序、无角标。
   */
  const { orderedCategories, frequentBadgeIds } = useMemo(() => {
    const rankedIds = getFrequentCategories(transactions, type)
      .map((r) => r.categoryId)
      .filter((id) => filteredCategories.some((c) => c.id === id));
    const rankIndex = new Map(rankedIds.map((id, i) => [id, i]));
    const ordered = [...filteredCategories].sort((a, b) => {
      const ia = rankIndex.get(a.id);
      const ib = rankIndex.get(b.id);
      if (ia === undefined && ib === undefined) return 0; // 均无历史：保持配置原序
      if (ia === undefined) return 1;
      if (ib === undefined) return -1;
      return ia - ib;
    });
    return { orderedCategories: ordered, frequentBadgeIds: new Set(rankedIds.slice(0, 3)) };
    // filteredCategories 派生自 categories + type
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, categories, type]);

  // 常用金额（重复金额优先、最近补位），最多 4 个；当前已输入的金额不重复展示
  const frequentAmounts = useMemo(
    () => getFrequentAmounts(transactions, type, 4).filter((a) => a.toString() !== amount),
    [transactions, type, amount],
  );

  // 进入新增页且入口未预填（FAB 空进入）时做一次智能预选；
  // 编辑模式、首页智能输入带预填进入均不覆盖。
  // 预选只发生在"页面挂载"与"切换类型"两个重置点；网格手选/智能解析是离散事件，
  // 之后没有任何 effect 重跑预选，因此用户选择天然不会被覆盖。
  useEffect(() => {
    if (editTransaction) return;
    if (!categoryId) {
      const validIds = new Set(categories.filter((c) => c.type === type).map((c) => c.id));
      const prediction = predictCategory({ transactions, type, validCategoryIds: validIds, note });
      if (prediction.categoryId) onCategoryChange(prediction.categoryId);
    }
    if (!selectedAccountId) {
      const recommended = recommendAccount(transactions, accounts);
      if (recommended) onAccountChange(recommended.id);
    }
    // 仅在页面挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 连续记账保存后：App 侧已清空金额/备注/分类并把日期重置为现在，
  // 这里按包含新流水在内的最新历史为下一笔重新预选分类（账户/类型已保留）
  const firstResetSignalRef = useRef(true);
  useEffect(() => {
    if (firstResetSignalRef.current) {
      firstResetSignalRef.current = false;
      return;
    }
    const validIds = new Set(categories.filter((c) => c.type === type).map((c) => c.id));
    const prediction = predictCategory({ transactions, type, validCategoryIds: validIds });
    if (prediction.categoryId) onCategoryChange(prediction.categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const handleTypeChange = (next: TransactionType) => {
    onTypeChange(next);
    onCategoryChange(null);
    if (isEditMode) return;
    // 切换类型即重置点：为新类型预选高频分类（无历史则留空，由用户手选）
    const validIds = new Set(categories.filter((c) => c.type === next).map((c) => c.id));
    const prediction = predictCategory({ transactions, type: next, validCategoryIds: validIds });
    if (prediction.categoryId) onCategoryChange(prediction.categoryId);
  };

  const isToday = () => {
    return isSameLocalDate(selectedDateTime, new Date());
  };

  const hasAmountError = amount !== '' && parseFloat(amount) <= 0;
  const hasCategoryError = !categoryId;
  const hasAccountError = !selectedAccountId;
  const canSubmit = !!amount && parseFloat(amount) > 0 && !!categoryId && !!selectedAccountId;

  const handleSmartSubmit = useCallback(() => {
    if (!smartInput.trim()) return;

    // ★ 必须传入用户账户和分类，否则 parseSmartInput 无法精确匹配用户自定义账户名/分类名
    const result = parseSmartInput(smartInput, accounts, categories);
    let autoCategoryId: string | null = null;

    if (result.categoryKeyword) {
      autoCategoryId = findCategoryByIdentifier(categories, result.type, result.categoryKeyword);
    }

    // ★ 账户识别：之前完全缺失，导致记账页智能输入永远识别不到账户
    let autoAccountId: string | null = null;
    if (result.accountKeyword) {
      autoAccountId = findAccountByKeyword(accounts, result.accountKeyword);
    }

    onTypeChange(result.type);

    if (result.amount) {
      onAmountChange(result.amount);
    }

    if (autoCategoryId) {
      onCategoryChange(autoCategoryId);
    }

    if (autoAccountId) {
      onAccountChange(autoAccountId);
    }

    if (result.note) {
      onNoteChange(result.note);
    }

    setShowSmartResult(true);
    setTimeout(() => setShowSmartResult(false), 2000);
    setSmartInput('');
  }, [smartInput, accounts, categories, onTypeChange, onAmountChange, onCategoryChange, onAccountChange, onNoteChange]);

  const AccountIcon = selectedAccount ? getIcon(selectedAccount.icon) : Wallet;

  return (
    <div className="page-root flex flex-col" style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <div className="safe-top px-4 pt-2 pb-2 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="icon-btn" aria-label={t('record.back')}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
          {isEditMode ? t('record.titleEdit') : t('record.titleNew')}
        </h1>
      </div>

      <div className="flex-1 px-4 pb-36 space-y-3">
        {/* 智能记账（仅新增） */}
        {!isEditMode && (
          <div className="card p-3">
            <div className="flex items-center rounded-button px-3 py-2.5" style={{ background: 'var(--paper)' }}>
              <Sparkles size={16} className="mr-2 flex-shrink-0" style={{ color: 'var(--primary-ink)' }} />
              <input
                type="text"
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSmartSubmit();
                  }
                }}
                placeholder={t('record.smartPlaceholder')}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                style={{ color: 'var(--ink)' }}
              />
              {/* 原生环境降级显示：仅明确探测不可用时隐藏，避免整包后仍看不到入口 */}
              {speechAvailable !== false && (
                <button
                  type="button"
                  onClick={() => setSpeechSheetOpen(true)}
                  aria-label={t('speech.tapToSpeak')}
                  className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 card-press"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                >
                  <Mic size={15} />
                </button>
              )}
              <button
                onClick={handleSmartSubmit}
                disabled={!smartInput.trim()}
                className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={smartInput.trim()
                  ? { background: 'var(--primary)', color: '#fff' }
                  : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
              >
                <Check size={16} />
              </button>
            </div>
            {showSmartResult && (
              <p className="text-xs mt-2 text-center animate-fade-in" style={{ color: 'var(--primary)' }}>
                {t('record.smartParsed')}
              </p>
            )}
          </div>
        )}

        {/* 支出/收入切换 */}
        <div className="seg">
          <button
            onClick={() => handleTypeChange('expense')}
            className="seg-item"
            style={type === 'expense'
              ? { background: 'var(--expense)', color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(224,104,79,0.3)' }
              : undefined}
          >
            {t('record.expense')}
          </button>
          <button
            onClick={() => handleTypeChange('income')}
            className="seg-item"
            style={type === 'income'
              ? { background: 'var(--primary)', color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(46,133,222,0.3)' }
              : undefined}
          >
            {t('record.income')}
          </button>
        </div>

        {/* 分类 */}
        <div className="card p-4">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-2)' }}>{t('record.selectCategory')}</p>
          <div className="grid grid-cols-4 gap-2">
            {orderedCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={categoryId === category.id}
                isFrequent={frequentBadgeIds.has(category.id)}
                frequentLabel={t('record.frequentBadge')}
                onClick={() => onCategoryChange(category.id)}
              />
            ))}
          </div>
          {hasCategoryError && (
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--expense)' }}>{t('record.categoryRequired')}</p>
          )}
        </div>

        {/* 金额 */}
        <div className="card p-4">
          <div className="flex items-center px-2">
            <span
              className="text-3xl font-bold mr-2 amount-num flex-shrink-0"
              style={{ color: hasAmountError ? 'var(--expense)' : 'var(--ink-2)' }}
            >
              ¥
            </span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              className="text-4xl font-bold bg-transparent outline-none flex-1 min-w-0 amount-num"
              style={{ color: hasAmountError ? 'var(--expense)' : 'var(--ink)' }}
              autoFocus={isEditMode}
            />
          </div>
          {hasAmountError && (
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--expense)' }}>{t('record.amountInvalid')}</p>
          )}
          {!isEditMode && frequentAmounts.length > 0 && (
            <div
              className="flex gap-2 mt-3 overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {frequentAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onAmountChange(value.toString())}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium card-press amount-num"
                  style={{ background: 'var(--paper)', color: 'var(--ink-2)', border: '1px solid var(--line)' }}
                >
                  ¥{value}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 账户 / 日期 / 时间 / 备注 */}
        <div className="card overflow-hidden">
          <button onClick={onShowAccountPicker} className="w-full flex items-center gap-3 p-4 active:brightness-95">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={selectedAccount
                ? { backgroundColor: `${selectedAccount.color}30`, color: selectedAccount.color }
                : { background: hasAccountError ? 'var(--expense-soft)' : 'var(--primary-soft)', color: hasAccountError ? 'var(--expense)' : 'var(--primary)' }}
            >
              <AccountIcon size={19} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('record.account')}</p>
              <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: selectedAccount ? 'var(--ink)' : 'var(--expense)' }}>
                {selectedAccount ? selectedAccount.name : t('record.selectAccount')}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button onClick={onShowDatePicker} className="w-full flex items-center gap-3 p-4 active:brightness-95" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--paper-deep)', color: 'var(--primary)' }}>
              <Calendar size={19} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('record.date')}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                {isToday() ? t('record.today') : formatDateTime(selectedDateTime.toISOString()).split(' ')[0]}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button onClick={onShowTimePicker} className="w-full flex items-center gap-3 p-4 active:brightness-95" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--paper-deep)', color: 'var(--primary)' }}>
              <Clock size={19} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('record.time')}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                {formatDateTime(selectedDateTime.toISOString()).split(' ')[1]}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <div className="flex items-center gap-3 p-4" style={{ borderTop: '1px solid var(--line)' }}>
            <input
              type="text"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={t('record.notePlaceholder')}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        </div>
      </div>

      {/* 底部固定保存按钮 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 safe-bottom"
        style={{ background: 'var(--card)', borderTop: '1px solid var(--line)' }}
      >
        <button
          onClick={() => {
            if (canSubmit) {
              onSubmit();
            }
          }}
          disabled={!canSubmit}
          className="btn-primary w-full text-base py-3.5"
        >
          {isEditMode ? t('record.saveEdit') : continueMode ? t('record.saveAndContinue') : t('record.confirm')}
        </button>
        {!isEditMode && (
          <button
            type="button"
            role="switch"
            aria-checked={continueMode}
            onClick={() => onContinueModeChange(!continueMode)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs py-1"
            style={{ color: continueMode ? 'var(--primary)' : 'var(--ink-2)' }}
          >
            {continueMode ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {t('record.continueToggle')}
          </button>
        )}
      </div>

      <SpeechSheet
        open={speechSheetOpen}
        onClose={() => setSpeechSheetOpen(false)}
        onResult={(text) => setSmartInput(text)}
      />
    </div>
  );
};

export const Record = memo(RecordComponent);
