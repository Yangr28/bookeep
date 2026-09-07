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
      className={`flex flex-col items-center p-2.5 rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-emerald-50 dark:bg-emerald-900/30 scale-105'
          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      <div
        className={`p-2 rounded-full transition-all duration-200 ${
          isSelected ? 'scale-110' : ''
        }`}
        style={{ backgroundColor: `${category.color}20` }}
      >
        <IconComponent size={22} style={{ color: category.color }} />
      </div>
      <span className={`text-xs mt-1.5 font-medium ${isSelected ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-300'}`}>
        {category.name}
      </span>
    </button>
  );
};

export const CategoryCard = memo(CategoryCardComponent);