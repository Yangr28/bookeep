import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { getIcon } from '../utils/iconMap';
import { formatCurrency, formatCurrencyShort } from '../utils/format';

interface BudgetsProps {
  onBack: () => void;
}

export const Budgets = ({ onBack }: BudgetsProps) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const categories = useStore((state) => state.categories);
  const transactions = useStore((state) => state.transactions);
  const addBudget = useStore((state) => state.addBudget);
  const deleteBudget = useStore((state) => state.deleteBudget);
  const calculateBudgetUsage = useStore((state) => state.calculateBudgetUsage);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const getBudgetColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const handleEdit = (categoryId: string) => {
    const usage = calculateBudgetUsage(categoryId, selectedMonth, transactions);
    setEditAmount(usage.budget ? usage.budget.toString() : '');
    setEditingCategoryId(categoryId);
  };

  const handleSave = (categoryId: string) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount > 0) {
      addBudget(categoryId, amount, selectedMonth);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">预算管理</h1>
            <p className="text-purple-100 text-sm mt-1">{selectedMonth.replace('-', '年')}月</p>
          </div>
        </div>

        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-100">总预算使用</span>
            <span className="text-sm font-medium">{formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getBudgetColor(totalPercentage)}`}
              style={{ width: `${totalPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-purple-200">已使用 {totalPercentage.toFixed(0)}%</span>
            {overBudgetCategories.length > 0 && (
              <span className="text-xs text-red-300 flex items-center gap-1">
                <AlertCircle size={12} />
                {overBudgetCategories.length} 项超支
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">选择月份</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-3">
          {expenseCategories.map((category) => {
            const usage = calculateBudgetUsage(category.id, selectedMonth, transactions);
            const isOverBudget = usage.budget > 0 && usage.spent >= usage.budget;
            const IconComponent = getIcon(category.icon);

            return (
              <div
                key={category.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${isOverBudget ? 'border-2 border-red-200 dark:border-red-800' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="p-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <IconComponent
                      size={20}
                      style={{ color: category.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-white">{category.name}</span>
                      {isOverBudget && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} />
                          超支
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrencyShort(usage.spent)} / {formatCurrencyShort(usage.budget)}
                      </span>
                      <span className={`text-sm font-medium ${
                        usage.percentage >= 100 ? 'text-red-500' :
                        usage.percentage >= 80 ? 'text-orange-500' : 'text-gray-500'
                      }`}>
                        {usage.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-500 ${getBudgetColor(usage.percentage)}`}
                    style={{ width: `${usage.percentage}%` }}
                  />
                </div>

                {editingCategoryId === category.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="输入预算金额"
                      className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleSave(category.id)}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditAmount('');
                      }}
                      className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
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
                          className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 transition-colors"
                        >
                          修改预算
                        </button>
                        <button
                          onClick={() => {
                            const budget = useStore.getState().getBudgetByCategory(category.id, selectedMonth);
                            if (budget) deleteBudget(budget.id);
                          }}
                          className="text-sm text-red-500 hover:text-red-600 transition-colors"
                        >
                          删除预算
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(category.id)}
                        className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-600 transition-colors"
                      >
                        <Plus size={16} />
                        设置预算
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {overBudgetCategories.length > 0 && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-700 dark:text-red-400">预算超支提醒</h3>
                <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                  以下分类已超过预算：{overBudgetCategories.map((c) => c.name).join('、')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-700 dark:text-blue-400">预算小贴士</h3>
              <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                合理规划预算有助于控制开支，建议每月初设置各项预算目标。当某项支出超过预算的80%时，系统会提醒您注意控制。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
