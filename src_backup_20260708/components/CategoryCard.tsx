import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
  isSelected?: boolean;
  onClick?: () => void;
}

const iconMap: Record<string, LucideIcon> = Icons as unknown as Record<string, LucideIcon>;

export const CategoryCard = ({ category, isSelected = false, onClick }: CategoryCardProps) => {
  const IconComponent = iconMap[category.icon] || Icons.Circle;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-emerald-50 scale-105'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div
        className={`p-2.5 rounded-full transition-all duration-200 ${
          isSelected ? 'scale-110' : ''
        }`}
        style={{ backgroundColor: `${category.color}20` }}
      >
        <IconComponent size={20} style={{ color: category.color }} />
      </div>
      <span className={`text-xs mt-2 font-medium ${isSelected ? 'text-emerald-600' : 'text-gray-600'}`}>
        {category.name}
      </span>
    </button>
  );
};