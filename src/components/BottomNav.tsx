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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-100 dark:border-gray-700 safe-bottom z-50">
      <div className="flex justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-5 rounded-button transition-all duration-300 ${
                isActive
                  ? 'text-primary-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon
                size={22}
                className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}
              />
              <span className={`text-label ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
              <span
                className={`h-1 w-1 rounded-chip transition-all duration-300 ${
                  isActive ? 'bg-primary-500 opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
