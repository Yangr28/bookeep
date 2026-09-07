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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-white dark:bg-gray-800 px-6 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">分类管理</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 leading-relaxed">管理您的收支分类</p>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              支出分类
            </h2>
            <button
              onClick={() => {
                setNewCategory((prev) => ({ ...prev, type: 'expense' }));
                setShowAddModal(true);
              }}
              className="p-2.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {expenseCategories.map((category) => {
              const IconComponent = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategoryDetail(category.id)}
                  className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl relative group hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 transition-all duration-200 min-h-[80px]"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category);
                    }}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X size={12} />
                  </button>
                  <div
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <IconComponent size={22} style={{ color: category.color }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[60px] truncate">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              收入分类
            </h2>
            <button
              onClick={() => {
                setNewCategory((prev) => ({ ...prev, type: 'income' }));
                setShowAddModal(true);
              }}
              className="p-2.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {incomeCategories.map((category) => {
              const IconComponent = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategoryDetail(category.id)}
                  className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl relative group hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 transition-all duration-200 min-h-[80px]"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category);
                    }}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X size={12} />
                  </button>
                  <div
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <IconComponent size={22} style={{ color: category.color }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[60px] truncate">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">添加分类</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 pb-24 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类名称</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="输入分类名称"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择图标</label>
                <div className="grid grid-cols-6 gap-2">
                  {iconList.map((icon) => {
                    const IconComponent = getIcon(icon);
                    return (
                      <button
                        key={icon}
                        onClick={() => setNewCategory((prev) => ({ ...prev, icon }))}
                        className={`p-2 rounded-xl transition-all ${
                          newCategory.icon === icon
                            ? 'bg-emerald-50 border-2 border-emerald-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <IconComponent size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择颜色</label>
                <div className="flex flex-wrap gap-2">
                  {colorList.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategory((prev) => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        newCategory.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                      !colorList.includes(newCategory.color) ? 'border-emerald-400' : 'border-gray-300 hover:border-emerald-400'
                    }`}
                    style={!colorList.includes(newCategory.color) ? { backgroundColor: newCategory.color } : {}}
                  >
                    <Palette size={18} className="text-gray-400" />
                  </button>
                </div>

                {showColorPicker && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-3">自定义颜色</p>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {['#FF0000', '#FF6B00', '#FFCC00', '#00CC00', '#0066FF', '#9933FF', '#FF0099', '#00CCCC',
                        '#FF3366', '#FF9933', '#FFFF00', '#33CC66', '#3399FF', '#CC33FF', '#FF66CC', '#66CCCC'].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setNewCategory((prev) => ({ ...prev, color }));
                            setShowColorPicker(false);
                          }}
                          className={`w-8 h-8 rounded-full transition-all ${
                            newCategory.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-16 rounded-lg cursor-pointer border-0"
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
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all uppercase"
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
                className="w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
              >
                添加分类
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setCategoryToDelete(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">删除分类</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-3">
              确定删除分类「{categoryToDelete.name}」吗？
            </p>
            <p className="text-sm text-red-500 dark:text-red-400 mt-2">
              该分类下有 {recordCountOf(categoryToDelete.id)} 条记录，删除后这些记录将归入「未分类」。
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {recentDeleted && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 text-white pl-5 pr-2 py-2.5 rounded-full z-[90] flex items-center gap-3 shadow-2xl">
          <span className="text-sm whitespace-nowrap">已删除「{recentDeleted.category.name}」</span>
          <button
            onClick={handleUndoDelete}
            className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
          >
            撤销
          </button>
        </div>
      )}
    </div>
  );
};