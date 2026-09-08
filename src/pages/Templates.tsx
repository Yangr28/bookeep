import { useState } from 'react';
import { ArrowLeft, Plus, Bookmark, Trash2, Edit3, X, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getIcon } from '../utils/iconMap';
import { RecordTemplate, Transaction } from '../types';

const TEMPLATE_ICONS = ['Bookmark', 'Coffee', 'Utensils', 'Car', 'ShoppingBag', 'Laptop', 'Heart', 'Gift', 'Bag', 'Briefcase'];
const TEMPLATE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const Templates = ({ onBack, onUseTemplate }: { onBack: () => void; onUseTemplate?: (transaction: Transaction) => void }) => {
  const { templates, categories, accounts, addTemplate, updateTemplate, deleteTemplate, addTransaction } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecordTemplate | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
    amount: '',
    categoryId: '',
    note: '',
    accountId: '',
    icon: 'Bookmark',
    color: '#ef4444',
  });

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const openAddModal = () => {
    setEditingTemplate(null);
    const defaultAccount = accounts[0];
    const defaultCategory = filteredCategories[0];
    setForm({
      name: '',
      type: 'expense',
      amount: '',
      categoryId: defaultCategory?.id || '',
      note: '',
      accountId: defaultAccount?.id || '',
      icon: 'Bookmark',
      color: TEMPLATE_COLORS[0],
    });
    setShowModal(true);
  };

  const openEditModal = (template: RecordTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      amount: template.amount.toString(),
      categoryId: template.categoryId,
      note: template.note,
      accountId: template.accountId,
      icon: template.icon,
      color: template.color,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount || !form.categoryId || !form.accountId) return;

    const data = {
      name: form.name,
      type: form.type,
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      note: form.note,
      accountId: form.accountId,
      icon: form.icon,
      color: form.color,
    };

    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data);
    } else {
      addTemplate(data);
    }
    setShowModal(false);
  };

  const handleUseTemplate = (template: RecordTemplate) => {
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: template.type,
      amount: template.amount,
      categoryId: template.categoryId,
      note: template.note,
      accountId: template.accountId,
      createdAt: new Date().toISOString(),
    };
    addTransaction(transaction);
    onUseTemplate?.(transaction);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 page-enter">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-6 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">记账模板</h1>
        </div>
        <p className="text-sm text-white/80">保存常用记录，一键快速记账</p>
      </div>

      <div className="px-4 -mt-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{templates.length}</p>
            <p className="text-xs text-gray-500">已保存模板</p>
          </div>
          <Bookmark size={40} className="text-pink-500" />
        </div>
      </div>

      <div className="px-4 mt-4">
        {templates.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark size={36} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">还没有保存记账模板</p>
            <button
              onClick={openAddModal}
              className="px-6 py-2.5 bg-pink-500 text-white rounded-card font-medium hover:bg-pink-600 transition-colors"
            >
              创建模板
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => {
              const category = categories.find((c) => c.id === template.categoryId);
              const account = accounts.find((a) => a.id === template.accountId);
              const TemplateIcon = getIcon(template.icon);

              return (
                <div
                  key={template.id}
                  className="card p-4"
                >
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-card flex items-center justify-center"
                        style={{ backgroundColor: `${template.color}20`, color: template.color }}
                      >
                        <TemplateIcon size={24} />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(template); }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="font-medium text-gray-800 dark:text-white truncate">{template.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-lg font-bold ${template.type === 'income' ? 'text-primary-500' : 'text-red-500'}`}>
                        {template.type === 'income' ? '+' : '-'}¥{template.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 truncate max-w-[80px]">{category?.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{account?.name}</p>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-card max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">{editingTemplate ? '编辑模板' : '新建模板'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如: 早餐、地铁费"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-card text-lg font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">图标</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TEMPLATE_ICONS.map((iconName) => {
                      const IconComponent = getIcon(iconName);
                      return (
                        <button
                          key={iconName}
                          onClick={() => setForm({ ...form, icon: iconName })}
                          className={`p-2 rounded-lg transition-all ${
                            form.icon === iconName
                              ? 'ring-2 ring-pink-500 bg-pink-50 dark:bg-pink-900/20'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <IconComponent size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">颜色</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TEMPLATE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setForm({ ...form, color })}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          form.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setForm({ ...form, type: t, categoryId: categories.find(c => c.type === t)?.id || '' });
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.type === t
                        ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-primary-500 text-white'
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
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-card text-xl font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
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
                            ? 'bg-pink-50 dark:bg-pink-900/30 ring-2 ring-pink-500'
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
                            ? 'bg-pink-500 text-white'
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">备注</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="添加备注..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.amount || !form.categoryId || !form.accountId}
                className={`w-full py-3 rounded-card font-bold text-white transition-all ${
                  form.name && form.amount && form.categoryId && form.accountId
                    ? 'bg-pink-500 hover:bg-pink-600'
                    : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                }`}
              >
                {editingTemplate ? '保存修改' : '创建模板'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={openAddModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-pink-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-pink-600 transition-all z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Templates;
