/**
 * 通用底部操作弹窗：用于卡片点击触发详情/操作。
 * 列表式操作按钮，居中显示在屏幕底部（safe-area 适配）。
 * 必须用 createPortal 渲染到 document.body，z-[100] 才能盖过 App 级 BottomNav。
 *
 * 用于：交易卡片点击 → 编辑 / 复制 / 删除（鼠标环境无法滑动）。
 */
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Edit3, Copy, Trash2, X } from 'lucide-react';

export interface ActionBottomSheetItem {
  key: string;
  label: string;
  icon: typeof Edit3;
  /** 主题：primary 主色 / danger 危险红 / ghost 普通灰 */
  tone?: 'primary' | 'danger' | 'ghost';
  onClick: () => void;
}

interface ActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: ActionBottomSheetItem[];
}

const TONE_STYLE: Record<NonNullable<ActionBottomSheetItem['tone']>, { color: string; bg: string }> = {
  primary: { color: 'var(--primary)', bg: 'var(--primary-soft)' },
  danger: { color: 'var(--expense)', bg: 'var(--expense-soft)' },
  ghost: { color: 'var(--ink)', bg: 'var(--paper-deep)' },
};

export const ActionBottomSheet = ({ isOpen, onClose, title, subtitle, items }: ActionBottomSheetProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-card animate-slide-up safe-bottom"
        style={{
          background: 'var(--card-solid)',
          boxShadow: 'var(--shadow-card-hover)',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 把手 + 标题 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--line)' }} />
        </div>
        <div className="px-4 pt-2 pb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="font-bold text-base truncate" style={{ color: 'var(--ink)' }}>{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-2)' }}>{subtitle}</p>
            )}
          </div>
          <button onClick={onClose} className="icon-btn w-8 h-8 flex-shrink-0" aria-label={t('common.cancel')}>
            <X size={16} />
          </button>
        </div>

        {/* 操作列表 */}
        <div className="px-2 pb-2">
          {items.map((item) => {
            const tone = item.tone ?? 'ghost';
            const { color, bg } = TONE_STYLE[tone];
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-button active:opacity-80 transition-colors"
                style={{ background: bg, color }}
              >
                <Icon size={18} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};
