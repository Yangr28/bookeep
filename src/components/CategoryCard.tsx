import { getIcon } from '../utils/iconMap';
import { Category } from '../types';
import { memo } from 'react';

interface CategoryCardProps {
  category: Category;
  isSelected?: boolean;
  onClick?: () => void;
}

const CategoryCardComponent = ({ category, isSelected = false, onClick }: CategoryCardProps) => {
  const IconComponent = getIcon(category.icon);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2.5 rounded-button transition-all duration-200 ${isSelected ? 'scale-[1.04]' : 'active:scale-95'}`}
      style={{
        background: isSelected ? 'var(--primary-soft)' : 'var(--paper)',
        border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
      }}
    >
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
