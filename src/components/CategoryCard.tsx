import { getIcon } from '../utils/iconMap';
import { Category } from '../types';
import { memo } from 'react';

interface CategoryCardProps {
  category: Category;
  isSelected?: boolean;
  /** 高频"常用"角标（角标文本由调用方经 aria-title 提供，此处仅控制展示） */
  isFrequent?: boolean;
  frequentLabel?: string;
  onClick?: () => void;
}

const CategoryCardComponent = ({ category, isSelected = false, isFrequent = false, frequentLabel, onClick }: CategoryCardProps) => {
  const IconComponent = getIcon(category.icon);

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center p-2.5 rounded-button transition-all duration-200 ${isSelected ? 'scale-[1.04]' : 'active:scale-95'}`}
      style={{
        background: isSelected ? 'var(--primary-soft)' : 'var(--paper)',
        border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
      }}
    >
      {isFrequent && (
        <span
          className="absolute -top-1 -right-1 text-[9px] leading-none font-semibold px-1 py-0.5 rounded-full pointer-events-none"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}
        >
          {frequentLabel}
        </span>
      )}
      <div
        className={`p-2 rounded-full transition-all duration-200 ${isSelected ? 'scale-110' : ''}`}
        style={{ backgroundColor: `${category.color}30` }}
      >
        <IconComponent size={22} style={{ color: category.color }} />
      </div>
      <span
        className="text-xs mt-1.5 font-medium truncate max-w-full"
        style={{ color: isSelected ? 'var(--primary-ink)' : 'var(--ink-2)' }}
      >
        {category.name}
      </span>
    </button>
  );
};

export const CategoryCard = memo(CategoryCardComponent);
