import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { TransactionType, Category } from '../types';
import { Plus, X, Palette } from 'lucide-react';
import { HsvColorPicker, HexColorInput } from 'react-colorful';
import { getIcon, CATEGORY_ICONS } from '../utils/iconMap';

// react-colorful v5.8 未导出 hsvToHex/hexToHsv，本地实现（s/v 均为 0-100）
const hsvToHex = ({ h, s, v }: { h: number; s: number; v: number }): string => {
  const sN = s / 100, vN = v / 100;
  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsv = (hex: string): { h: number; s: number; v: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
};

interface CategoriesProps {
  onViewCategoryDetail: (categoryId: string) => void;
  onColorPickerOpenChange?: (open: boolean) => void;
}

export const Categories = ({ onViewCategoryDetail, onColorPickerOpenChange }: CategoriesProps) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // 调色板开关时通知 App.tsx 禁用侧滑返回（拖动调色板不应误触返回）
  useEffect(() => {
    onColorPickerOpenChange?.(showColorPicker);
  }, [showColorPicker, onColorPickerOpenChange]);

  // 在调色板容器上阻止触摸事件冒泡到 document 的 useSwipeBack 监听器，
  // 防止调色时手指滑动被误判为侧滑返回（原生监听器，冒泡阶段 stopPropagation）
  useEffect(() => {
    const el = colorPickerRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, [showColorPicker]);
  const [iconGroup, setIconGroup] = useState<string>('全部');
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

  // 图标分组展示
  const iconGroups: { [key: string]: string[] } = {
    全部: CATEGORY_ICONS,
    收入: ['Wallet', 'TrendingUp', 'Briefcase', 'Gift', 'Award', 'Banknote', 'CreditCard', 'Landmark', 'PiggyBank', 'Coins', 'Receipt', 'FileText'],
    餐饮: ['UtensilsCrossed', 'Utensils', 'Coffee', 'Cake', 'Wine', 'IceCream'],
    交通: ['Car', 'Plane', 'Train', 'Bus', 'Bike', 'CarTaxiFront', 'Fuel', 'ParkingCircle'],
    购物: ['ShoppingBag', 'ShoppingCart', 'Shirt', 'Watch', 'Gem', 'Package'],
    居住: ['Home', 'Key', 'Paintbrush', 'Wrench', 'Lightbulb', 'Flame', 'Wifi'],
    生活: ['Baby', 'HeartPulse', 'Pill', 'Dumbbell', 'Scissors', 'PawPrint'],
    娱乐: ['Gamepad2', 'Film', 'Music', 'Headphones', 'Tv', 'Camera', 'Image', 'Palette', 'Brush'],
    教育: ['GraduationCap', 'BookOpen'],
    通讯: ['Phone', 'Laptop', 'MessageCircle'],
    其他: ['Heart', 'Star', 'Bell', 'Calendar', 'Globe', 'Users', 'Flag', 'Circle', 'MoreHorizontal'],
  };
  const currentIconList = iconGroups[iconGroup] || CATEGORY_ICONS;

  // 预设推荐色（常用 17 色）
  const presetColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  ];

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    addCategory(newCategory);
    setShowAddModal(false);
    setIconGroup('全部');
    setShowColorPicker(false);
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
            {expenseCategories.map((category, i) => {
              const IconComponent = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategoryDetail(category.id)}
                  className="flex flex-col items-center p-3 rounded-button relative group min-h-[80px] transition-colors active:scale-95 animate-stagger-in"
                  style={{ background: 'var(--paper)', animationDelay: `${Math.min(i * 40, 400)}ms` }}
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
            {incomeCategories.map((category, i) => {
              const IconComponent = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategoryDetail(category.id)}
                  className="flex flex-col items-center p-3 rounded-button relative group min-h-[80px] transition-colors active:scale-95 animate-stagger-in"
                  style={{ background: 'var(--paper)', animationDelay: `${Math.min(i * 40, 400)}ms` }}
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

              {/* 图标选择 - 带分组标签 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>选择图标</label>
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                  {Object.keys(iconGroups).map((group) => (
                    <button
                      key={group}
                      onClick={() => setIconGroup(group)}
                      className="px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors"
                      style={
                        iconGroup === group
                          ? { background: 'var(--primary)', color: '#fff' }
                          : { background: 'var(--paper)', color: 'var(--ink-2)' }
                      }
                    >
                      {group}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {currentIconList.map((icon) => {
                    const IconComponent = getIcon(icon);
                    const selected = newCategory.icon === icon;
                    return (
                      <button
                        key={icon}
                        onClick={() => setNewCategory((prev) => ({ ...prev, icon }))}
                        className="p-2.5 rounded-button transition-all flex items-center justify-center border-2"
                        style={
                          selected
                            ? { background: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)', transform: 'scale(1.05)' }
                            : { background: 'var(--paper)', borderColor: 'transparent', color: 'var(--ink-2)' }
                        }
                      >
                        <IconComponent size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 颜色选择 - 推荐色 + 无极调色板 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>选择颜色</label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((color) => {
                    const selected = newCategory.color === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setNewCategory((prev) => ({ ...prev, color }))}
                        className="w-10 h-10 rounded-full transition-transform active:scale-95"
                        style={{
                          backgroundColor: color,
                          outline: selected ? '2px solid var(--ink)' : 'none',
                          outlineOffset: 2,
                          transform: selected ? 'scale(1.1)' : undefined,
                        }}
                        aria-label={`颜色 ${color}`}
                      />
                    );
                  })}
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform active:scale-95 relative"
                    style={{
                      borderColor: showColorPicker ? 'var(--primary)' : 'var(--line)',
                      background: showColorPicker ? 'var(--primary-soft)' : 'transparent',
                    }}
                    aria-label="自定义颜色"
                  >
                    <Palette size={16} style={{ color: showColorPicker ? 'var(--primary)' : 'var(--ink-2)' }} />
                  </button>
                </div>

                {/* HSV 无极调色板 */}
                {showColorPicker && (
                  <div ref={colorPickerRef} className="mt-4 p-4 rounded-button animate-fade-in" style={{ background: 'var(--paper)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>无极调色板</p>
                      <div
                        className="w-8 h-8 rounded-full border-2 shadow"
                        style={{ backgroundColor: newCategory.color, borderColor: 'var(--card)' }}
                      />
                    </div>
                    {/* 主调色板（HSV 无极）：color 用 {h,s,v} 对象，onChange 转回 HEX 存储，保证实时预览 */}
                    <HsvColorPicker
                      color={/^#[0-9A-Fa-f]{6}$/.test(newCategory.color) ? hexToHsv(newCategory.color) : { h: 0, s: 80, v: 90 }}
                      onChange={(hsv) => setNewCategory((prev) => ({ ...prev, color: hsvToHex(hsv).toUpperCase() }))}
                      className="color-picker"
                    />
                    {/* HEX 输入 */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>HEX</span>
                      <HexColorInput
                        color={newCategory.color}
                        onChange={(color) => {
                          const clean = color.startsWith('#') ? color : '#' + color;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(clean)) {
                            setNewCategory((prev) => ({ ...prev, color: clean.toUpperCase() }));
                          }
                        }}
                        className="input-field flex-1 uppercase font-mono"
                        placeholder="#RRGGBB"
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
