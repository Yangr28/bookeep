import { Home, Grid3X3, BarChart3, Wallet } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const BottomNav = ({ currentPage, onPageChange }: BottomNavProps) => {
  const navItems = [
    { id: '/', icon: Home, label: '首页' },
    { id: '/categories', icon: Grid3X3, label: '分类' },
    { id: '/accounts', icon: Wallet, label: '资产' },
    { id: '/statistics', icon: BarChart3, label: '统计' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-2 py-2 safe-bottom z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon
                size={24}
                className={`transition-transform duration-300 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
