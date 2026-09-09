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
    <div className="page-root pb-nav page-enter">
      <div className="safe-top px-4 pt-2 pb-1">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="icon-btn" aria-label="返回">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">记账模板</h1>
            <p className="page-subtitle">保存常用记录，一键快速记账</p>
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold amount-num" style={{ color: 'var(--ink)' }}>{templates.length}</p>
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>已保存模板</p>
          </div>
          <Bookmark size={40} style={{ color: 'var(--primary)' }} />
        </div>
      </div>

      <div className="px-4 mt-4">
        {templates.length === 0 ? (
          <div className="card text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--paper-deep)' }}
            >
              <Bookmark size={36} style={{ color: 'var(--ink-2)' }} />
            </div>
            <p className="mb-4" style={{ color: 'var(--ink-2)' }}>还没有保存记账模板</p>
            <button onClick={openAddModal} className="btn-primary">
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
                <div key={template.id} className="card">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-card flex items-center justify-center"
                        style={{ backgroundColor: `${template.color}30`, color: template.color }}
                      >
                        <TemplateIcon size={24} />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(template); }}
                          className="p-1.5 rounded-full"
                          style={{ color: 'var(--ink-2)' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                          className="p-1.5 rounded-full"
                          style={{ color: 'var(--expense)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>{template.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className="text-lg font-bold amount-num"
                        style={{ color: template.type === 'income' ? 'var(--primary)' : 'var(--expense)' }}
                      >
                        {template.type === 'income' ? '+' : '-'}¥{template.amount.toFixed(2)}
                      </span>
                      <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--ink-2)' }}>{category?.name}</span>
                    </div>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-2)' }}>{account?.name}</p>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="sheet w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{editingTemplate ? '编辑模板' : '新建模板'}</h3>
              <button onClick={() => setShowModal(false)} className="icon-btn" aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>模板名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如: 早餐、地铁费"
                  className="w-full px-4 py-3 rounded-card text-lg font-bold outline-none"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>图标</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TEMPLATE_ICONS.map((iconName) => {
                      const IconComponent = getIcon(iconName);
                      return (
                        <button
                          key={iconName}
                          onClick={() => setForm({ ...form, icon: iconName })}
                          className="p-2 rounded-card transition-all"
                          style={form.icon === iconName
                            ? { background: 'var(--primary-soft)', border: '1.5px solid var(--primary)' }
                            : { background: 'var(--paper-deep)', border: '1.5px solid transparent' }}
                        >
                          <IconComponent size={18} style={{ color: 'var(--ink-2)' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>颜色</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TEMPLATE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setForm({ ...form, color })}
                        className="w-8 h-8 rounded-button transition-all"
                        style={form.color === color
                          ? { backgroundColor: color, boxShadow: '0 0 0 2px var(--card), 0 0 0 3.5px var(--primary)' }
                          : { backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setForm({ ...form, type: t, categoryId: categories.find(c => c.type === t)?.id || '' });
                    }}
                    className="flex-1 py-2.5 rounded-button text-sm font-medium transition-all"
                    style={form.type === t
                      ? { background: t === 'expense' ? 'var(--expense)' : 'var(--primary)', color: '#fff' }
                      : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                  >
                    {t === 'expense' ? '支出' : '收入'}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>金额</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-card text-xl font-bold outline-none"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>分类</label>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.map((cat) => {
                    const IconComponent = getIcon(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setForm({ ...form, categoryId: cat.id })}
                        className="flex flex-col items-center gap-1 p-2 rounded-card transition-all"
                        style={form.categoryId === cat.id
                          ? { background: 'var(--primary-soft)', border: '1.5px solid var(--primary)' }
                          : { background: 'var(--paper-deep)', border: '1.5px solid transparent' }}
                      >
                        <div className="p-1.5 rounded-full" style={{ backgroundColor: `${cat.color}30`, color: cat.color }}>
                          <IconComponent size={16} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>账户</label>
                <div className="flex gap-2 flex-wrap">
                  {accounts.map((acc) => {
                    const IconComponent = getIcon(acc.icon);
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setForm({ ...form, accountId: acc.id })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-button transition-all"
                        style={form.accountId === acc.id
                          ? { background: 'var(--primary)', color: '#fff' }
                          : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                      >
                        <IconComponent size={14} />
                        <span className="text-xs font-medium">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>备注</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="添加备注..."
                  className="w-full px-4 py-2.5 rounded-button text-sm outline-none"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                />
              </div>
            </div>

            <div className="p-4" style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.amount || !form.categoryId || !form.accountId}
                className="btn-primary w-full"
                style={(!form.name || !form.amount || !form.categoryId || !form.accountId) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                {editingTemplate ? '保存修改' : '创建模板'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={openAddModal}
        className="fixed right-5 flex items-center justify-center transition-all z-40"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          width: '56px',
          height: '56px',
          background: 'var(--primary)',
          color: '#fff',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-fab)',
        }}
        aria-label="新建模板"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Templates;
