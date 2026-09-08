import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { TransactionType, Category } from '../types';
import { Plus, X, Palette } from 'lucide-react';
import { getIcon } from '../utils/iconMap';

interface CategoriesProps {
  onViewCategoryDetail: (categoryId: string) => void;
}

export const Categories = ({ onViewCategoryDetail }: CategoriesProps) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense' as TransactionType,
    icon: 'Circle',
    color: '#EF4444',
  });

  const categories = useStore((state) => state.categories);
  const transactions = useStore((state) => state.transactions);
  const addCategory = useStore((state) => state.addCategory);
  const deleteCategory = useStore((state) => state.deleteCategory);
  const restoreCategory = useStore((state) => state.restoreCategory);

  // 待确认删除的分类 / 刚删除可撤销的分类
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [recentDeleted, setRecentDeleted] = useState<{ category: Category; index: number } | null>(null);

  // 撤销窗口 5 秒后自动消失
  useEffect(() => {
    if (!recentDeleted) return;
    const timer = setTimeout(() => setRecentDeleted(null), 5000);
    return () => clearTimeout(timer);
  }, [recentDeleted]);

  const recordCountOf = (categoryId: string) =>
    transactions.filter((t) => t.categoryId === categoryId).length;

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const index = categories.findIndex((c) => c.id === categoryToDelete.id);
    deleteCategory(categoryToDelete.id);
    setRecentDeleted({ category: categoryToDelete, index });
    setCategoryToDelete(null);
  };

  const handleUndoDelete = () => {
    if (!recentDeleted) return;
    restoreCategory(recentDeleted.category, recentDeleted.index);
    setRecentDeleted(null);
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const iconList = [
    'Wallet', 'Gift', 'TrendingUp', 'Plus', 'Briefcase', 'Award',
    'UtensilsCrossed', 'Car', 'ShoppingBag', 'Gamepad2', 'Heart',
    'GraduationCap', 'Home', 'MoreHorizontal', 'Coffee', 'Plane',
    'Shirt', 'Music', 'BookOpen', 'Phone', 'Laptop', 'Camera',
  ];

  const colorList = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  ];

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    addCategory(newCategory);
    setShowAddModal(false);
    setNewCategory({
      name: '',
      type: 'expense',
      icon: 'Circle',
      color: '#EF4444',
    });
  };

  return (
    <div className="page-root pb-nav">
      {/* 页头 */}
      <div className="safe-top px-4 pt-2 pb-1 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="page-title">分类管理</h1>
          <p className="page-subtitle">管理您的收支分类</p>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* 支出分类 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--expense)' }} />
              支出分类
            </h2>
            <button
              onClick={() => {
                setNewCategory((prev) => ({ ...prev, type: 'expense' }));
                setShowAddModal(true);
              }}
              className="icon-btn w-9 h-9"
              aria-label="添加支出分类"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {expenseCategories.map((category) => {
              const IconComponent = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategoryDetail(category.id)}
                  className="flex flex-col items-center p-3 rounded-button relative group min-h-[80px] transition-colors active:scale-95"
                  style={{ background: 'var(--paper)' }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category);
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ background: 'var(--expense)', color: '#fff' }}
                    aria-label="删除分类"
                  >
                    <X size={12} />
                  </button>
                  <div
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <IconComponent size={22} style={{ color: category.color }} />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight max-w-[60px] truncate" style={{ color: 'var(--ink)' }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 收入分类 */}
        <div className="card p-4 mt-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
              收入分类
            </h2>
            <button
              onClick={() => {
                setNewCategory((prev) => ({ ...prev, type: 'income' }));
                setShowAddModal(true);
              }}
              className="icon-btn w-9 h-9"
              aria-label="添加收入分类"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {incomeCategories.map((category) => {
              const IconComponent = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategoryDetail(category.id)}
                  className="flex flex-col items-center p-3 rounded-button relative group min-h-[80px] transition-colors active:scale-95"
                  style={{ background: 'var(--paper)' }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category);
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ background: 'var(--expense)', color: '#fff' }}
                    aria-label="删除分类"
                  >
                    <X size={12} />
                  </button>
                  <div
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <IconComponent size={22} style={{ color: category.color }} />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight max-w-[60px] truncate" style={{ color: 'var(--ink)' }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 添加分类底部弹层 */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
              style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>添加分类</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="icon-btn w-9 h-9"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 pb-8 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>分类名称</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="输入分类名称"
                  maxLength={10}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>选择图标</label>
                <div className="grid grid-cols-6 gap-2">
                  {iconList.map((icon) => {
                    const IconComponent = getIcon(icon);
                    const selected = newCategory.icon === icon;
                    return (
                      <button
                        key={icon}
                        onClick={() => setNewCategory((prev) => ({ ...prev, icon }))}
                        className="p-2.5 rounded-button transition-all flex items-center justify-center border-2"
                        style={
                          selected
                            ? { background: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)' }
                            : { background: 'var(--paper)', borderColor: 'transparent', color: 'var(--ink-2)' }
                        }
                      >
                        <IconComponent size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>选择颜色</label>
                <div className="flex flex-wrap gap-2">
                  {colorList.map((color) => {
                    const selected = newCategory.color === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setNewCategory((prev) => ({ ...prev, color }))}
                        className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          outline: selected ? '2px solid var(--ink-2)' : 'none',
                          outlineOffset: 2,
                          transform: selected ? 'scale(1.1)' : undefined,
                        }}
                        aria-label={`颜色 ${color}`}
                      />
                    );
                  })}
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors"
                    style={{
                      borderColor: !colorList.includes(newCategory.color) ? 'var(--primary)' : 'var(--line)',
                      backgroundColor: !colorList.includes(newCategory.color) ? newCategory.color : 'transparent',
                      color: 'var(--ink-2)',
                    }}
                    aria-label="自定义颜色"
                  >
                    <Palette size={18} />
                  </button>
                </div>

                {showColorPicker && (
                  <div className="mt-4 p-4 rounded-button" style={{ background: 'var(--paper)' }}>
                    <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>自定义颜色</p>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {['#FF0000', '#FF6B00', '#FFCC00', '#00CC00', '#0066FF', '#9933FF', '#FF0099', '#00CCCC',
                        '#FF3366', '#FF9933', '#FFFF00', '#33CC66', '#3399FF', '#CC33FF', '#FF66CC', '#66CCCC'].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setNewCategory((prev) => ({ ...prev, color }));
                            setShowColorPicker(false);
                          }}
                          className="w-8 h-8 rounded-full transition-all hover:scale-110"
                          style={{
                            backgroundColor: color,
                            outline: newCategory.color === color ? '2px solid var(--ink-2)' : 'none',
                            outlineOffset: 2,
                            transform: newCategory.color === color ? 'scale(1.1)' : undefined,
                          }}
                          aria-label={`颜色 ${color}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-16 rounded-lg cursor-pointer border-0 flex-shrink-0"
                        style={{ background: 'var(--card)' }}
                      />
                      <input
                        type="text"
                        value={newCategory.color}
                        onChange={(e) => {
                          const color = e.target.value.toUpperCase();
                          const cleanColor = color.replace(/[^#0-9A-F]/g, '');
                          if (cleanColor.startsWith('#')) {
                            if (cleanColor.length <= 7) {
                              setNewCategory((prev) => ({ ...prev, color: cleanColor }));
                            }
                          } else if (cleanColor.length <= 6) {
                            setNewCategory((prev) => ({ ...prev, color: '#' + cleanColor }));
                          }
                        }}
                        onBlur={(e) => {
                          const color = e.target.value;
                          if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                            setNewCategory((prev) => ({ ...prev, color: '#EF4444' }));
                          }
                        }}
                        className="input-field flex-1 uppercase"
                        placeholder="#RRGGBB"
                        maxLength={7}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddCategory}
                disabled={!newCategory.name.trim()}
                className="btn-primary w-full mt-2"
              >
                添加分类
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setCategoryToDelete(null)}
        >
          <div
            className="card w-full max-w-sm p-6 animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>删除分类</h3>
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-2)' }}>
              确定删除分类「{categoryToDelete.name}」吗？
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--expense)' }}>
              该分类下有 {recordCountOf(categoryToDelete.id)} 条记录，删除后这些记录将归入「未分类」。
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="btn-ghost flex-1"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="btn-danger flex-1"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 撤销提示 */}
      {recentDeleted && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 pl-5 pr-2 py-2.5 rounded-full z-[95] flex items-center gap-3 animate-slide-up"
          style={{ background: 'var(--ink)', color: 'var(--paper)', boxShadow: 'var(--shadow-card-hover)' }}
        >
          <span className="text-sm whitespace-nowrap">已删除「{recentDeleted.category.name}」</span>
          <button
            onClick={handleUndoDelete}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
          >
            撤销
          </button>
        </div>
      )}
    </div>
  );
};
