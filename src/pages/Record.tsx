import { useEffect, useState, useCallback, memo } from 'react';
import { useStore } from '../store/useStore';
import { CategoryCard } from '../components/CategoryCard';
import { TransactionType, Transaction } from '../types';
import { formatDateTime } from '../utils/format';
import { parseSmartInput, findCategoryByIdentifier, findAccountByKeyword } from '../utils/smartParser';
import { Check, Calendar, Clock, Wallet, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import { getIcon } from '../utils/iconMap';

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
}

const RecordComponent = ({ editTransaction, onBack, selectedDateTime, selectedAccountId, onShowDatePicker, onShowTimePicker, onShowAccountPicker, amount, note, onAmountChange, onNoteChange, categoryId, type, onCategoryChange, onTypeChange, onAccountChange, onSubmit }: RecordProps) => {
  const [smartInput, setSmartInput] = useState('');
  const [showSmartResult, setShowSmartResult] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (editTransaction) {
      onTypeChange(editTransaction.type);
      onCategoryChange(editTransaction.categoryId);
    }
    // 非编辑模式不重置 type/categoryId，由外部入口（底部导航/首页智能输入）设置
  }, [editTransaction, onTypeChange, onCategoryChange]);

  const isEditMode = !!editTransaction;

  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const filteredCategories = categories.filter((c) => c.type === type);

  const isToday = () => {
    const today = new Date();
    return selectedDateTime.toDateString() === today.toDateString();
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
          <button onClick={onBack} className="icon-btn" aria-label="返回">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
          {isEditMode ? '编辑记录' : '记一笔'}
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
                placeholder="智能记账，如「午饭28」"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--ink)' }}
              />
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
                已智能解析，确认后保存
              </p>
            )}
          </div>
        )}

        {/* 支出/收入切换 */}
        <div className="seg">
          <button
            onClick={() => {
              onTypeChange('expense');
              onCategoryChange(null);
            }}
            className="seg-item"
            style={type === 'expense'
              ? { background: 'var(--expense)', color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(224,104,79,0.3)' }
              : undefined}
          >
            支出
          </button>
          <button
            onClick={() => {
              onTypeChange('income');
              onCategoryChange(null);
            }}
            className="seg-item"
            style={type === 'income'
              ? { background: 'var(--primary)', color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(46,133,222,0.3)' }
              : undefined}
          >
            收入
          </button>
        </div>

        {/* 分类 */}
        <div className="card p-4">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-2)' }}>选择分类</p>
          <div className="grid grid-cols-4 gap-2">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={categoryId === category.id}
                onClick={() => onCategoryChange(category.id)}
              />
            ))}
          </div>
          {hasCategoryError && (
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--expense)' }}>请选择一个分类</p>
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
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--expense)' }}>金额必须大于 0</p>
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
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>账户</p>
              <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: selectedAccount ? 'var(--ink)' : 'var(--expense)' }}>
                {selectedAccount ? selectedAccount.name : '请选择账户'}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button onClick={onShowDatePicker} className="w-full flex items-center gap-3 p-4 active:brightness-95" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--paper-deep)', color: 'var(--primary)' }}>
              <Calendar size={19} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>日期</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                {isToday() ? '今天' : formatDateTime(selectedDateTime.toISOString()).split(' ')[0]}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
          </button>

          <button onClick={onShowTimePicker} className="w-full flex items-center gap-3 p-4 active:brightness-95" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--paper-deep)', color: 'var(--primary)' }}>
              <Clock size={19} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>时间</p>
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
              placeholder="添加备注"
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
          {isEditMode ? '保存修改' : '确认记账'}
        </button>
      </div>
    </div>
  );
};

export const Record = memo(RecordComponent);
