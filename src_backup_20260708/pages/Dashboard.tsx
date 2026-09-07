import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import { TransactionCard } from '../components/TransactionCard';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { Wallet, GripVertical } from 'lucide-react';

interface DashboardProps {
  onAddRecord: () => void;
  onViewDetail: (filterType: 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance') => void;
  onGoToAccounts?: () => void;
  onEditTransaction?: (transaction: any) => void;
  onViewAllRecords?: () => void;
}

export const Dashboard = ({ onAddRecord, onViewDetail, onGoToAccounts, onEditTransaction, onViewAllRecords }: DashboardProps) => {
  const transactions = useStore((state) => state.transactions);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const todayIncome = useStore((state) => state.getTodayIncome());
  const todayExpense = useStore((state) => state.getTodayExpense());
  const monthIncome = useStore((state) => state.getMonthIncome());
  const monthExpense = useStore((state) => state.getMonthExpense());
  const totalIncome = useStore((state) => state.getTotalIncome());
  const totalExpense = useStore((state) => state.getTotalExpense());
  const totalAssets = useStore((state) => state.getTotalAssets());

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const orderedTransactions = displayOrder.length > 0
    ? recentTransactions.filter(t => displayOrder.includes(t.id))
        .sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id))
    : recentTransactions;

  const balance = monthIncome - monthExpense;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      const currentOrder = displayOrder.length > 0 ? [...displayOrder] : recentTransactions.map(t => t.id);
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      setDisplayOrder(currentOrder);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      setDraggedIndex(index);
      setIsDragging(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimer.current && isDragging) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (toIndex: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging && draggedIndex !== null && draggedIndex !== toIndex) {
      const currentOrder = displayOrder.length > 0 ? [...displayOrder] : recentTransactions.map(t => t.id);
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      setDisplayOrder(currentOrder);
    }
    setDraggedIndex(null);
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 overflow-y-auto">
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-6 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">财务概览</h1>
            <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={onGoToAccounts}
            className="bg-white/20 p-3 rounded-full hover:bg-white/30 active:bg-white/35 transition-colors"
          >
            <Wallet size={28} />
          </button>
        </div>
        <button
          onClick={() => onViewDetail('month-balance')}
          className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-left hover:bg-white/20 active:bg-white/25 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-sm font-medium">本月余额</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">{formatCurrencyShort(balance)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right min-w-0">
                <p className="text-emerald-100 text-xs">本月收入</p>
                <p className="text-lg font-semibold text-green-300 mt-0.5">{formatCurrencyShort(monthIncome)}</p>
                <p className="text-emerald-100 text-xs mt-2">本月支出</p>
                <p className="text-lg font-semibold text-red-300 mt-0.5">{formatCurrencyShort(-monthExpense)}</p>
              </div>
              <span className="text-emerald-200 text-xl flex-shrink-0">→</span>
            </div>
          </div>
        </button>
      </div>

      <div className="px-4 mt-4">
        <button
          onClick={() => onViewDetail('total-balance')}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-5 text-white text-left hover:opacity-95 active:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-purple-100 text-sm font-medium">总资产</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">{formatCurrencyShort(totalAssets)}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right min-w-0">
                <p className="text-purple-100 text-xs">总收入</p>
                <p className="text-lg font-semibold text-green-300 mt-0.5">{formatCurrencyShort(totalIncome)}</p>
                <p className="text-purple-100 text-xs mt-2">总支出</p>
                <p className="text-lg font-semibold text-red-300 mt-0.5">{formatCurrencyShort(-totalExpense)}</p>
              </div>
              <span className="text-purple-200 text-xl flex-shrink-0">→</span>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <StatCard type="income" title="今日收入" amount={todayIncome} onClick={() => onViewDetail('today-income')} />
          <StatCard type="expense" title="今日支出" amount={todayExpense} onClick={() => onViewDetail('today-expense')} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <StatCard type="income" title="本月收入" amount={monthIncome} onClick={() => onViewDetail('month-income')} />
          <StatCard type="expense" title="本月支出" amount={monthExpense} onClick={() => onViewDetail('month-expense')} />
        </div>
      </div>

      <div className="px-4 mt-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">最近记录</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onViewAllRecords}
              className="px-3 py-1.5 text-purple-500 text-xs font-medium bg-purple-50 rounded-full hover:bg-purple-100 active:bg-purple-200 transition-colors"
            >查看全部</button>
            <button
              onClick={onAddRecord}
              className="px-4 py-2 text-emerald-500 text-sm font-medium bg-emerald-50 rounded-full hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
            >记一笔</button>
          </div>
        </div>
        
        {orderedTransactions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500">暂无记录</p>
            <button
              onClick={onAddRecord}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full text-sm font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 active:opacity-90 transition-all"
            >
              添加第一笔记录
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orderedTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(index)}
                className={`flex items-start gap-3 p-4 bg-white rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${dragOverIndex === index ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
              >
                <TransactionCard
                  transaction={transaction}
                  onDelete={() => deleteTransaction(transaction.id)}
                  onEdit={() => onEditTransaction?.(transaction)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};