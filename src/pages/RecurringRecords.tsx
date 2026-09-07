import { useState } from 'react';
import { ArrowLeft, Plus, Calendar, Repeat, Trash2, Edit3, Play, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getIcon } from '../utils/iconMap';
import { RecurringRecord } from '../types';

const RecurringRecords = ({ onBack }: { onBack: () => void }) => {
  const { recurringRecords, categories, accounts, addRecurringRecord, updateRecurringRecord, deleteRecurringRecord, toggleRecurringRecord } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecurringRecord | null>(null);

  const [form, setForm] = useState({
    type: 'expense' as 'expense' | 'income',
    amount: '',
    categoryId: '',
    note: '',
    accountId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    dayOfMonth: new Date().getDate(),
    dayOfWeek: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const openAddModal = () => {
    setEditingRecord(null);
    const defaultAccount = accounts[0];
    const defaultCategory = filteredCategories[0];
    setForm({
      type: 'expense',
      amount: '',
      categoryId: defaultCategory?.id || '',
      note: '',
      accountId: defaultAccount?.id || '',
      frequency: 'monthly',
      dayOfMonth: new Date().getDate(),
      dayOfWeek: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setShowModal(true);
  };

  const openEditModal = (record: RecurringRecord) => {
    setEditingRecord(record);
    setForm({
      type: record.type,
      amount: record.amount.toString(),
      categoryId: record.categoryId,
      note: record.note,
      accountId: record.accountId,
      frequency: record.frequency,
      dayOfMonth: record.dayOfMonth || new Date().getDate(),
      dayOfWeek: record.dayOfWeek || 1,
      startDate: record.startDate,
      endDate: record.endDate || '',
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.amount || !form.categoryId || !form.accountId) return;

    const data = {
      type: form.type,
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      note: form.note,
      accountId: form.accountId,
      frequency: form.frequency,
      dayOfMonth: form.frequency === 'monthly' || form.frequency === 'yearly' ? form.dayOfMonth : undefined,
      dayOfWeek: form.frequency === 'weekly' ? form.dayOfWeek : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      enabled: true,
    };

    if (editingRecord) {
      updateRecurringRecord(editingRecord.id, data);
    } else {
      addRecurringRecord(data);
    }
    setShowModal(false);
  };

  const getFrequencyText = (record: RecurringRecord) => {
    switch (record.frequency) {
      case 'daily': return '每天';
      case 'weekly': return `每周${['日', '一', '二', '三', '四', '五', '六'][record.dayOfWeek || 1]}`;
      case 'monthly': return `每月${record.dayOfMonth}日`;
      case 'yearly': return `每年${record.startDate.slice(5)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-6 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">周期记账</h1>
        </div>
        <p className="text-sm text-white/80">设置自动记账，免去重复录入</p>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{recurringRecords.length}</p>
            <p className="text-xs text-gray-500">周期任务</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-500">{recurringRecords.filter(r => r.enabled).length}</p>
            <p className="text-xs text-gray-500">运行中</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">
              {recurringRecords.filter(r => r.enabled).reduce((sum, r) => sum + r.amount, 0).toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">月度金额</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {recurringRecords.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Repeat size={36} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">还没有设置周期记账</p>
            <button
              onClick={openAddModal}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              创建周期任务
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringRecords.map((record) => {
              const category = categories.find((c) => c.id === record.categoryId);
              const account = accounts.find((a) => a.id === record.accountId);
              const IconComponent = getIcon(category?.icon || 'Circle');

              return (
                <div
                  key={record.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm transition-all ${
                    !record.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category?.color || '#6366f1'}20`, color: category?.color || '#6366f1' }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-lg font-bold ${record.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          {getFrequencyText(record)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {category?.name} · {account?.name}
                      </p>
                      {record.note && (
                        <p className="text-xs text-gray-400 mt-1">{record.note}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openEditModal(record)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => deleteRecurringRecord(record.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      开始: {record.startDate}{record.endDate ? ` · 结束: ${record.endDate}` : ''}
                    </span>
                    <button
                      onClick={() => toggleRecurringRecord(record.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        record.enabled
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      {record.enabled ? <Play size={12} /> : <X size={12} />}
                      {record.enabled ? '运行中' : '已暂停'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">{editingRecord ? '编辑周期任务' : '新建周期任务'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setForm({ ...form, type: t, categoryId: categories.find(c => c.type === t)?.id || '' });
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.type === t
                        ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {t === 'expense' ? '支出' : '收入'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">金额</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-xl font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分类</label>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.map((cat) => {
                    const IconComponent = getIcon(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setForm({ ...form, categoryId: cat.id })}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                          form.categoryId === cat.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500'
                            : 'bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <div className="p-1.5 rounded-full" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          <IconComponent size={16} />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">账户</label>
                <div className="flex gap-2 flex-wrap">
                  {accounts.map((acc) => {
                    const IconComponent = getIcon(acc.icon);
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setForm({ ...form, accountId: acc.id })}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                          form.accountId === acc.id
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                        }`}
                      >
                        <IconComponent size={14} />
                        <span className="text-xs font-medium">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">周期</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {([
                    { value: 'daily', label: '每天' },
                    { value: 'weekly', label: '每周' },
                    { value: 'monthly', label: '每月' },
                    { value: 'yearly', label: '每年' },
                  ] as const).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setForm({ ...form, frequency: f.value })}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        form.frequency === f.value
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {form.frequency === 'weekly' && (
                  <div className="flex gap-1 mt-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => setForm({ ...form, dayOfWeek: idx })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          form.dayOfWeek === idx
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">日期</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.dayOfMonth}
                      onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">备注</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="添加备注..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">结束日期 (可选)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleSubmit}
                disabled={!form.amount || !form.categoryId || !form.accountId}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  form.amount && form.categoryId && form.accountId
                    ? 'bg-indigo-500 hover:bg-indigo-600'
                    : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                }`}
              >
                {editingRecord ? '保存修改' : '创建周期任务'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={openAddModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-600 transition-all z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default RecurringRecords;
