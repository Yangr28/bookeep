import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle, Clock, ChevronDown } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { getMonthKey } from '../utils/date';
import { MonthPicker } from '../components/MonthPicker';

interface BudgetsProps {
  onBack: () => void;
  onToast?: (msg: string) => void;
}

export const Budgets = ({ onBack, onToast }: BudgetsProps) => {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const categories = useStore((state) => state.categories);
  const transactions = useStore((state) => state.transactions);
  const addBudget = useStore((state) => state.addBudget);
  const deleteBudget = useStore((state) => state.deleteBudget);
  const calculateBudgetUsage = useStore((state) => state.calculateBudgetUsage);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const getBudgetColor = (percentage: number) => {
    if (percentage >= 100) return 'var(--expense)';
    if (percentage >= 80) return 'var(--expense-ink)';
    if (percentage >= 50) return 'var(--primary-ink)';
    return 'var(--primary)';
  };

  const handleEdit = (categoryId: string) => {
    const usage = calculateBudgetUsage(categoryId, selectedMonth, transactions);
    setEditAmount(usage.budget ? usage.budget.toString() : '');
    setEditingCategoryId(categoryId);
  };

  const handleSave = (categoryId: string) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      onToast?.(t('budgets.toast.invalidAmount'));
    } else {
      addBudget(categoryId, amount, selectedMonth);
      onToast?.(t('budgets.toast.saved'));
    }
    setEditingCategoryId(null);
    setEditAmount('');
  };

  const totalBudget = expenseCategories.reduce((sum, c) => {
    const usage = calculateBudgetUsage(c.id, selectedMonth, transactions);
    return sum + usage.budget;
  }, 0);

  const totalSpent = expenseCategories.reduce((sum, c) => {
    const usage = calculateBudgetUsage(c.id, selectedMonth, transactions);
    return sum + usage.spent;
  }, 0);

  const totalPercentage = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const overBudgetCategories = expenseCategories.filter((c) => {
    const usage = calculateBudgetUsage(c.id, selectedMonth, transactions);
    return usage.budget > 0 && usage.spent >= usage.budget;
  });

  return (
    <div className="page-root pb-nav page-enter">
      <div className="safe-top px-4 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="icon-btn" aria-label={t('budgets.back')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{t('budgets.title')}</h1>
            <p className="page-subtitle">{t('budgets.monthFormat', { year: selectedMonth.slice(0, 4), month: Number(selectedMonth.slice(5)) })}</p>
          </div>
        </div>

        <div className="card mt-4 p-4" style={{ background: 'var(--primary-soft)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--primary-ink)' }}>{t('budgets.totalUsage')}</span>
            <span className="text-sm font-medium amount-num" style={{ color: 'var(--primary-ink)' }}>
              ¥{formatCurrency(totalSpent)} / ¥{formatCurrency(totalBudget)}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-deep)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${totalPercentage}%`, background: getBudgetColor(totalPercentage) }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--primary-ink)' }}>{t('budgets.used', { percent: totalPercentage.toFixed(0) })}</span>
            {overBudgetCategories.length > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--expense-ink)' }}>
                <AlertCircle size={12} />
                {t('budgets.overCount', { count: overBudgetCategories.length })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="section-title">{t('budgets.selectMonth')}</label>
          <button
            onClick={() => setShowMonthPicker(true)}
            className="rounded-button px-3 py-2 text-sm flex items-center gap-1 amount-num"
            style={{ background: 'var(--card)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' }}
          >
            {t('budgets.monthFormat', { year: selectedMonth.slice(0, 4), month: selectedMonth.slice(5) })}
            <ChevronDown size={14} style={{ color: 'var(--ink-2)' }} />
          </button>
        </div>

        <div>
          {expenseCategories.map((category) => {
            const usage = calculateBudgetUsage(category.id, selectedMonth, transactions);
            const isOverBudget = usage.budget > 0 && usage.spent >= usage.budget;
            const IconComponent = getIcon(category.icon);
            const pctColor = usage.percentage >= 100 ? 'var(--expense)' : usage.percentage >= 80 ? 'var(--expense-ink)' : 'var(--ink-2)';

            return (
              <div
                key={category.id}
                className="card mb-3 p-4"
                style={isOverBudget ? { border: '1.5px solid var(--expense)' } : undefined}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="p-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${category.color}30` }}
                  >
                    <IconComponent size={20} style={{ color: category.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>{category.name}</span>
                      {isOverBudget && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--expense)' }}>
                          <AlertCircle size={12} />
                          {t('budgets.overBudget')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                        {formatCurrencyShort(usage.spent)} / {formatCurrencyShort(usage.budget)}
                      </span>
                      <span className="text-sm font-medium" style={{ color: pctColor }}>
                        {usage.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--paper-deep)' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${usage.percentage}%`, background: getBudgetColor(usage.percentage) }}
                  />
                </div>

                {editingCategoryId === category.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder={t('budgets.amountPlaceholder')}
                      className="flex-1 rounded-button px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                    />
                    <button
                      onClick={() => handleSave(category.id)}
                      className="p-2 rounded-button"
                      style={{ background: 'var(--primary)', color: '#fff' }}
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditAmount('');
                      }}
                      className="p-2 rounded-button"
                      style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    {usage.budget > 0 ? (
                      <>
                        <button
                          onClick={() => handleEdit(category.id)}
                          className="text-sm"
                          style={{ color: 'var(--ink-2)' }}
                        >
                          {t('budgets.editBudget')}
                        </button>
                        <button
                          onClick={() => {
                            const budget = useStore.getState().getBudgetByCategory(category.id, selectedMonth);
                            if (budget) deleteBudget(budget.id);
                          }}
                          className="text-sm"
                          style={{ color: 'var(--expense)' }}
                        >
                          {t('budgets.deleteBudget')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(category.id)}
                        className="flex items-center gap-1 text-sm"
                        style={{ color: 'var(--primary)' }}
                      >
                        <Plus size={16} />
                        {t('budgets.setBudget')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {overBudgetCategories.length > 0 && (
          <div className="card mt-4 p-4" style={{ background: 'var(--expense-soft)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--expense-ink)' }} />
              <div>
                <h3 className="font-medium" style={{ color: 'var(--expense-ink)' }}>{t('budgets.alertTitle')}</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--expense-ink)' }}>
                  {t('budgets.alertMessage', { categories: overBudgetCategories.map((c) => c.name).join(t('budgets.listSeparator')) })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card mt-4 p-4" style={{ background: 'var(--primary-soft)' }}>
          <div className="flex items-start gap-3">
            <Clock size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary-ink)' }} />
            <div>
              <h3 className="font-medium" style={{ color: 'var(--primary-ink)' }}>{t('budgets.tipsTitle')}</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--primary-ink)' }}>
                {t('budgets.tipsBody')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showMonthPicker && createPortal(
        <MonthPicker
          selectedMonth={selectedMonth}
          onMonthChange={(month) => {
            setSelectedMonth(month);
            setShowMonthPicker(false);
          }}
          onClose={() => setShowMonthPicker(false)}
        />,
        document.body
      )}
    </div>
  );
};
